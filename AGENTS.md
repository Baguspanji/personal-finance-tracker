# AGENTS.md

Personal Finance Tracker — mobile-first PWA pencatat keuangan (income/expense, budget, reports).
Semua teks UI, pesan error, dan nama kategori berbahasa **Indonesia**. Ikuti.

## Stack

- **Server**: Express 4 (`server.ts`, single file) + `tsx` runner, port **3000** hardcoded
- **Client**: React 19 + Vite 6 + Tailwind CSS 4 (via `@tailwindcss/vite`, bukan config file)
- **DB**: MySQL 8 (`mysql2/promise`), **fallback ke JSON file** (`data_db.json`)
- **Auth**: JWT (`jsonwebtoken`) + bcrypt, dual delivery: `Authorization: Bearer` ATAU cookie `token`
- **Chart**: digambar manual dengan SVG (`CashflowChart.tsx`, `ReportsView.tsx`) — bukan library chart
- **Icons**: `lucide-react`, **animasi**: `motion`, **tanggal**: `react-datepicker` (theme di `src/index.css`)
- **MCP**: `@modelcontextprotocol/sdk` + `zod` — definisi tool di `mcp/tools.ts`, expose lewat HTTP (`POST /mcp`) dan stdio (`mcp/server.ts`), read + create saja (lihat bagian MCP)
- Path alias `@/*` → root repo (dikonfigurasi di `vite.config.ts` + `tsconfig.json`)

## Commands

```bash
npm run dev          # tsx server.ts — Express + Vite middlewareMode (HMR aktif)
npm run build        # vite build + esbuild server.ts → dist/server.cjs
npm start            # node dist/server.cjs — butuh NODE_ENV=production
npm run lint         # tsc --noEmit (type-check, bukan eslint)
npm run db:migrate   # jalankan database/schema.sql + seeder.sql (DESTRUKTIF)
npm run db:mcp-keys  # CREATE TABLE mcp_keys (aditif, aman diulang)
npm run db:user-scope # tambah user_id ke budgets+transactions, klaim data lama ke usr_1 (aditif)
npm run mcp          # MCP server stdio (butuh FINANCE_MCP_KEY) — untuk client yang tidak mendukung remote
npm run test:api     # script assert manual vs server di TEST_API_URL (default :3000)
npm run test:mcp     # 11 assert MCP over HTTP: handshake, 9 tool, zod, tulis data, revoke kunci
```

Belum ada test framework, belum ada eslint/prettier config, belum ada CI.

## Arsitektur

```
server.ts              # semua route Express + auth middleware + static/Vite
server/mysql-db.ts     # layer data: MySQL query, try/catch → fallback ke JSON db
server/db.ts           # JsonDB — implementasi in-memory + persist ke data_db.json
database/config.ts     # dbConfig dari env, dengan default hardcoded
database/schema.sql    # DDL (DROP TABLE di awal = destruktif)
database/seeder.sql    # data demo, user@finance.com / password123
src/api.ts             # fetchApi wrapper + token localStorage + objek `api`
src/types.ts           # interface shared FE/BE (duplikat dari server/db.ts)
src/utils.ts           # formatIDR, format tanggal, aggregasi cashflow/bulanan
src/App.tsx            # SEMUA state global + tab switching (tidak ada router)
src/components/*.tsx   # view per tab + modal
database/mcp-keys.sql  # tabel mcp_keys (ADITIF — bukan DROP, aman diulang)
mcp/tools.ts          # definisi 9 tool MCP, dipakai stdio + HTTP
mcp/server.ts         # MCP stdio server (read + create lewat HTTP API)
tests/test-mcp-http.ts  # assert MCP over HTTP (butuh server jalan di :3000)
tests/test-api.ts      # smoke test endpoint via fetch
```

## Konvensi penting

### Ganti route = 3 file
Route baru butuh perubahan di: `server.ts` (handler + validasi) → `server/mysql-db.ts` (query + fallback) → `src/api.ts` (method client) → `src/types.ts` bila ada tipe baru. Lupa satu = tidak ada error compile, hanya runtime.

### Dual-DB fallback adalah pola wajib
Setiap fungsi di `server/mysql-db.ts` berstruktur:
```ts
try { /* mysql2 query */ } catch (err) { console.warn(...); return jsonDb.xxx(); }
```
- Query **wajib** pakai prepared statement (`p.execute(sql, [params])`). Tidak ada input mentah.
- Tanggal MySQL → `new Date(r.created_at).toISOString()` sebelum dikembalikan (konsistensi bentuk dengan JSON db).
- `amount` dari DECIMAL → `CAST(amount AS DOUBLE)` lalu `Number(...)`.
- Boolean `is_opening` TINYINT → `Boolean(...)` di mapper.
- Don't "perbaiki" fallback jadi error — itu disengaja, `initMySQL()` sudah menoleransi DB mati.

