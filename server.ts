import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';

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

  app.use(express.json());
  app.use(cookieParser());

  // --- Auth Endpoints ---
  app.post('/api/login', (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email dan password wajib diisi.' });
      return;
    }

    const user = db.getUserByEmail(email);
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

  app.get('/api/me', requireAuth, (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Pengguna tidak terautentikasi' });
      return;
    }
    const user = db.getUserById(req.userId);
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
  app.get('/api/dashboard', requireAuth, (req: AuthRequest, res: Response) => {
    const summary = db.getDashboardSummary();
    res.json(summary);
  });

  // --- Payment Methods Endpoint ---
  app.get('/api/payment-methods', requireAuth, (req: AuthRequest, res: Response) => {
    const paymentMethods = db.getPaymentMethods();
    res.json(paymentMethods);
  });

  // --- Category Endpoints ---
  app.get('/api/categories', requireAuth, (req: AuthRequest, res: Response) => {
    const categories = db.getCategories();
    res.json(categories);
  });

  app.post('/api/categories', requireAuth, (req: AuthRequest, res: Response) => {
    const { name, type } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Nama kategori wajib diisi.' });
      return;
    }

    if (!type || (type !== 'income' && type !== 'expense')) {
      res.status(400).json({ error: 'Jenis kategori harus berupa "income" atau "expense".' });
      return;
    }

    const newCat = db.createCategory(name, type);
    res.status(201).json(newCat);
  });

  app.put('/api/categories/:id', requireAuth, (req: AuthRequest, res: Response) => {
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

    const updated = db.updateCategory(id, name, type);
    if (!updated) {
      res.status(404).json({ error: 'Kategori tidak ditemukan.' });
      return;
    }

    res.json(updated);
  });

  app.delete('/api/categories/:id', requireAuth, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const result = db.deleteCategory(id);

    if (!result.success) {
      res.status(400).json({ error: result.error || 'Gagal menghapus kategori.' });
      return;
    }

    res.json({ success: true, message: 'Kategori berhasil dihapus.' });
  });

  // --- Transaction Endpoints ---
  app.get('/api/transactions', requireAuth, (req: AuthRequest, res: Response) => {
    const rawTxs = db.getTransactions();
    const categoriesMap = new Map(db.getCategories().map((c) => [c.id, c.name]));
    const pmMap = new Map(db.getPaymentMethods().map((pm) => [pm.id, pm.name]));

    const transactions = rawTxs.map((t) => ({
      ...t,
      category_name: categoriesMap.get(t.category_id) || 'Kategori Lain',
      payment_method_name: pmMap.get(t.payment_method_id) || 'Tunai',
    }));

    res.json(transactions);
  });

  app.get('/api/transactions/:id', requireAuth, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tx = db.getTransactionById(id);
    if (!tx) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
      return;
    }

    const cat = db.getCategoryById(tx.category_id);
    const pm = db.getPaymentMethodById(tx.payment_method_id);

    res.json({
      ...tx,
      category_name: cat ? cat.name : 'Kategori Lain',
      payment_method_name: pm ? pm.name : 'Tunai',
    });
  });

  app.post('/api/transactions', requireAuth, (req: AuthRequest, res: Response) => {
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
      const pmList = db.getPaymentMethods();
      const tunaiPm = pmList.find((p) => p.name.toLowerCase() === 'tunai');
      finalPaymentMethodId = tunaiPm ? tunaiPm.id : pmList[0]?.id || 'pm_1';
    }

    const newTx = db.createTransaction({
      category_id,
      payment_method_id: finalPaymentMethodId,
      transaction_type,
      amount: numAmount,
      transaction_date,
      notes,
    });

    const cat = db.getCategoryById(newTx.category_id);
    const pm = db.getPaymentMethodById(newTx.payment_method_id);

    res.status(201).json({
      ...newTx,
      category_name: cat ? cat.name : '',
      payment_method_name: pm ? pm.name : '',
    });
  });

  app.put('/api/transactions/:id', requireAuth, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { category_id, payment_method_id, transaction_type, amount, transaction_date, notes } = req.body;

    if (amount !== undefined) {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        res.status(400).json({ error: 'Nominal harus lebih besar dari 0.' });
        return;
      }
    }

    const updated = db.updateTransaction(id, {
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

    const cat = db.getCategoryById(updated.category_id);
    const pm = db.getPaymentMethodById(updated.payment_method_id);

    res.json({
      ...updated,
      category_name: cat ? cat.name : '',
      payment_method_name: pm ? pm.name : '',
    });
  });

  app.delete('/api/transactions/:id', requireAuth, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const success = db.deleteTransaction(id);

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
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
