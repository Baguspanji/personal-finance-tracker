import mysql from 'mysql2/promise';
import { dbConfig } from '../database/config.js';
import { db as jsonDb, DBUser, DBCategory, DBPaymentMethod, DBBudget, DBTransaction } from './db.js';

let pool: mysql.Pool | null = null;
let isMySqlAvailable = false;

export async function initMySQL(): Promise<boolean> {
  try {
    pool = mysql.createPool(dbConfig);
    const conn = await pool.getConnection();
    conn.release();
    isMySqlAvailable = true;
    console.log(`✅ Connected to MySQL database "${dbConfig.database}" at ${dbConfig.host}:${dbConfig.port}`);
    return true;
  } catch (err) {
    isMySqlAvailable = false;
    console.warn('⚠️ MySQL database unavailable, using fallback JSON DB:', (err as Error).message);
    return false;
  }
}

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

// Helper to execute MySQL query or fallback to JSON DB
export async function getUserByEmail(email: string): Promise<DBUser | null> {
  try {
    const p = getPool();
    const [rows] = await p.execute<mysql.RowDataPacket[]>(
      'SELECT id, name, email, password_hash, created_at, updated_at FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        password_hash: r.password_hash,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
      };
    }
    return null;
  } catch (err) {
    console.warn('MySQL getUserByEmail error, falling back to JSON DB:', (err as Error).message);
    return jsonDb.getUserByEmail(email) || null;
  }
}

export async function getUserById(id: string): Promise<DBUser | null> {
  try {
    const p = getPool();
    const [rows] = await p.execute<mysql.RowDataPacket[]>(
      'SELECT id, name, email, password_hash, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    if (rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        password_hash: r.password_hash,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
      };
    }
    return null;
  } catch (err) {
    console.warn('MySQL getUserById error, falling back to JSON DB:', (err as Error).message);
    return jsonDb.getUserById(id) || null;
  }
}

export async function getPaymentMethods(): Promise<DBPaymentMethod[]> {
  try {
    const p = getPool();
    const [rows] = await p.execute<mysql.RowDataPacket[]>(
      'SELECT id, name, created_at, updated_at FROM payment_methods ORDER BY created_at ASC'
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    }));
  } catch (err) {
    console.warn('MySQL getPaymentMethods error, falling back to JSON DB:', (err as Error).message);
    return jsonDb.getPaymentMethods();
  }
}

export async function getPaymentMethodById(id: string): Promise<DBPaymentMethod | null> {
  try {
    const p = getPool();
    const [rows] = await p.execute<mysql.RowDataPacket[]>(
      'SELECT id, name, created_at, updated_at FROM payment_methods WHERE id = ? LIMIT 1',
      [id]
    );
    if (rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
      };
    }
    return null;
  } catch (err) {
    return jsonDb.getPaymentMethodById(id) || null;
  }
}