### Format kolom konsisten
`server.ts` mengembalikan **field mentah** (`category_id`), bukan joined. `category_name` / `payment_method_name` di-<join> di `server/mysql-db.ts` lewat SQL `LEFT JOIN ... COALESCE(...)`, atau di-map manual di fallback JSON. `src/types.ts` menandai keduanya opsional karena JSON path bisa kosong.

### Validasi di server, bukan cuma UI
Handler di `server.ts` melakukan cek manual + `res.status(4xx).json({ error: '...' })`. Contoh pola yang sudah dipakai:
- `if (!name || typeof name !== 'string' || !name.trim())` → 400
- `const numAmount = Number(amount); if (isNaN(numAmount) || numAmount <= 0)` → 400
- enum dicek eksplisit: `type !== 'income' && type !== 'expense'`
Hapus kategori / payment method yang masih dipakai transaksi harus **ditolak** (dicek manual di layer db, bukan FK). Jangan diedarkan.

### Domain: opening balance
`is_opening: true` menandai transaksi carry-over saldo. `POST /api/opening-transactions` dengan `{ sourceMonth: 'YYYY-MM' }`:
1. hitung net bulan itu → `getMonthlyNetBalance`
2. tanggal target = tanggal 1 bulan berikutnya
3. hapus dulu opening lama di tanggal tersebut (idempoten, `removedCount`)
4. buat transaksi income/expense kategori `Saldo Awal`

Aturan penting: **opening balance bukan arus kas**. `utils.ts` (`getMonthlyCashflow`, `getCategorySpending`) dan progress budget **skip `is_opening`**. Jangan dihapus skip itu — itu yang bikin chart dan budget benar.

### ID
Format existing: `tx_`, `cat_`, `pm_`, `bud_`, `usr_` + suffix. MySQL path pakai `Date.now()` + random; JSON path pakai `generateId()`. Ikuti format yang ada, jangan ganti ke UUID tanpa alasan.

### Auth
- `requireAuth` menerima **tiga** bentuk token, berurutan: cookie `token` / header `Bearer`, lalu:
  - JWT biasa → `req.userId` dari payload.
  - Kunci MCP (prefix `mcp_`) → `mysqlDb.resolveMcpKey()` lookup sha256 di `mcp_keys`, tolak kalau revoked. `requireAuth` jadi `async`, jangan balikkan.
- Kunci MCP dibuat dari Sidebar → **Kunci MCP**. Format `mcp_<32 byte base64url>`. Hanya sha256 yang disimpan; plaintext dikembalikan sekali di response pembuatan dan tidak bisa dilihat lagi. Revoke = set `revoked_at` (soft delete, tidak dihapus).
- Cookie: `httpOnly`, `secure` hanya saat `NODE_ENV=production`.
- Client juga simpan token di `localStorage` (`finance_tracker_token`), dikirim sebagai Bearer. 401 dari server → `removeToken()` di `fetchApi`.
- `JWT_SECRET` jatuh ke default `'finance_tracker_jwt_secret_2026'` kalau env kosong. **Default ini tidak aman** — pastikan `JWT_SECRET` di-set saat deploy, jangan dihapus fallback-nya tanpa menyertakan env.
- `budgets` dan `transactions` **sudah scoped per user** (`user_id`, FK ke `users` dengan `ON DELETE CASCADE`). Semua fungsi di `server/mysql-db.ts` yang menyentuh dua tabel itu menerima `userId` sebagai argumen pertama — jangan tambah/ubah salah satunya tanpa menyesuaikan pemanggilnya di `server.ts`. `categories` dan `payment_methods` sengaja **global**; karena itu cek "sedang dipakai?" saat delete tetap global, bukan per user.

### MCP
Definisi tool ada di **`mcp/tools.ts`** (`createFinanceMcpServer({ baseUrl, authorization })`) dan dipakai dua transport:

| Transport | File | Dipakai saat |
|---|---|---|
| Streamable HTTP | route `POST /mcp` di `server.ts` | client mendukung remote MCP — **default** |
| stdio | `mcp/server.ts` | editor yang cuma bisa menjalankan proses lokal |

Keduanya bungkus API HTTP yang sudah ada — jangan tulis ulang logic data di sini. Tool read: `list_transactions`, `get_summary`, `list_categories`, `list_payment_methods`, `list_budgets`. Tool create: `create_transaction`, `create_category`, `create_payment_method`, `set_budget`. Delete sengaja tidak di-expose dulu.

Detail route `/mcp`:
- Pakai `requireAuth` yang sama dengan `/api/*`, jadi JWT **atau** kunci `mcp_...` sama-sama sah. Header `Authorization` diteruskan apa adanya ke API internal.
- Cookie **tidak** diterima di `/mcp` — client AI selalu pakai header. Tanpa header → 401.
- Satu `McpServer` + satu transport **per request** (`sessionIdGenerator: undefined`, `enableJsonResponse: true`). Stateless, jadi tidak ada state yang bisa bocor antar user. Jangan diubah ke session stateful tanpa ada kebutuhan resumable.
- Panggil API internal lewat `http://127.0.0.1:${PORT}`, **bukan `localhost`** — server listen di `0.0.0.0` (IPv4) sedangkan `localhost` bisa resolve ke `::1`.

