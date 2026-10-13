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
- Path alias `@/*` → root repo (dikonfigurasi di `vite.config.ts` + `tsconfig.json`)

## Commands

```bash
npm run dev        # tsx server.ts — Express + Vite middlewareMode (HMR aktif)
npm run build      # vite build + esbuild server.ts → dist/server.cjs
npm start          # node dist/server.cjs — butuh NODE_ENV=production
npm run lint       # tsc --noEmit (type-check, bukan eslint)
npm run db:migrate # jalankan database/schema.sql + seeder.sql (DESTRUKTIF)
npm run test:api   # script assert manual vs server di TEST_API_URL (default :3000)
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
- `requireAuth` menerima Bearer **atau** cookie `token` — jangan ganggu salah satunya.
- Cookie: `httpOnly`, `secure` hanya saat `NODE_ENV=production`.
- Client juga simpan token di `localStorage` (`finance_tracker_token`), dikirim sebagai Bearer. 401 dari server → `removeToken()` di `fetchApi`.
- `JWT_SECRET` jatuh ke default `'finance_tracker_jwt_secret_2026'` kalau env kosong. **Default ini tidak aman** — pastikan `JWT_SECRET` di-set saat deploy, jangan dihapus fallback-nya tanpa menyertakan env.
- Saat ini **belum ada scoping per user** di query (semua user lihat data yang sama). Jangan ikut menambah atau menghapusnya tanpa diminta.

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