export async function createPaymentMethod(name: string): Promise<DBPaymentMethod> {
  const id = `pm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    const p = getPool();
    await p.execute(
      'INSERT INTO payment_methods (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [id, name.trim(), now, now]
    );
    return {
      id,
      name: name.trim(),
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
    };
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('Duplicate entry') || (err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new Error('Metode pembayaran dengan nama tersebut sudah ada.');
    }
    console.warn('MySQL createPaymentMethod error, falling back to JSON DB:', msg);
    return jsonDb.createPaymentMethod(name);
  }
}

export async function updatePaymentMethod(id: string, name: string): Promise<DBPaymentMethod | null> {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    const p = getPool();
    const [result] = await p.execute<mysql.ResultSetHeader>(
      'UPDATE payment_methods SET name = ?, updated_at = ? WHERE id = ?',
      [name.trim(), now, id]
    );
    if (result.affectedRows === 0) return null;
    return getPaymentMethodById(id);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('Duplicate entry') || (err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new Error('Metode pembayaran dengan nama tersebut sudah ada.');
    }
    console.warn('MySQL updatePaymentMethod error, falling back to JSON DB:', msg);
    return jsonDb.updatePaymentMethod(id, name);
  }
}

export async function deletePaymentMethod(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const p = getPool();
    const [txRows] = await p.execute<mysql.RowDataPacket[]>(
      'SELECT COUNT(*) as cnt FROM transactions WHERE payment_method_id = ?',
      [id]
    );
    if (txRows[0].cnt > 0) {
      return {
        success: false,
        error: 'Metode pembayaran tidak dapat dihapus karena masih digunakan dalam transaksi.',
      };
    }
    const [result] = await p.execute<mysql.ResultSetHeader>(
      'DELETE FROM payment_methods WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      return { success: false, error: 'Metode pembayaran tidak ditemukan.' };
    }
    return { success: true };
  } catch (err) {
    console.warn('MySQL deletePaymentMethod error, falling back to JSON DB:', (err as Error).message);
    return jsonDb.deletePaymentMethod(id);
  }
}

export interface BudgetWithCategory extends DBBudget {
  category_name: string;
}

export async function getBudgets(): Promise<BudgetWithCategory[]> {
  try {
    const p = getPool();
    const [rows] = await p.execute<mysql.RowDataPacket[]>(`
      SELECT b.id, b.category_id, CAST(b.amount AS DOUBLE) as amount, b.created_at, b.updated_at,
             c.name as category_name
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      ORDER BY c.name ASC
    `);
    return rows.map((r) => ({
      id: r.id,
      category_id: r.category_id,
      amount: Number(r.amount),
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
      category_name: r.category_name,
    }));
  } catch (err) {
    console.warn('MySQL getBudgets error, falling back to JSON DB:', (err as Error).message);
    const cats = new Map(jsonDb.getCategories().map((c) => [c.id, c.name]));
    return jsonDb
      .getBudgets()
      .filter((b) => cats.has(b.category_id))
      .map((b) => ({ ...b, category_name: cats.get(b.category_id) || 'Kategori Lain' }));
  }
}

export async function setBudget(categoryId: string, amount: number): Promise<BudgetWithCategory> {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    const p = getPool();
    const category = await getCategoryById(categoryId);
    if (!category) throw new Error('Kategori tidak ditemukan.');
    if (category.type !== 'expense') throw new Error('Budget hanya dapat diatur untuk kategori pengeluaran.');

    const id = `bud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await p.execute(
      `INSERT INTO budgets (id, category_id, amount, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = VALUES(updated_at)`,
      [id, categoryId, amount, now, now]
    );
    const budgets = await getBudgets();
    const saved = budgets.find((b) => b.category_id === categoryId);
    if (!saved) throw new Error('Budget gagal disimpan.');
    return saved;
  } catch (err) {
    if ((err as Error).message.startsWith('Budget') || (err as Error).message.startsWith('Kategori')) {
      throw err;
    }
    console.warn('MySQL setBudget error, falling back to JSON DB:', (err as Error).message);
    const category = jsonDb.getCategoryById(categoryId);
    if (!category) throw new Error('Kategori tidak ditemukan.');
    if (category.type !== 'expense') throw new Error('Budget hanya dapat diatur untuk kategori pengeluaran.');
    const saved = jsonDb.setBudget(categoryId, amount);
    return { ...saved, category_name: category.name };
  }
}

export async function deleteBudget(categoryId: string): Promise<boolean> {
  try {
    const p = getPool();
    const [result] = await p.execute<mysql.ResultSetHeader>(
      'DELETE FROM budgets WHERE category_id = ?',
      [categoryId]
    );
    return result.affectedRows > 0;
  } catch (err) {
    console.warn('MySQL deleteBudget error, falling back to JSON DB:', (err as Error).message);
    return jsonDb.deleteBudget(categoryId);
  }
}

export async function getCategories(): Promise<DBCategory[]> {
  try {
    const p = getPool();
    const [rows] = await p.execute<mysql.RowDataPacket[]>(
      'SELECT id, name, type, created_at, updated_at FROM categories ORDER BY name ASC'
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    }));
  } catch (err) {
    console.warn('MySQL getCategories error, falling back to JSON DB:', (err as Error).message);
    return jsonDb.getCategories();
  }
}

export async function getCategoryById(id: string): Promise<DBCategory | null> {
  try {
    const p = getPool();
    const [rows] = await p.execute<mysql.RowDataPacket[]>(
      'SELECT id, name, type, created_at, updated_at FROM categories WHERE id = ? LIMIT 1',
      [id]
    );
    if (rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        type: r.type,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
      };
    }
    return null;
  } catch (err) {
    return jsonDb.getCategoryById(id) || null;
  }
}

export async function createCategory(name: string, type: 'income' | 'expense'): Promise<DBCategory> {
  const id = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    const p = getPool();
    await p.execute(
      'INSERT INTO categories (id, name, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, name.trim(), type, now, now]
    );
    return {
      id,
      name: name.trim(),
      type,
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
    };
  } catch (err) {
    console.warn('MySQL createCategory error, falling back to JSON DB:', (err as Error).message);
    return jsonDb.createCategory(name, type);
  }
}

