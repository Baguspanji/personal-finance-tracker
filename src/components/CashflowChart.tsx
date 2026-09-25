import React from 'react';
import { ChartColumn } from 'lucide-react';
import { Transaction } from '../types';
import { formatIDR, formatIDRShort, getMonthlyCashflow } from '../utils';

interface CashflowChartProps {
  transactions: Transaction[];
  loading: boolean;
}

const W = 560;
const H = 250;
const PLOT_TOP = 14;
const PLOT_BOTTOM = 208;
const PLOT_LEFT = 10;
const PLOT_RIGHT = 550;

export const CashflowChart: React.FC<CashflowChartProps> = ({ transactions, loading }) => {
  const [months, setMonths] = React.useState<6 | 12>(6);

  const data = React.useMemo(
    () => getMonthlyCashflow(transactions, months),
    [transactions, months]
  );
  const maxV = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  const plotH = PLOT_BOTTOM - PLOT_TOP;
  const plotW = PLOT_RIGHT - PLOT_LEFT;
  const slot = plotW / data.length;
  const barW = Math.min(30, slot / 2 - 6);

  const totalIn = data.reduce((s, d) => s + d.income, 0);
  const totalOut = data.reduce((s, d) => s + d.expense, 0);

  if (loading && transactions.length === 0) {
    return <div className="h-64 bg-slate-200 rounded-3xl animate-pulse" />;
  }

  const gridSteps = [0.25, 0.5, 0.75, 1];

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-800 text-base flex items-center gap-1.5">
            <ChartColumn className="w-4 h-4 text-emerald-600" /> Arus Kas
          </h3>
          <p className="text-xs text-slate-400">Pemasukan vs pengeluaran per bulan</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
          {([6, 12] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                months === m
                  ? 'bg-white text-slate-800 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {m} bln
            </button>
          ))}
        </div>
      </div>

      {/* Legend + totals */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-slate-600">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          Masuk <strong className="text-emerald-600">{formatIDRShort(totalIn)}</strong>
        </span>
        <span className="flex items-center gap-1.5 text-slate-600">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
          Keluar <strong className="text-rose-500">{formatIDRShort(totalOut)}</strong>
        </span>
        <span className="ml-auto text-slate-400">
          Neto <strong className={totalIn - totalOut >= 0 ? 'text-emerald-600' : 'text-rose-500'}>
            {totalIn - totalOut >= 0 ? '+' : '-'}{formatIDRShort(Math.abs(totalIn - totalOut))}
          </strong>
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Grafik arus kas">
        {gridSteps.map((f) => {
          const y = PLOT_BOTTOM - plotH * f;
          return (
            <g key={f}>
              <line x1={PLOT_LEFT} y1={y} x2={PLOT_RIGHT} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={PLOT_RIGHT} y={y - 3} textAnchor="end" style={{ fontSize: '9px', fill: '#94a3b8' }}>
                {formatIDRShort(maxV * f)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const cx = PLOT_LEFT + slot * i + slot / 2;
          const inH = (d.income / maxV) * plotH;
          const outH = (d.expense / maxV) * plotH;
          return (
            <g key={d.key}>
              <rect
                x={cx - barW - 3}
                y={PLOT_BOTTOM - inH}
                width={barW}
                height={Math.max(inH, 2)}
                rx="4"
                fill="#10b981"
              >
                <title>{`${d.fullLabel} — Masuk: ${formatIDR(d.income)}`}</title>
              </rect>
              <rect
                x={cx + 3}
                y={PLOT_BOTTOM - outH}
                width={barW}
                height={Math.max(outH, 2)}
                rx="4"
                fill="#f43f5e"
              >
                <title>{`${d.fullLabel} — Keluar: ${formatIDR(d.expense)}`}</title>
              </rect>
              <text
                x={cx}
                y={PLOT_BOTTOM + 16}
                textAnchor="middle"
                style={{ fontSize: months === 12 ? '8px' : '10px', fill: '#64748b', fontWeight: 600 }}
              >
                {d.label}
              </text>
            </g>
          );
        })}
        <line x1={PLOT_LEFT} y1={PLOT_BOTTOM} x2={PLOT_RIGHT} y2={PLOT_BOTTOM} stroke="#e2e8f0" strokeWidth="1" />
      </svg>
    </div>
  );
};
