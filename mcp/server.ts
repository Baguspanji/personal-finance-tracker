/**
 * MCP server (transport stdio) untuk Personal Finance Tracker.
 *
 * Transport HTTP alternatif ada di server.ts pada route POST /mcp — pakai yang
 * itu kalau client mendukung remote MCP, stdio cuma fallback untuk editor yang
 * hanya bisa menjalankan proses lokal.
 *
 * PENTING: transport ini stdio, jadi stdout dipakai JSON-RPC.
 * Jangan pernah console.log() di file ini atau file yang di-import —
 * semuanya console.error().
 *
 * Auth: kunci `mcp_...` yang dibuat dari web (Sidebar > Kunci MCP),
 * dibaca dari env FINANCE_MCP_KEY.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createFinanceMcpServer } from './tools';

const BASE_URL = (process.env.FINANCE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_KEY = process.env.FINANCE_MCP_KEY || '';

if (!API_KEY) {
  console.error('FINANCE_MCP_KEY belum diisi. Buat kunci di web (Sidebar > Kunci MCP) lalu set env ini.');
  process.exit(1);
}

const server = createFinanceMcpServer({
  baseUrl: BASE_URL,
  authorization: `Bearer ${API_KEY}`,
});

await server.connect(new StdioServerTransport());
console.error(`personal-finance MCP siap (${BASE_URL})`);