export async function updateCategory(id: string, name: string, type: 'income' | 'expense'): Promise<DBCategory | null> {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    const p = getPool();
    const [result] = await p.execute<mysql.ResultSetHeader>(
      'UPDATE categories SET name = ?, type = ?, updated_at = ? WHERE id = ?',
      [name.trim(), type, now, id]
    );
    if (result.affectedRows === 0) return null;
    return getCategoryById(id);
  } catch (err) {
    console.warn('MySQL updateCategory error, falling back to JSON DB:', (err as Error).message);
    return jsonDb.updateCategory(id, name, type);
  }
}

export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const p = getPool();
    // Check if used in transactions
    const [txRows] = await p.execute<mysql.RowDataPacket[]>(
      'SELECT COUNT(*) as cnt FROM transactions WHERE category_id = ?',
      [id]
    );
    if (txRows[0].cnt > 0) {
      return {
        success: false,
        error: 'Kategori tidak dapat dihapus karena masih digunakan dalam transaksi.',
      };
    }

    const [result] = await p.execute<mysql.ResultSetHeader>(
      'DELETE FROM categories WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      return { success: false, error: 'Kategori tidak ditemukan.' };
    }
    return { success: true };
  } catch (err) {
    console.warn('MySQL deleteCategory error, falling back to JSON DB:', (err as Error).message);
    return jsonDb.deleteCategory(id);
  }
}

export interface TransactionWithDetails extends DBTransaction {
  category_name: string;
  payment_method_name: string;
}

export async function getTransactions(
  startDate?: string,
  endDate?: string
): Promise<TransactionWithDetails[]> {
  try {
    const p = getPool();
    // Date-only column, so YYYY-MM-DD string bounds compare directly.
    const conditions: string[] = [];
    const params: string[] = [];
    if (startDate) {
      conditions.push('t.transaction_date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('t.transaction_date <= ?');
      params.push(endDate);
    }
    const [rows] = await p.execute<mysql.RowDataPacket[]>(`
      SELECT
        t.id,
        t.category_id,
        t.payment_method_id,
        t.transaction_type,
        CAST(t.amount AS DOUBLE) as amount,
        DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as transaction_date,
        t.is_opening,
        t.notes,
        t.created_at,
        t.updated_at,
        COALESCE(c.name, 'Kategori Lain') as category_name,
        COALESCE(pm.name, 'Tunai') as payment_method_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
      ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `, params);

    return rows.map((r) => ({
      id: r.id,
      category_id: r.category_id,
      payment_method_id: r.payment_method_id,
      transaction_type: r.transaction_type,
      amount: Number(r.amount),
      transaction_date: r.transaction_date,
      is_opening: Boolean(r.is_opening),
      notes: r.notes || '',
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
      category_name: r.category_name,
      payment_method_name: r.payment_method_name,
    }));
  } catch (err) {
    console.warn('MySQL getTransactions error, falling back to JSON DB:', (err as Error).message);
    // ponytail: JSON fallback filters in memory — fine for the seed-size dataset, move to SQL when it isn't.
    const raw = jsonDb.getTransactions().filter(
      (t) => (!startDate || t.transaction_date >= startDate) && (!endDate || t.transaction_date <= endDate)
    );
    const categoriesMap = new Map(jsonDb.getCategories().map((c) => [c.id, c.name]));
    const pmMap = new Map(jsonDb.getPaymentMethods().map((pm) => [pm.id, pm.name]));
    return raw.map((t) => ({
      ...t,
      category_name: categoriesMap.get(t.category_id) || 'Kategori Lain',
      payment_method_name: pmMap.get(t.payment_method_id) || 'Tunai',
    }));
  }
}

export async function getTransactionById(id: string): Promise<TransactionWithDetails | null> {
  try {
    const p = getPool();
    const [rows] = await p.execute<mysql.RowDataPacket[]>(`
      SELECT
        t.id,
        t.category_id,
        t.payment_method_id,
        t.transaction_type,
        CAST(t.amount AS DOUBLE) as amount,
        DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as transaction_date,
        t.is_opening,
        t.notes,
        t.created_at,
        t.updated_at,
        COALESCE(c.name, 'Kategori Lain') as category_name,
        COALESCE(pm.name, 'Tunai') as payment_method_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
      WHERE t.id = ?
      LIMIT 1
    `, [id]);

    if (rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        category_id: r.category_id,
        payment_method_id: r.payment_method_id,
        transaction_type: r.transaction_type,
        amount: Number(r.amount),
        transaction_date: r.transaction_date,
        is_opening: Boolean(r.is_opening),
        notes: r.notes || '',
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
        category_name: r.category_name,
        payment_method_name: r.payment_method_name,
      };
    }
    return null;
  } catch (err) {
    console.warn('MySQL getTransactionById error, falling back to JSON DB:', (err as Error).message);
    const tx = jsonDb.getTransactionById(id);
    if (!tx) return null;
    const cat = jsonDb.getCategoryById(tx.category_id);
    const pm = jsonDb.getPaymentMethodById(tx.payment_method_id);
    return {
      ...tx,
      category_name: cat ? cat.name : 'Kategori Lain',
      payment_method_name: pm ? pm.name : 'Tunai',
    };
  }
}

