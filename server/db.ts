import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export type TransactionType = 'income' | 'expense';

export interface DBUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface DBCategory {
  id: string;
  name: string;
  type: TransactionType;
  created_at: string;
  updated_at: string;
}

export interface DBPaymentMethod {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface DBBudget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface DBTransaction {
  id: string;
  user_id: string;
  category_id: string;
  payment_method_id: string;
  transaction_type: TransactionType;
  amount: number;
  transaction_date: string; // YYYY-MM-DD format or ISO string
  is_opening?: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DBMcpKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface DBData {
  users: DBUser[];
  categories: DBCategory[];
  payment_methods: DBPaymentMethod[];
  budgets: DBBudget[];
  transactions: DBTransaction[];
  mcp_keys: DBMcpKey[];
}

const DB_FILE = path.join(process.cwd(), 'data_db.json');

/**
 * Pemilik default untuk row lama di data_db.json yang belum punya user_id.
 * Sama dengan klaim awal di `npm run db:user-scope`, supaya dua jalur DB
 * konsisten.
 */
const DEFAULT_USER_ID = 'usr_1';

function nowISO(): string {
  return new Date().toISOString();
}

function getTodayFormatted(): string {
  return new Date().toISOString().split('T')[0];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function initialSeedData(): DBData {
  const now = nowISO();
  const today = getTodayFormatted();
  
  // Create current month dates for sample transactions
  const d = new Date();
  const currentYear = d.getFullYear();
  const currentMonth = String(d.getMonth() + 1).padStart(2, '0');
  
  const dateStr = (day: number) => `${currentYear}-${currentMonth}-${String(day).padStart(2, '0')}`;

  const salt = bcrypt.genSaltSync(10);
  const userPasswordHash = bcrypt.hashSync('password123', salt);

  const users: DBUser[] = [
    {
      id: 'usr_1',
      name: 'Pengguna Utama',
      email: 'user@finance.com',
      password_hash: userPasswordHash,
      created_at: now,
      updated_at: now,
    },
  ];

  const payment_methods: DBPaymentMethod[] = [
    { id: 'pm_1', name: 'Tunai', created_at: now, updated_at: now },
    { id: 'pm_2', name: 'Transfer', created_at: now, updated_at: now },
    { id: 'pm_3', name: 'QRIS', created_at: now, updated_at: now },
    { id: 'pm_4', name: 'E-Wallet', created_at: now, updated_at: now },
    { id: 'pm_5', name: 'Debit', created_at: now, updated_at: now },
  ];

  const categories: DBCategory[] = [
    // Income
    { id: 'cat_inc_1', name: 'Gaji', type: 'income', created_at: now, updated_at: now },
    { id: 'cat_inc_2', name: 'Bonus', type: 'income', created_at: now, updated_at: now },
    { id: 'cat_inc_3', name: 'Freelance', type: 'income', created_at: now, updated_at: now },
    { id: 'cat_inc_4', name: 'Investasi', type: 'income', created_at: now, updated_at: now },
    { id: 'cat_inc_5', name: 'Lainnya', type: 'income', created_at: now, updated_at: now },
    // Expense
    { id: 'cat_exp_1', name: 'Makanan', type: 'expense', created_at: now, updated_at: now },
    { id: 'cat_exp_2', name: 'Transportasi', type: 'expense', created_at: now, updated_at: now },
    { id: 'cat_exp_3', name: 'Belanja', type: 'expense', created_at: now, updated_at: now },
    { id: 'cat_exp_4', name: 'Tagihan', type: 'expense', created_at: now, updated_at: now },
    { id: 'cat_exp_5', name: 'Hiburan', type: 'expense', created_at: now, updated_at: now },
    { id: 'cat_exp_6', name: 'Kesehatan', type: 'expense', created_at: now, updated_at: now },
    { id: 'cat_exp_7', name: 'Pendidikan', type: 'expense', created_at: now, updated_at: now },
    { id: 'cat_exp_8', name: 'Lainnya', type: 'expense', created_at: now, updated_at: now },
  ];

  const transactions: DBTransaction[] = [
    {
      id: 'tx_1',
      user_id: 'usr_1',
      category_id: 'cat_inc_1',
      payment_method_id: 'pm_2',
      transaction_type: 'income',
      amount: 8500000,
      transaction_date: dateStr(1),
      notes: 'Gaji Bulanan',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'tx_2',
      user_id: 'usr_1',
      category_id: 'cat_exp_1',
      payment_method_id: 'pm_3',
      transaction_type: 'expense',
      amount: 45000,
      transaction_date: dateStr(2),
      notes: 'Makan siang Nasi Padang',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'tx_3',
      user_id: 'usr_1',
      category_id: 'cat_exp_2',
      payment_method_id: 'pm_4',
      transaction_type: 'expense',
      amount: 150000,
      transaction_date: dateStr(3),
      notes: 'Topup saldo e-toll & ojek online',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'tx_4',
      user_id: 'usr_1',
      category_id: 'cat_exp_4',
      payment_method_id: 'pm_2',
      transaction_type: 'expense',
      amount: 350000,
      transaction_date: dateStr(5),
      notes: 'Tagihan Listrik & WiFi',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'tx_5',
      user_id: 'usr_1',
      category_id: 'cat_inc_3',
      payment_method_id: 'pm_2',
      transaction_type: 'income',
      amount: 1200000,
      transaction_date: dateStr(10),
      notes: 'Project Web Design Freelance',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'tx_6',
      user_id: 'usr_1',
      category_id: 'cat_exp_3',
      payment_method_id: 'pm_5',
      transaction_type: 'expense',
      amount: 250000,
      transaction_date: Math.min(d.getDate(), 28) >= 1 ? dateStr(Math.min(d.getDate(), 28)) : today,
      notes: 'Belanja Bulanan Minimarket',
      created_at: now,
      updated_at: now,
    },
  ];

  return { users, categories, payment_methods, budgets: seedBudgets(now), transactions, mcp_keys: [] };
}

function seedBudgets(now: string): DBBudget[] {
  const seed: [string, string, number][] = [
    ['bud_1', 'cat_exp_1', 1500000],
    ['bud_2', 'cat_exp_2', 500000],
    ['bud_3', 'cat_exp_3', 1000000],
    ['bud_4', 'cat_exp_4', 800000],
    ['bud_5', 'cat_exp_5', 500000],
    ['bud_6', 'cat_exp_6', 500000],
    ['bud_7', 'cat_exp_7', 1000000],
    ['bud_8', 'cat_exp_8', 300000],
  ];
  return seed.map(([id, category_id, amount]) => ({
    id,
    user_id: 'usr_1',
    category_id,
    amount,
    created_at: now,
    updated_at: now,
  }));
}

export class JsonDB {
  private data: DBData;

  constructor() {
    this.data = this.load();
  }

  private load(): DBData {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DBData;
        // Backfill fields introduced after the file was created.
        if (!Array.isArray(parsed.budgets)) parsed.budgets = [];
        if (!Array.isArray(parsed.mcp_keys)) parsed.mcp_keys = [];
        return parsed;
      }
    } catch (err) {
      console.error('Failed reading db file, re-seeding:', err);
    }
    const seeded = initialSeedData();
    this.saveData(seeded);
    return seeded;
  }

