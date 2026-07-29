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

export interface DBTransaction {
  id: string;
  category_id: string;
  payment_method_id: string;
  transaction_type: TransactionType;
  amount: number;
  transaction_date: string; // YYYY-MM-DD format or ISO string
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DBData {
  users: DBUser[];
  categories: DBCategory[];
  payment_methods: DBPaymentMethod[];
  transactions: DBTransaction[];
}

const DB_FILE = path.join(process.cwd(), 'data_db.json');

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

  return { users, categories, payment_methods, transactions };
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
        return JSON.parse(raw);
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

  // Payment Methods
  getPaymentMethods(): DBPaymentMethod[] {
    return this.data.payment_methods;
  }

  getPaymentMethodById(id: string): DBPaymentMethod | undefined {
    return this.data.payment_methods.find((pm) => pm.id === id);
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

    this.save();
    return { success: true };
  }

  // Transactions
  getTransactions(): DBTransaction[] {
    return [...this.data.transactions].sort((a, b) =>
      b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at)
    );
  }

  getTransactionById(id: string): DBTransaction | undefined {
    return this.data.transactions.find((t) => t.id === id);
  }

  createTransaction(payload: {
    category_id: string;
    payment_method_id: string;
    transaction_type: TransactionType;
    amount: number;
    transaction_date: string;
    notes?: string;
  }): DBTransaction {
    const now = nowISO();
    const newTx: DBTransaction = {
      id: 'tx_' + generateId(),
      category_id: payload.category_id,
      payment_method_id: payload.payment_method_id,
      transaction_type: payload.transaction_type,
      amount: Number(payload.amount),
      transaction_date: payload.transaction_date || getTodayFormatted(),
      notes: payload.notes ? payload.notes.trim() : '',
      created_at: now,
      updated_at: now,
    };
    this.data.transactions.push(newTx);
    this.save();
    return newTx;
  }

  updateTransaction(
    id: string,
    payload: {
      category_id?: string;
      payment_method_id?: string;
      transaction_type?: TransactionType;
      amount?: number;
      transaction_date?: string;
      notes?: string;
    }
  ): DBTransaction | null {
    const idx = this.data.transactions.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    const existing = this.data.transactions[idx];
    this.data.transactions[idx] = {
      ...existing,
      category_id: payload.category_id ?? existing.category_id,
      payment_method_id: payload.payment_method_id ?? existing.payment_method_id,
      transaction_type: payload.transaction_type ?? existing.transaction_type,
      amount: payload.amount !== undefined ? Number(payload.amount) : existing.amount,
      transaction_date: payload.transaction_date ?? existing.transaction_date,
      notes: payload.notes !== undefined ? payload.notes.trim() : existing.notes,
      updated_at: nowISO(),
    };
    this.save();
    return this.data.transactions[idx];
  }

  deleteTransaction(id: string): boolean {
    const initialLen = this.data.transactions.length;
    this.data.transactions = this.data.transactions.filter((t) => t.id !== id);
    if (this.data.transactions.length === initialLen) return false;
    this.save();
    return true;
  }

  // Dashboard Summary calculation
  getDashboardSummary() {
    const allTxs = this.getTransactions();
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