export async function createTransaction(data: {
  category_id: string;
  payment_method_id: string;
  transaction_type: 'income' | 'expense';
  amount: number;
  transaction_date: string;
  notes?: string;
  is_opening?: boolean;
}): Promise<TransactionWithDetails> {
  const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    const p = getPool();
    await p.execute(`
      INSERT INTO transactions (id, category_id, payment_method_id, transaction_type, amount, transaction_date, is_opening, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.category_id,
      data.payment_method_id,
      data.transaction_type,
      data.amount,
      data.transaction_date,
      data.is_opening ? 1 : 0,
      data.notes || '',
      now,
      now,
    ]);

    const created = await getTransactionById(id);
    if (created) return created;
    throw new Error('Created transaction could not be retrieved.');
  } catch (err) {
    console.warn('MySQL createTransaction error, falling back to JSON DB:', (err as Error).message);
    const newTx = jsonDb.createTransaction(data);
    const cat = jsonDb.getCategoryById(newTx.category_id);
    const pm = jsonDb.getPaymentMethodById(newTx.payment_method_id);
    return {
      ...newTx,
      category_name: cat ? cat.name : '',
      payment_method_name: pm ? pm.name : '',
    };
  }
}

export async function updateTransaction(
  id: string,
  data: Partial<{
    category_id: string;
    payment_method_id: string;
    transaction_type: 'income' | 'expense';
    amount: number;
    transaction_date: string;
    notes?: string;
    is_opening?: boolean;
  }>
): Promise<TransactionWithDetails | null> {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    const p = getPool();
    const existing = await getTransactionById(id);
    if (!existing) return null;

    const updatedCategoryId = data.category_id !== undefined ? data.category_id : existing.category_id;
    const updatedPaymentMethodId = data.payment_method_id !== undefined ? data.payment_method_id : existing.payment_method_id;
    const updatedType = data.transaction_type !== undefined ? data.transaction_type : existing.transaction_type;
    const updatedAmount = data.amount !== undefined ? data.amount : existing.amount;
    const updatedDate = data.transaction_date !== undefined ? data.transaction_date : existing.transaction_date;
    const updatedNotes = data.notes !== undefined ? data.notes : existing.notes;
    const updatedIsOpening = data.is_opening !== undefined ? (data.is_opening ? 1 : 0) : (existing.is_opening ? 1 : 0);

    await p.execute(`
      UPDATE transactions
      SET category_id = ?, payment_method_id = ?, transaction_type = ?, amount = ?, transaction_date = ?, is_opening = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `, [
      updatedCategoryId,
      updatedPaymentMethodId,
      updatedType,
      updatedAmount,
      updatedDate,
      updatedIsOpening,
      updatedNotes,
      now,
      id,
    ]);

    return getTransactionById(id);
  } catch (err) {
    console.warn('MySQL updateTransaction error, falling back to JSON DB:', (err as Error).message);
    const updated = jsonDb.updateTransaction(id, data);
    if (!updated) return null;
    const cat = jsonDb.getCategoryById(updated.category_id);
    const pm = jsonDb.getPaymentMethodById(updated.payment_method_id);
    return {
      ...updated,
      category_name: cat ? cat.name : '',
      payment_method_name: pm ? pm.name : '',
    };
  }
}

export async function deleteTransaction(id: string): Promise<boolean> {
  try {
    const p = getPool();
    const [result] = await p.execute<mysql.ResultSetHeader>(
      'DELETE FROM transactions WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  } catch (err) {
    console.warn('MySQL deleteTransaction error, falling back to JSON DB:', (err as Error).message);
    return jsonDb.deleteTransaction(id);
  }
}

export async function getDashboardSummary() {
  try {
    const p = getPool();

    // 1. Total Saldo
    const [saldoRows] = await p.execute<mysql.RowDataPacket[]>(`
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE -amount END), 0) as saldo
      FROM transactions
    `);
    const saldo = Number(saldoRows[0]?.saldo || 0);

    // 2. Income & Expense for current month
    const [monthlyRows] = await p.execute<mysql.RowDataPacket[]>(`
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) as pemasukan,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as pengeluaran
      FROM transactions
      WHERE MONTH(transaction_date) = MONTH(CURRENT_DATE())
        AND YEAR(transaction_date) = YEAR(CURRENT_DATE())
    `);
    const pemasukanBulanIni = Number(monthlyRows[0]?.pemasukan || 0);
    const pengeluaranBulanIni = Number(monthlyRows[0]?.pengeluaran || 0);

    // 3. Recent 5 transactions
    const transaksiTerbaru = await getTransactions();

    return {
      saldo,
      pemasukanBulanIni,
      pengeluaranBulanIni,
      transaksiTerbaru: transaksiTerbaru.slice(0, 5),
    };
  } catch (err) {
    console.warn('MySQL getDashboardSummary error, falling back to JSON DB:', (err as Error).message);
    return jsonDb.getDashboardSummary();
  }
}

export async function getOrCreateOpeningCategory(): Promise<DBCategory> {
  try {
    const p = getPool();
    const [rows] = await p.execute<mysql.RowDataPacket[]>(
      `SELECT id, name, type, created_at, updated_at FROM categories WHERE name = ? LIMIT 1`,
      ['Saldo Awal']
    );
    if (rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        type: r.type,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
      };
    }
    return createCategory('Saldo Awal', 'income');
  } catch (err) {
    console.warn('MySQL getOrCreateOpeningCategory error, falling back to JSON DB:', (err as Error).message);
    const cat = jsonDb.getCategories().find((c) => c.name === 'Saldo Awal' && c.type === 'income');
    if (cat) return cat;
    return jsonDb.createCategory('Saldo Awal', 'income');
  }
}

export async function getMonthlyNetBalance(yearMonth: string): Promise<number> {
  const [year, month] = yearMonth.split('-');
  if (!year || !month) throw new Error('Format bulan harus YYYY-MM.');

  try {
    const p = getPool();
    const [rows] = await p.execute<mysql.RowDataPacket[]>(`
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE -amount END), 0) as net
      FROM transactions
      WHERE YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?
    `, [year, month]);
    return Number(rows[0]?.net || 0);
  } catch (err) {
    console.warn('MySQL getMonthlyNetBalance error, falling back to JSON DB:', (err as Error).message);
    const txs = jsonDb.getTransactionsByMonth(yearMonth);
    return txs.reduce((sum, t) => sum + (t.transaction_type === 'income' ? t.amount : -t.amount), 0);
  }
}

function firstDayOfNextMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const next = new Date(year, month, 1);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function deleteOpeningTransactionsForMonth(monthStart: string): Promise<number> {
  try {
    const p = getPool();
    const [result] = await p.execute<mysql.ResultSetHeader>(
      'DELETE FROM transactions WHERE is_opening = 1 AND transaction_date = ?',
      [monthStart]
    );
    return result.affectedRows;
  } catch (err) {
    console.warn('MySQL deleteOpeningTransactionsForMonth error, falling back to JSON DB:', (err as Error).message);
    return jsonDb.deleteTransactionsByOpeningMonth(monthStart);
  }
}

export async function createOpeningTransaction(sourceMonth: string): Promise<{
  netBalance: number;
  targetDate: string;
  openingTransaction: TransactionWithDetails;
  removedCount: number;
}> {
  if (!/^\d{4}-\d{2}$/.test(sourceMonth)) {
    throw new Error('Bulan sumber harus format YYYY-MM.');
  }

  const netBalance = await getMonthlyNetBalance(sourceMonth);
  const targetDate = firstDayOfNextMonth(sourceMonth);
  const category = await getOrCreateOpeningCategory();

  // Ensure a default payment method exists
  const paymentMethods = await getPaymentMethods();
  const paymentMethodId = paymentMethods[0]?.id || 'pm_1';

  const removedCount = await deleteOpeningTransactionsForMonth(targetDate);

  const openingTransaction = await createTransaction({
    category_id: category.id,
    payment_method_id: paymentMethodId,
    transaction_type: netBalance >= 0 ? 'income' : 'expense',
    amount: Math.abs(netBalance),
    transaction_date: targetDate,
    notes: `Saldo awal dari ${sourceMonth}`,
    is_opening: true,
  });

  return { netBalance, targetDate, openingTransaction, removedCount };
}
