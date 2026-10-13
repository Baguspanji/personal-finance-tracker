/**
 * Definisi tool MCP untuk Personal Finance Tracker.
 *
 * Dipakai dua transport:
 * - `mcp/server.ts`  → stdio (kunci dari env FINANCE_MCP_KEY)
 * - `server.ts`      → HTTP POST /mcp (kunci/JWT dari header Authorization)
 *
 * Aturan keras: jangan pernah console.log() di file ini. Untuk transport stdio
 * stdout dipakai JSON-RPC, satu baris saja sudah menggagalkan handshake.
 * Semua output diagnostic wajib console.error().
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export interface FinanceMcpOptions {
  /** Origin API, tanpa trailing slash. */
  baseUrl: string;
  /** Header Authorization lengkap, mis. "Bearer mcp_...". */
  authorization: string;
}

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

/**
 * Server MCP baru untuk satu pemanggil. Stateless: server tidak menyimpan state
 * antar-request, jadi dua user tidak mungkin saling melihat data.
 */
export function createFinanceMcpServer(opts: FinanceMcpOptions): McpServer {
  const server = new McpServer({ name: 'personal-finance', version: '1.0.0' });

  async function call(path: string, init: RequestInit = {}): Promise<string> {
    const res = await fetch(`${opts.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: opts.authorization,
        ...(init.headers || {}),
      },
    });
    const body = await res.text();
    if (!res.ok) {
      // Teruskan pesan error asli dari server supaya model bisa bertindak.
      throw new Error(`HTTP ${res.status} ${path}: ${body}`);
    }
    return body;
  }

  // --- Read ---

  server.registerTool(
    'list_transactions',
    {
      title: 'Daftar Transaksi',
      description:
        'Ambil transaksi. Gunakan month="YYYY-MM" untuk satu bulan, atau startDate/endDate "YYYY-MM-DD" untuk rentang. Tanpa filter = seluruh riwayat.',
      inputSchema: {
        month: z.string().regex(/^\d{4}-\d{2}$/).optional().describe('Bulan format YYYY-MM'),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Tanggal mulai'),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Tanggal akhir'),
      },
    },
    async ({ month, startDate, endDate }) => {
      const params = new URLSearchParams();
      if (month) {
        const [y, m] = month.split('-').map(Number);
        params.set('startDate', `${month}-01`);
        params.set('endDate', new Date(y, m, 0).toISOString().slice(0, 10));
      } else {
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
      }
      const qs = params.toString();
      return ok(await call(`/api/transactions${qs ? `?${qs}` : ''}`));
    }
  );

  server.registerTool(
    'get_summary',
    {
      title: 'Ringkasan Dashboard',
      description: 'Saldo saat ini, pemasukan dan pengeluaran bulan berjalan.',
      inputSchema: {},
    },
    async () => ok(await call('/api/dashboard'))
  );

  server.registerTool(
    'list_categories',
    {
      title: 'Daftar Kategori',
      description: 'Semua kategori beserta id dan jenis (income/expense).',
      inputSchema: {},
    },
    async () => ok(await call('/api/categories'))
  );

  server.registerTool(
    'list_payment_methods',
    {
      title: 'Daftar Metode Pembayaran',
      description: 'Semua metode pembayaran beserta id.',
      inputSchema: {},
    },
    async () => ok(await call('/api/payment-methods'))
  );

  server.registerTool(
    'list_budgets',
    {
      title: 'Daftar Budget',
      description: 'Budget bulanan per kategori beserta category_id dan category_name.',
      inputSchema: {},
    },
    async () => ok(await call('/api/budgets'))
  );

  // --- Create ---

  server.registerTool(
    'create_transaction',
    {
      title: 'Buat Transaksi',
      description:
        'Catat transaksi baru. Ambil category_id dari list_categories dan payment_method_id dari list_payment_methods. Nominal dalam Rupiah tanpa titik.',
      inputSchema: {
        category_id: z.string().describe('Id kategori (dari list_categories)'),
        payment_method_id: z.string().describe('Id metode pembayaran (dari list_payment_methods)'),
        transaction_type: z.enum(['income', 'expense']).describe('income = pemasukan, expense = pengeluaran'),
        amount: z.number().positive().describe('Nominal Rupiah, contoh: 25000'),
        transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Tanggal YYYY-MM-DD'),
        notes: z.string().max(1000).optional().describe('Catatan singkat'),
      },
    },
    async (args) =>
      ok(
        await call('/api/transactions', {
          method: 'POST',
          body: JSON.stringify(args),
        })
      )
  );

  server.registerTool(
    'create_category',
    {
      title: 'Buat Kategori',
      description: 'Tambah kategori baru bertipe income atau expense.',
      inputSchema: {
        name: z.string().min(1).max(100).describe('Nama kategori, contoh: Transportasi'),
        type: z.enum(['income', 'expense']).describe('Jenis kategori'),
      },
    },
    async (args) =>
      ok(
        await call('/api/categories', {
          method: 'POST',
          body: JSON.stringify(args),
        })
      )
  );

  server.registerTool(
    'create_payment_method',
    {
      title: 'Buat Metode Pembayaran',
      description: 'Tambah metode pembayaran baru, contoh: QRIS, GoPay, Kartu Debit.',
      inputSchema: {
        name: z.string().min(1).max(100).describe('Nama metode pembayaran'),
      },
    },
    async (args) =>
      ok(
        await call('/api/payment-methods', {
          method: 'POST',
          body: JSON.stringify(args),
        })
      )
  );

  server.registerTool(
    'set_budget',
    {
      title: 'Atur Budget',
      description: 'Set budget bulanan untuk satu kategori expense. Memperbarui nilai yang sudah ada.',
      inputSchema: {
        category_id: z.string().describe('Id kategori expense (dari list_categories)'),
        amount: z.number().positive().describe('Limit bulanan dalam Rupiah'),
      },
    },
    async ({ category_id, amount }) =>
      ok(
        await call(`/api/budgets/${encodeURIComponent(category_id)}`, {
          method: 'PUT',
          body: JSON.stringify({ amount }),
        })
      )
  );

  return server;
}