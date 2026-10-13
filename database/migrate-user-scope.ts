/**
 * Scoping `budgets` + `transactions` per user — ADITIF, tidak menghapus data.
 *
 * Tahap awal: seluruh data yang belum punya pemilik diklaim ke usr_1.
 *
 * Runnable berulang dan bisa dilanjutkan setelah gagal di tengah jalan:
 * tiap langkah dicek dulu ke information_schema, baru dieksekusi.
 *
 * SKIP kalau DB dibuat dari schema.sql versi terbaru (kolom sudah NOT NULL
 * plus FK-nya sudah ada).
 *
 * Jalankan: npm run db:user-scope
 */
import mysql from 'mysql2/promise';
import { dbConfig } from './config';

type Connection = mysql.Connection;

const DEFAULT_USER_ID = 'usr_1';
const TABLES = ['budgets', 'transactions'] as const;

const hasColumn = async (c: Connection, table: string, column: string): Promise<boolean> => {
  const [rows] = await c.query<mysql.RowDataPacket[]>(
    'SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
    [table, column]
  );
  return rows[0].n > 0;
};

const hasIndex = async (c: Connection, table: string, index: string): Promise<boolean> => {
  const [rows] = await c.query<mysql.RowDataPacket[]>(
    'SELECT COUNT(*) AS n FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?',
    [table, index]
  );
  return rows[0].n > 0;
};

const hasForeignKey = async (c: Connection, table: string, fk: string): Promise<boolean> => {
  const [rows] = await c.query<mysql.RowDataPacket[]>(
    'SELECT COUNT(*) AS n FROM information_schema.referential_constraints WHERE constraint_schema = DATABASE() AND table_name = ? AND constraint_name = ?',
    [table, fk]
  );
  return rows[0].n > 0;
};

async function scopeTransactions(c: Connection) {
  if (!(await hasColumn(c, 'transactions', 'user_id'))) {
    await c.query('ALTER TABLE `transactions` ADD COLUMN `user_id` VARCHAR(50) NULL AFTER `id`');
    console.log('   + kolom transactions.user_id');
  }

  // Klaim lebih dulu sebagai NULL supaya FK aman dipasang setelahnya.
  const [claimed] = await c.query<mysql.ResultSetHeader>(
    'UPDATE `transactions` SET `user_id` = ? WHERE `user_id` IS NULL',
    [DEFAULT_USER_ID]
  );
  if (claimed.affectedRows > 0) {
    console.log(`   + ${claimed.affectedRows} transaksi diklaim ke ${DEFAULT_USER_ID}`);
  }

  await c.query('ALTER TABLE `transactions` MODIFY COLUMN `user_id` VARCHAR(50) NOT NULL');

  for (const idx of ['idx_transactions_user', 'idx_transactions_user_date']) {
    if (!(await hasIndex(c, 'transactions', idx))) {
      const cols = idx.endsWith('user_date') ? '(`user_id`, `transaction_date`)' : '(`user_id`)';
      await c.query(`ALTER TABLE \`transactions\` ADD INDEX \`${idx}\` ${cols}`);
      console.log(`   + index ${idx}`);
    }
  }

  if (!(await hasForeignKey(c, 'transactions', 'fk_transactions_user'))) {
    await c.query(
      `ALTER TABLE \`transactions\` ADD CONSTRAINT \`fk_transactions_user\`
       FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`
    );
    console.log('   + FK fk_transactions_user');
  }
}

async function scopeBudgets(c: Connection) {
  if (!(await hasColumn(c, 'budgets', 'user_id'))) {
    await c.query('ALTER TABLE `budgets` ADD COLUMN `user_id` VARCHAR(50) NULL AFTER `id`');
    console.log('   + kolom budgets.user_id');
  }

  const [claimed] = await c.query<mysql.ResultSetHeader>(
    'UPDATE `budgets` SET `user_id` = ? WHERE `user_id` IS NULL',
    [DEFAULT_USER_ID]
  );
  if (claimed.affectedRows > 0) {
    console.log(`   + ${claimed.affectedRows} budget diklaim ke ${DEFAULT_USER_ID}`);
  }

  await c.query('ALTER TABLE `budgets` MODIFY COLUMN `user_id` VARCHAR(50) NOT NULL');

  // Uniqueness pindah dari per-kategori ke per-(user, kategori). Index lama harus
  // dilepas bersama FK-nya dulu — MySQL menolak drop index yang dipakai FK.
  if (await hasIndex(c, 'budgets', 'uq_budgets_category')) {
    if (await hasForeignKey(c, 'budgets', 'fk_budgets_category')) {
      await c.query('ALTER TABLE `budgets` DROP FOREIGN KEY `fk_budgets_category`');
    }
    await c.query('ALTER TABLE `budgets` DROP INDEX `uq_budgets_category`');
    console.log('   - uq_budgets_category dilepas');
  }

  if (!(await hasIndex(c, 'budgets', 'uq_budgets_user_category'))) {
    await c.query(
      'ALTER TABLE `budgets` ADD UNIQUE KEY `uq_budgets_user_category` (`user_id`, `category_id`)'
    );
    console.log('   + uq_budgets_user_category');
  }

  if (!(await hasIndex(c, 'budgets', 'idx_budgets_user'))) {
    await c.query('ALTER TABLE `budgets` ADD INDEX `idx_budgets_user` (`user_id`)');
    console.log('   + index idx_budgets_user');
  }

  // MySQL auto-buat index untuk kolom FK, jadi category_id tetap ter-cover.
  if (!(await hasForeignKey(c, 'budgets', 'fk_budgets_category'))) {
    await c.query(
      `ALTER TABLE \`budgets\` ADD CONSTRAINT \`fk_budgets_category\`
       FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`
    );
    console.log('   + FK fk_budgets_category');
  }

  if (!(await hasForeignKey(c, 'budgets', 'fk_budgets_user'))) {
    await c.query(
      `ALTER TABLE \`budgets\` ADD CONSTRAINT \`fk_budgets_user\`
       FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`
    );
    console.log('   + FK fk_budgets_user');
  }
}

async function runUserScopeMigration() {
  let connection: Connection;
  try {
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
    });
  } catch (error) {
    console.error('❌ Gagal terhubung ke MySQL:', (error as Error).message);
    process.exit(1);
  }

  try {
    await scopeBudgets(connection);
    await scopeTransactions(connection);
    console.log('✅ budgets & transactions scoped per user.');
  } catch (error) {
    console.error('❌ Migrasi gagal — belum ada yang hilang, jalankan ulang untuk melanjutkan:', error);
    await connection.end();
    process.exit(1);
  }

  for (const table of TABLES) {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT user_id, COUNT(*) AS total FROM \`${table}\` GROUP BY user_id`
    );
    const summary = rows.length ? rows.map((r) => `${r.user_id}=${r.total}`).join(', ') : 'kosong';
    console.log(`   ${table}: ${summary}`);
  }

  await connection.end();
}

runUserScopeMigration();