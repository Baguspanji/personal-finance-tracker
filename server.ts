import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import * as mysqlDb from './server/mysql-db';

const JWT_SECRET = process.env.JWT_SECRET || 'finance_tracker_jwt_secret_2026';

interface AuthRequest extends Request {
  userId?: string;
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Akses tidak diizinkan. Silakan login terlebih dahulu.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Sesi telah berakhir or token tidak valid.' });
    return;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize MySQL database connection
  await mysqlDb.initMySQL();

  app.use(express.json());
  app.use(cookieParser());

  // --- Auth Endpoints ---
  app.post('/api/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email dan password wajib diisi.' });
      return;
    }

    const user = await mysqlDb.getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Email atau password salah.' });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Email atau password salah.' });
      return;
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  });

  app.post('/api/logout', (req: Request, res: Response) => {
    res.clearCookie('token');
    res.json({ message: 'Berhasil logout' });
  });

  app.get('/api/me', requireAuth, async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Pengguna tidak terautentikasi' });
      return;
    }
    const user = await mysqlDb.getUserById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan' });
      return;
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  });

  // --- Dashboard Endpoint ---
  app.get('/api/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
    const summary = await mysqlDb.getDashboardSummary();
    res.json(summary);
  });

  // --- Opening Transaction Endpoint ---
  app.post('/api/opening-transactions', requireAuth, async (req: AuthRequest, res: Response) => {
    const { sourceMonth } = req.body;
    if (!sourceMonth || typeof sourceMonth !== 'string') {
      res.status(400).json({ error: 'Bulan sumber wajib diisi (YYYY-MM).' });
      return;
    }
    try {
      const result = await mysqlDb.createOpeningTransaction(sourceMonth);
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      console.error('Failed creating opening transaction:', err);
      res.status(500).json({ error: (err as Error).message || 'Gagal membuat transaksi awal.' });
    }
  });

  // --- Payment Methods Endpoint ---
  app.get('/api/payment-methods', requireAuth, async (req: AuthRequest, res: Response) => {
    const paymentMethods = await mysqlDb.getPaymentMethods();
    res.json(paymentMethods);
  });

  app.post('/api/payment-methods', requireAuth, async (req: AuthRequest, res: Response) => {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Nama metode pembayaran wajib diisi.' });
      return;
    }

    try {
      const created = await mysqlDb.createPaymentMethod(name);
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message || 'Gagal menambah metode pembayaran.' });
    }
  });

  app.put('/api/payment-methods/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Nama metode pembayaran wajib diisi.' });
      return;
    }

    try {
      const updated = await mysqlDb.updatePaymentMethod(id, name);
      if (!updated) {
        res.status(404).json({ error: 'Metode pembayaran tidak ditemukan.' });
        return;
      }
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message || 'Gagal memperbarui metode pembayaran.' });
    }
  });

  app.delete('/api/payment-methods/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const result = await mysqlDb.deletePaymentMethod(id);

    if (!result.success) {
      res.status(400).json({ error: result.error || 'Gagal menghapus metode pembayaran.' });
      return;
    }

    res.json({ success: true, message: 'Metode pembayaran berhasil dihapus.' });
  });

  // --- Budget Endpoints (monthly limit per expense category) ---
  app.get('/api/budgets', requireAuth, async (req: AuthRequest, res: Response) => {
    const budgets = await mysqlDb.getBudgets();
    res.json(budgets);
  });

  app.put('/api/budgets/:categoryId', requireAuth, async (req: AuthRequest, res: Response) => {
    const { categoryId } = req.params;
    const numAmount = Number(req.body.amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: 'Nominal budget wajib diisi dan harus lebih besar dari 0.' });
      return;
    }

    try {
      const saved = await mysqlDb.setBudget(categoryId, numAmount);
      res.json(saved);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message || 'Gagal menyimpan budget.' });
    }
  });

  app.delete('/api/budgets/:categoryId', requireAuth, async (req: AuthRequest, res: Response) => {
    const { categoryId } = req.params;
    const success = await mysqlDb.deleteBudget(categoryId);

    if (!success) {
      res.status(404).json({ error: 'Budget tidak ditemukan.' });
      return;
    }

    res.json({ success: true, message: 'Budget berhasil dihapus.' });
  });

  // --- Category Endpoints ---
  app.get('/api/categories', requireAuth, async (req: AuthRequest, res: Response) => {
    const categories = await mysqlDb.getCategories();
    res.json(categories);
  });

  app.post('/api/categories', requireAuth, async (req: AuthRequest, res: Response) => {
    const { name, type } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Nama kategori wajib diisi.' });
      return;
    }

    if (!type || (type !== 'income' && type !== 'expense')) {
      res.status(400).json({ error: 'Jenis kategori harus berupa "income" atau "expense".' });
      return;
    }

    const newCat = await mysqlDb.createCategory(name, type);
    res.status(201).json(newCat);
  });

  app.put('/api/categories/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, type } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Nama kategori wajib diisi.' });
      return;
    }

    if (!type || (type !== 'income' && type !== 'expense')) {
      res.status(400).json({ error: 'Jenis kategori harus berupa "income" atau "expense".' });
      return;
    }

    const updated = await mysqlDb.updateCategory(id, name, type);
    if (!updated) {
      res.status(404).json({ error: 'Kategori tidak ditemukan.' });
      return;
    }

    res.json(updated);
  });

  app.delete('/api/categories/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const result = await mysqlDb.deleteCategory(id);

    if (!result.success) {
      res.status(400).json({ error: result.error || 'Gagal menghapus kategori.' });
      return;
    }

    res.json({ success: true, message: 'Kategori berhasil dihapus.' });
  });

  // --- Transaction Endpoints ---
  app.get('/api/transactions', requireAuth, async (req: AuthRequest, res: Response) => {
    const transactions = await mysqlDb.getTransactions();
    res.json(transactions);
  });

  app.get('/api/transactions/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tx = await mysqlDb.getTransactionById(id);
    if (!tx) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
      return;
    }

    res.json(tx);
  });

  app.post('/api/transactions', requireAuth, async (req: AuthRequest, res: Response) => {
    const { category_id, payment_method_id, transaction_type, amount, transaction_date, notes } = req.body;

    // Validation
    if (!transaction_date) {
      res.status(400).json({ error: 'Tanggal transaksi wajib diisi.' });
      return;
    }

    if (!transaction_type || (transaction_type !== 'income' && transaction_type !== 'expense')) {
      res.status(400).json({ error: 'Jenis transaksi wajib diisi (income/expense).' });
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: 'Nominal wajib diisi dan harus lebih besar dari 0.' });
      return;
    }

    if (!category_id) {
      res.status(400).json({ error: 'Kategori wajib dipilih.' });
      return;
    }

    // Default payment method: Tunai if not provided
    let finalPaymentMethodId = payment_method_id;
    if (!finalPaymentMethodId) {
      const pmList = await mysqlDb.getPaymentMethods();
      const tunaiPm = pmList.find((p) => p.name.toLowerCase() === 'tunai');
      finalPaymentMethodId = tunaiPm ? tunaiPm.id : pmList[0]?.id || 'pm_1';
    }

    const newTx = await mysqlDb.createTransaction({
      category_id,
      payment_method_id: finalPaymentMethodId,
      transaction_type,
      amount: numAmount,
      transaction_date,
      notes,
    });

    res.status(201).json(newTx);
  });

  app.put('/api/transactions/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { category_id, payment_method_id, transaction_type, amount, transaction_date, notes } = req.body;

    if (amount !== undefined) {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        res.status(400).json({ error: 'Nominal harus lebih besar dari 0.' });
        return;
      }
    }

    const updated = await mysqlDb.updateTransaction(id, {
      category_id,
      payment_method_id,
      transaction_type,
      amount: amount !== undefined ? Number(amount) : undefined,
      transaction_date,
      notes,
    });

    if (!updated) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
      return;
    }

    res.json(updated);
  });

  app.delete('/api/transactions/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const success = await mysqlDb.deleteTransaction(id);

    if (!success) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
      return;
    }

    res.json({ success: true, message: 'Transaksi berhasil dihapus.' });
  });

  // --- Vite & Static Asset Handling ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          // Service worker must always be revalidated so updates are picked up.
          if (filePath.endsWith(`${path.sep}sw.js`)) {
            res.setHeader('Cache-Control', 'no-store');
          } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            // Vite emits hashed filenames here: safe to cache immutably.
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      }),
    );
    app.get('*', (req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