Registrasi sebagai remote di `opencode.json`:
```json
{
  "mcp": {
    "finance": {
      "type": "remote",
      "url": "http://localhost:3000/mcp",
      "enabled": true,
      "oauth": false,
      "headers": { "Authorization": "Bearer mcp_..." }
    }
  }
}
```

Kalau masih pakai stdio:
```json
{
  "mcp": {
    "finance": {
      "type": "local",
      "command": ["npx", "tsx", "mcp/server.ts"],
      "environment": { "FINANCE_MCP_KEY": "mcp_..." },
      "enabled": true
    }
  }
}
```

### Frontend
- **Tanpa react-router**. Navigasi = `activeTab` state di `App.tsx`. Tab type di `BottomNav.tsx`: `dashboard | transactions | categories | reports`.
- **Semua data di-load sekali** di `loadAppData()` (`Promise.all` 5 endpoint), lalu di-refresh penuh setelah setiap mutasi. Jangan tambah fetching per-komponen atau state management library.
- View = komponen presentasional menerima props data + callback. `DashboardView` boleh memanggil `api` langsung (opening balance), sebagian besar tidak.
- Props: named export, `interface XxxProps` di atas komponen, destructure di body.
-Styling: Tailwind utility inline. Palet: `slate` untuk struktur/teks, `emerald` untuk income/aksi positif, `red`/`rose` untuk expense. Mobile `max-w-md`, tablet `md:max-w-3xl`, desktop `xl:max-w-6xl` + sidebar `lg:pl-64`.
- Angka uang **selalu** lewat `formatIDR()` atau `formatIDRShort()` dari `src/utils.ts`. Jangan `toLocaleString()` langsung.
- Tanggal API **selalu** string `YYYY-MM-DD` (bukan `Date` object) — slicing `startsWith('YYYY-MM')` diandalkan banyak tempat.
- Ikon dari `lucide-react`, bukan emoji.

### PWA
`public/sw.js` + `public/manifest.json`. Di produksi `server.ts` set `Cache-Control: no-store` untuk `sw.js`, `immutable` untuk `dist/assets/*` (filename ber-hash), `no-cache` untuk `index.html`. Jangan ganggu header ini tanpa alasan.

## Gotcha

- `package.json` masih bernama `react-example` — sisa template Google AI Studio. Tidak penting, tapi jangan ikut rename tanpa diminta.
- `database/schema.sql` diawali `DROP TABLE IF EXISTS` → `npm run db:migrate` **menghapus semua data**. Migration adalah replace, bukan upgrade.
- **`MYSQL_DATABASE` tidak mengarahkan `db:migrate`.** `migrate.ts` connect tanpa memilih database dan `schema.sql` hardcode `USE personal_finance`, jadi override env diabaikan — menjalankan `db:migrate` "untuk tes" tetap menghapus DB asli. Butuh DB lewat? Pakai `db:mcp-keys` atau `db:user-scope`, keduanya aditif.
- Pemulihan data yang terhapus: MySQL di host ini jalan di Colima VM (`log_bin=ON`, `ROW`). `mysqlbinlog` bisa di-install di VM (`apt-get install mysql-client-8.0` **tidak** cukup — butuh `mysql-server-core-8.0`). Datadir hanya terlihat lewat `/proc/<pid>/root/var/lib/mysql`. Replay row event, bukan seluruh binlog — file itu jadi 170MB berisi event database lain.
- `database/mcp-keys.sql` sengaja **tidak** destructive dan terpisah dari `schema.sql`, supaya tabel baru bisa ditambah tanpa kehilangan data. Ikuti pola ini untuk tabel berikutnya.
- `mcp_keys` menyimpan sha256 kunci. Kalau `data_db.json` (yang tidak di-ignore) sudah punya isi `mcp_keys`, perlakukan sebagai rahasia — jangan di-commit.
- `src/components/Budgets.tsx` dan `DateFields.tsx` tidak diekspor lewat `App.tsx` langsung — dipakai di dalam `DashboardView` / `TransactionFormModal`.
- `server/db.ts` bukan kode mati: itu fallback runtime. Dijaga sinkron dengan `server/mysql-db.ts` saat menambah field.
- `data_db.json` ada di repo root dan **tidak** di-ignore. Berisi data lokal; jangan di-commit setelah diubah manual.
- `tsx` dipakai, tapi `bun.lock` ada di repo. Pakai npm kecuali diminta lain.

## Sebelum selesai

```bash
npm run lint          # wajib lolos
npm run build         # wajib lolos
```
Verifikasi juga perubahan endpoint secara manual atau `npm run test:api` dengan server jalan.