  private saveData(data: DBData) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving db file:', err);
    }
  }

  private save() {
    this.saveData(this.data);
  }

  // Users
  getUserByEmail(email: string): DBUser | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string): DBUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  // MCP Keys
  listMcpKeys(userId: string): DBMcpKey[] {
    return this.data.mcp_keys
      .filter((k) => k.user_id === userId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  createMcpKey(userId: string, name: string, id: string, keyHash: string): DBMcpKey {
    const key: DBMcpKey = {
      id,
      user_id: userId,
      name: name.trim(),
      key_hash: keyHash,
      last_used_at: null,
      revoked_at: null,
      created_at: nowISO(),
    };
    this.data.mcp_keys.push(key);
    this.save();
    return key;
  }

  getMcpKeyByHash(keyHash: string): DBMcpKey | undefined {
    const key = this.data.mcp_keys.find((k) => k.key_hash === keyHash && !k.revoked_at);
    if (!key) return undefined;
    key.last_used_at = nowISO();
    this.save();
    return key;
  }

  revokeMcpKey(id: string, userId: string): boolean {
    const key = this.data.mcp_keys.find((k) => k.id === id && k.user_id === userId);
    if (!key || key.revoked_at) return false;
    key.revoked_at = nowISO();
    this.save();
    return true;
  }

  // Payment Methods
  getPaymentMethods(): DBPaymentMethod[] {
    return this.data.payment_methods;
  }

  getPaymentMethodById(id: string): DBPaymentMethod | undefined {
    return this.data.payment_methods.find((pm) => pm.id === id);
  }

  createPaymentMethod(name: string): DBPaymentMethod {
    const trimmed = name.trim();
    if (this.data.payment_methods.some((pm) => pm.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error('Metode pembayaran dengan nama tersebut sudah ada.');
    }
    const now = nowISO();
    const pm: DBPaymentMethod = {
      id: 'pm_' + generateId(),
      name: trimmed,
      created_at: now,
      updated_at: now,
    };
    this.data.payment_methods.push(pm);
    this.save();
    return pm;
  }

  updatePaymentMethod(id: string, name: string): DBPaymentMethod | null {
    const trimmed = name.trim();
    const idx = this.data.payment_methods.findIndex((pm) => pm.id === id);
    if (idx === -1) return null;
    if (
      this.data.payment_methods.some(
        (pm) => pm.id !== id && pm.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      throw new Error('Metode pembayaran dengan nama tersebut sudah ada.');
    }
    this.data.payment_methods[idx] = {
      ...this.data.payment_methods[idx],
      name: trimmed,
      updated_at: nowISO(),
    };
    this.save();
    return this.data.payment_methods[idx];
  }

  deletePaymentMethod(id: string): { success: boolean; error?: string } {
    const usedCount = this.data.transactions.filter((t) => t.payment_method_id === id).length;
    if (usedCount > 0) {
      return {
        success: false,
        error: 'Metode pembayaran masih digunakan oleh transaksi. Pindahkan transaksi ke metode lain sebelum menghapus.',
      };
    }
    const initialLen = this.data.payment_methods.length;
    this.data.payment_methods = this.data.payment_methods.filter((pm) => pm.id !== id);
    if (this.data.payment_methods.length === initialLen) {
      return { success: false, error: 'Metode pembayaran tidak ditemukan.' };
    }
    this.save();
    return { success: true };
  }

  // Budgets (one monthly limit per user+category)
  getBudgets(userId: string): DBBudget[] {
    return (this.data.budgets ?? []).filter((b) => b.user_id === userId);
  }

  setBudget(userId: string, categoryId: string, amount: number): DBBudget {
    if (!this.data.budgets) this.data.budgets = [];
    const now = nowISO();
    const existing = this.data.budgets.find((b) => b.user_id === userId && b.category_id === categoryId);
    if (existing) {
      existing.amount = amount;
      existing.updated_at = now;
      this.save();
      return existing;
    }
    const budget: DBBudget = {
      id: 'bud_' + generateId(),
      user_id: userId,
      category_id: categoryId,
      amount,
      created_at: now,
      updated_at: now,
    };
    this.data.budgets.push(budget);
    this.save();
    return budget;
  }

  deleteBudget(userId: string, categoryId: string): boolean {
    if (!this.data.budgets) return false;
    const initialLen = this.data.budgets.length;
    this.data.budgets = this.data.budgets.filter(
      (b) => !(b.user_id === userId && b.category_id === categoryId)
    );
    if (this.data.budgets.length === initialLen) return false;
    this.save();
    return true;
  }

  // Categories
  getCategories(): DBCategory[] {
    return this.data.categories;
  }

  getCategoryById(id: string): DBCategory | undefined {
    return this.data.categories.find((c) => c.id === id);
  }

  createCategory(name: string, type: TransactionType): DBCategory {
    const now = nowISO();
    const newCat: DBCategory = {
      id: 'cat_' + generateId(),
      name: name.trim(),
      type,
      created_at: now,
      updated_at: now,
    };
    this.data.categories.push(newCat);
    this.save();
    return newCat;
  }

  updateCategory(id: string, name: string, type: TransactionType): DBCategory | null {
    const catIndex = this.data.categories.findIndex((c) => c.id === id);
    if (catIndex === -1) return null;

    this.data.categories[catIndex] = {
      ...this.data.categories[catIndex],
      name: name.trim(),
      type,
      updated_at: nowISO(),
    };
    this.save();
    return this.data.categories[catIndex];
  }

  deleteCategory(id: string): { success: boolean; error?: string } {
    // PRD Validation: Kategori yang masih digunakan transaksi tidak boleh dihapus.
    const usedCount = this.data.transactions.filter((t) => t.category_id === id).length;
    if (usedCount > 0) {
      return {
        success: false,
        error: 'Kategori masih digunakan oleh transaksi. Pindahkan transaksi ke kategori lain sebelum menghapus kategori ini.',
      };
    }

    const initialLen = this.data.categories.length;
    this.data.categories = this.data.categories.filter((c) => c.id !== id);
    if (this.data.categories.length === initialLen) {
      return { success: false, error: 'Kategori tidak ditemukan' };
    }
    // Cascade: remove budget attached to the deleted category.
    if (this.data.budgets) {
      this.data.budgets = this.data.budgets.filter((b) => b.category_id !== id);
    }

    this.save();
    return { success: true };
  }

  // Transactions
  getTransactions(userId: string): DBTransaction[] {
    return this.data.transactions
      .filter((t) => (t.user_id ?? DEFAULT_USER_ID) === userId)
      .sort((a, b) =>
        b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at)
      );
  }

  getTransactionById(userId: string, id: string): DBTransaction | undefined {
    return this.data.transactions.find(
      (t) => t.id === id && (t.user_id ?? DEFAULT_USER_ID) === userId
    );
  }

  getTransactionsByMonth(userId: string, yearMonth: string): DBTransaction[] {
    return this.getTransactions(userId).filter((t) => t.transaction_date.startsWith(yearMonth));
  }

  deleteTransaction(userId: string, id: string): boolean {
    const initialLen = this.data.transactions.length;
    this.data.transactions = this.data.transactions.filter(
      (t) => !(t.id === id && (t.user_id ?? DEFAULT_USER_ID) === userId)
    );
    if (this.data.transactions.length === initialLen) return false;
    this.save();
    return true;
  }

  createTransaction(
    userId: string,
    payload: {
      category_id: string;
      payment_method_id: string;
      transaction_type: TransactionType;
      amount: number;
      transaction_date: string;
      notes?: string;
      is_opening?: boolean;
    }
  ): DBTransaction {
    const now = nowISO();
    const newTx: DBTransaction = {
      id: 'tx_' + generateId(),
      user_id: userId,
      category_id: payload.category_id,
      payment_method_id: payload.payment_method_id,
      transaction_type: payload.transaction_type,
      amount: Number(payload.amount),
      transaction_date: payload.transaction_date || getTodayFormatted(),
      is_opening: payload.is_opening === true,
      notes: payload.notes ? payload.notes.trim() : '',
      created_at: now,
      updated_at: now,
    };
    this.data.transactions.push(newTx);
    this.save();
    return newTx;
  }

  updateTransaction(
    userId: string,
    id: string,
    payload: {
      category_id?: string;
      payment_method_id?: string;
      transaction_type?: TransactionType;
      amount?: number;
      transaction_date?: string;
      notes?: string;
      is_opening?: boolean;
    }
  ): DBTransaction | null {
    const idx = this.data.transactions.findIndex(
      (t) => t.id === id && (t.user_id ?? DEFAULT_USER_ID) === userId
    );
    if (idx === -1) return null;

    const existing = this.data.transactions[idx];
    this.data.transactions[idx] = {
      ...existing,
      category_id: payload.category_id ?? existing.category_id,
      payment_method_id: payload.payment_method_id ?? existing.payment_method_id,
      transaction_type: payload.transaction_type ?? existing.transaction_type,
      amount: payload.amount !== undefined ? Number(payload.amount) : existing.amount,
      transaction_date: payload.transaction_date ?? existing.transaction_date,
      is_opening: payload.is_opening !== undefined ? payload.is_opening : existing.is_opening,
      notes: payload.notes !== undefined ? payload.notes.trim() : existing.notes,
      updated_at: nowISO(),
    };
    this.save();
    return this.data.transactions[idx];
  }

  deleteTransactionsByOpeningMonth(userId: string, monthStart: string): number {
    const before = this.data.transactions.length;
    this.data.transactions = this.data.transactions.filter(
      (t) => !(t.is_opening && t.transaction_date === monthStart && (t.user_id ?? DEFAULT_USER_ID) === userId)
    );
    const removed = before - this.data.transactions.length;
    if (removed > 0) this.save();
    return removed;
  }

  getOpeningTransactionForMonth(userId: string, monthStart: string): DBTransaction | undefined {
    return this.data.transactions.find(
      (t) => t.is_opening && t.transaction_date === monthStart && (t.user_id ?? DEFAULT_USER_ID) === userId
    );
  }

  // Dashboard Summary calculation
  getDashboardSummary(userId: string) {
    const allTxs = this.getTransactions(userId);
    const categoriesMap = new Map(this.getCategories().map((c) => [c.id, c.name]));
    const pmMap = new Map(this.getPaymentMethods().map((pm) => [pm.id, pm.name]));

    // Total income and expense
    let totalIncome = 0;
    let totalExpense = 0;

    // Current month calculations
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${currentYear}-${currentMonthStr}`;

    let pemasukanBulanIni = 0;
    let pengeluaranBulanIni = 0;

    allTxs.forEach((t) => {
      if (t.transaction_type === 'income') {
        totalIncome += t.amount;
        if (t.transaction_date.startsWith(monthPrefix)) {
          pemasukanBulanIni += t.amount;
        }
      } else if (t.transaction_type === 'expense') {
        totalExpense += t.amount;
        if (t.transaction_date.startsWith(monthPrefix)) {
          pengeluaranBulanIni += t.amount;
        }
      }
    });

    const saldo = totalIncome - totalExpense;

    // 5-10 recent transactions
    const recentRaw = allTxs.slice(0, 10);
    const recentTransactions = recentRaw.map((t) => ({
      ...t,
      category_name: categoriesMap.get(t.category_id) || 'Kategori Lain',
      payment_method_name: pmMap.get(t.payment_method_id) || 'Tunai',
    }));

    return {
      saldo,
      pemasukanBulanIni,
      pengeluaranBulanIni,
      recentTransactions,
    };
  }
}

export const db = new JsonDB();
