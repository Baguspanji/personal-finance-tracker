/**
 * Jalankan database/mcp-keys.sql — aditif, aman diulang, tidak menghapus data.
 * Berbeda dari `npm run db:migrate` yang DROP semua tabel.
 */
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { dbConfig } from './config';

async function runMcpKeysSchema() {
  const sqlPath = path.join(process.cwd(), 'database', 'mcp-keys.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ File tidak ditemukan:', sqlPath);
    process.exit(1);
  }

  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
    });
    await connection.query(fs.readFileSync(sqlPath, 'utf-8'));
    console.log('✅ Tabel mcp_keys siap (aman diulang).');
    await connection.end();
  } catch (error) {
    console.error('❌ Gagal menyiapkan tabel mcp_keys:', error);
    process.exit(1);
  }
}

runMcpKeysSchema();