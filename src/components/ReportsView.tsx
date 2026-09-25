import React from 'react';
import { PieChart as PieIcon, Calendar } from 'lucide-react';
import { Transaction } from '../types';
import { formatIDR, getMonthYearIndonesian } from '../utils';
import { CashflowChart } from './CashflowChart';
import { MonthField } from './DateFields';

interface ReportsViewProps {
  transactions: Transaction[];
  loading: boolean;
}

const PALETTE = [
  '#10b981', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#ef4444', '#6366f1', '#84cc16',
  '#06b6d4', '#a855f7',
];

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, rOuter: number, rInner: number, start: number, end: number) {
  const large = end - start <= 180 ? 0 : 1;
  const o1 = polar(cx, cy, rOuter, start);
  const o2 = polar(cx, cy, rOuter, end);
  const i1 = polar(cx, cy, rInner, end);
  const i2 = polar(cx, cy, rInner, start);
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${i2.x} ${i2.y}`,
    'Z',
  ].join(' ');
}

export const ReportsView: React.FC<ReportsViewProps> = ({ transactions, loading }) => {
  const [month, setMonth] = React.useState<string>(currentMonth());
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const filtered = React.useMemo(
    () =>
      transactions.filter(
        (t) => t.transaction_type === 'expense' && t.transaction_date.startsWith(month)
      ),
    [transactions, month]
  );

  const grouped = React.useMemo(() => {
    const map = new Map<string, { name: string; amount: number }>();
    filtered.forEach((t) => {
      const name = t.category_name || 'Lainnya';
      const cur = map.get(name) || { name, amount: 0 };
      cur.amount += t.amount;
      map.set(name, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  const total = grouped.reduce((s, g) => s + g.amount, 0);

  let angle = 0;
  const slices = grouped.map((g, i) => {
    const start = angle;
    const sweep = total > 0 ? (g.amount / total) * 360 : 0;
    angle += sweep;
    return { ...g, start, end: start + sweep, color: PALETTE[i % PALETTE.length] };
  });

  const [y, m] = month.split('-');
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })
    .format(new Date(Number(y), Number(m) - 1, 1));

  const displaySlice = activeIndex !== null ? slices[activeIndex] : null;

  return (
    <div className="space-y-4 pb-24 lg:pb-10">
      <div>
        <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Laporan Pengeluaran</h2>
        <p className="text-xs text-slate-400">Arus kas dan rincian pengeluaran per kategori</p>
      </div>

      {/* Cashflow Trend */}
      <CashflowChart transactions={transactions} loading={loading} />

      {/* Month Selector */}
      <div className="bg-white border border-slate-200 rounded-3xl p-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400 ml-1" />
          <MonthField
            value={month}
            onChange={(v) => {
              setMonth(v || currentMonth());
              setActiveIndex(null);
            }}
            placeholder="Pilih bulan"
          />
        </div>
      </div>

      {loading && filtered.length === 0 ? (
        <div className="space-y-3 py-4 animate-pulse">
          <div className="h-64 bg-slate-200 rounded-3xl" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
          <PieIcon className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
          <p className="text-sm font-semibold text-slate-700">Belum ada pengeluaran {monthLabel}</p>
          <p className="text-xs text-slate-400">Pilih bulan lain atau tambah transaksi pengeluaran.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-5 md:items-start">
          {/* Donut Chart */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col items-center md:col-span-2 md:sticky md:top-20">
            <svg viewBox="0 0 200 200" className="w-full max-w-[220px] md:max-w-[260px]">
              {total > 0 &&
                slices.map((s, i) => (
                  <path
                    key={s.name}
                    d={arcPath(100, 100, 90, 56, s.start, s.end)}
                    fill={s.color}
                    className="transition-opacity duration-150"
                    style={{ opacity: activeIndex === null || activeIndex === i ? 1 : 0.35, cursor: 'pointer' }}
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseLeave={() => setActiveIndex(null)}
                  />
                ))}
              <text
                x="100"
                y="92"
                textAnchor="middle"
                className="fill-slate-400"
                style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}
              >
                {displaySlice ? displaySlice.name : 'Total'}
              </text>
              <text
                x="100"
                y="112"
                textAnchor="middle"
                className="fill-slate-900"
                style={{ fontSize: displaySlice && displaySlice.amount >= 1_000_000 ? '14px' : '16px', fontWeight: 700 }}
              >
                {formatIDR(displaySlice ? displaySlice.amount : total)}
              </text>
            </svg>
            <p className="text-[11px] text-slate-400 mt-1">Total Pengeluaran {monthLabel}</p>
          </div>

          {/* Legend / List */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-2 md:col-span-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
              <h3 className="font-semibold text-slate-800 text-sm">Rincian Kategori</h3>
              <span className="text-[11px] text-slate-400">{grouped.length} kategori</span>
            </div>
            <div className="divide-y divide-slate-100">
              {slices.map((s, i) => (
                <div
                  key={s.name}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={`py-2.5 flex items-center justify-between gap-3 rounded-xl px-2 -mx-2 transition-colors ${
                    activeIndex === i ? 'bg-slate-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-sm font-medium text-slate-700 truncate">{s.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-slate-800">{formatIDR(s.amount)}</div>
                    <div className="text-[11px] text-slate-400">
                      {total > 0 ? ((s.amount / total) * 100).toFixed(1) : '0'}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
