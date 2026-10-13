/**
 * Uji MCP over HTTP: buat kunci lewat API, lalu sambung StreamableHTTPClientTransport
 * ke http://localhost:3000/mcp dengan header Authorization.
 *
 * Jalankan: npx tsx tests/test-mcp-http.ts
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const BASE = process.env.MCP_TEST_URL || 'http://localhost:3000';

let failed = 0;
const check = (name: string, ok: boolean, extra = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

async function main() {
  const login = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@finance.com', password: 'password123' }),
  });
  const jwt = (await login.json() as { token: string }).token;

  const keyRes = await fetch(`${BASE}/api/mcp-keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ name: 'test-http-mcp' }),
  });
  const { plaintext, id } = await keyRes.json() as { plaintext: string; id: string };
  check('kunci MCP dibuat', !!plaintext && !!id);
  const key = plaintext;

  try {
    const client = new Client({ name: 'test-http', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${key}` } },
    });
    await client.connect(transport);
    check('handshake initialize', true);

    const { tools } = await client.listTools();
    check('9 tool terdaftar', tools.length === 9, String(tools.length));

    const summary = await client.callTool({ name: 'get_summary', arguments: {} });
    const summaryText = (summary.content as { text: string }[])[0].text;
    check('get_summary mengembalikan saldo', JSON.parse(summaryText).saldo !== undefined, summaryText.slice(0, 60));

    const cats = await client.callTool({ name: 'list_categories', arguments: {} });
    const catsJson = JSON.parse((cats.content as { text: string }[])[0].text);
    check('list_categories punya kategori', Array.isArray(catsJson) && catsJson.length > 0, String(catsJson?.length));

    const tx = await client.callTool({
      name: 'list_transactions',
      arguments: { month: '2026-10' },
    });
    const txJson = JSON.parse((tx.content as { text: string }[])[0].text);
    check('list_transactions filter bulan jalan', Array.isArray(txJson), String(txJson?.length));
    check('semua hasil Oktober 2026', txJson.every((t: { transaction_date: string }) => t.transaction_date.startsWith('2026-10')));

    // Validasi zod: argumen salah harus ditolak sebelum request dikirim.
    // SDK melaporkan penolakan input sebagai hasil isError, bukan throw.
    let rejected = false;
    try {
      const bad = await client.callTool({ name: 'create_transaction', arguments: { amount: -5 } });
      rejected = bad.isError === true;
    } catch {
      rejected = true;
    }
    check('argumen tidak valid ditolak zod', rejected);

    // Tulis, lalu pastikan terlihat lewat API biasa.
    const before = await (await fetch(`${BASE}/api/transactions`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })).json() as unknown[];

    const created = await client.callTool({
      name: 'create_transaction',
      arguments: {
        category_id: catsJson.find((c: { type: string }) => c.type === 'expense').id,
        payment_method_id: 'pm_1',
        transaction_type: 'expense',
        amount: 12345,
        transaction_date: '2026-10-14',
        notes: 'dari test mcp http',
      },
    });
    const createdJson = JSON.parse((created.content as { text: string }[])[0].text);
    check('create_transaction bikin data', createdJson.id?.startsWith('tx_'), createdJson.id);

    const after = await (await fetch(`${BASE}/api/transactions`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })).json() as unknown[];
    check('data terlihat di web/API biasa', after.length === before.length + 1, `${before.length} -> ${after.length}`);

    await fetch(`${BASE}/api/transactions/${createdJson.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwt}` },
    });

    // Kunci dicabut harus langsung ditolak.
    await fetch(`${BASE}/api/mcp-keys/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwt}` },
    });
    let denied = false;
    try {
      const c2 = new Client({ name: 'revoked', version: '1.0.0' });
      await c2.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${key}` } },
      }));
    } catch {
      denied = true;
    }
    check('kunci yang dicabut ditolak', denied);

    await client.close();
  } finally {
    await fetch(`${BASE}/api/mcp-keys/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwt}` },
    });
  }

  if (failed) {
    console.error(`\n${failed} gagal`);
    process.exit(1);
  }
  console.log('\nsemua lulus');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});