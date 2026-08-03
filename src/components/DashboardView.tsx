import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  ReceiptText,
  Calendar,
  CreditCard,
  PlusCircle,
  BookOpen,
  X,
  AlertTriangle,
} from 'lucide-react';
import { DashboardSummary, Transaction } from '../types';
import { api } from '../api';
import { formatIDR, formatDateIndonesian, getMonthYearIndonesian, getPeriodRange, isDateInRange } from '../utils';

type PeriodTab = 'daily' | 'weekly' | 'monthly';

interface DashboardViewProps {
  summary: DashboardSummary | null;
  transactions: Transaction[];
  loading: boolean;
  onEditTransaction: (tx: Transaction) => void;
  onNavigateTransactions: () => void;
  onOpenAddTransaction: () => void;
  onRefresh: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  transactions,
  loading,
  onEditTransaction,
  onNavigateTransactions,
  onOpenAddTransaction,
  onRefresh,
}) => {
  const [period, setPeriod] = React.useState<PeriodTab>('monthly');
  const [isOpeningOpen, setIsOpeningOpen] = React.useState(false);
  const [sourceMonth, setSourceMonth] = React.useState<string>('');
  const [openingLoading, setOpeningLoading] = React.useState(false);
  const [openingError, setOpeningError] = React.useState<string | null>(null);
  const [openingResult, setOpeningResult] = React.useState<{ netBalance: number; targetDate: string; removedCount: number } | null>(null);

  if (loading && !summary) {
    return (
      <div className="space-y-4 py-6 animate-pulse">
        <div className="h-32 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 bg-slate-200 rounded-2xl" />
          <div className="h-24 bg-slate-200 rounded-2xl" />
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  const saldo = summary?.saldo || 0;
  const range = getPeriodRange(period);
  const periodTxs = transactions.filter((tx) => isDateInRange(tx.transaction_date, range.start, range.end));
  const pemasukan = periodTxs
    .filter((tx) => tx.transaction_type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const pengeluaran = periodTxs
    .filter((tx) => tx.transaction_type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const saldoPeriod = pemasukan - pengeluaran;
  const recentTxs = periodTxs.slice().sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));

  const periodLabels: Record<PeriodTab, string> = {
    daily: 'Harian',
    weekly: 'Mingguan',
    monthly: 'Bulanan',
  };
  const periodBadgeLabels: Record<PeriodTab, string> = {
    daily: 'Hari Ini',
    weekly: 'Minggu Ini',
    monthly: getMonthYearIndonesian(),
  };
  const saldoLabel = period === 'daily' ? 'Saldo Hari Ini' : period === 'weekly' ? 'Saldo Minggu Ini' : 'Saldo Bulan Ini';

  const openOpeningModal = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    setSourceMonth(`${y}-${m}`);
    setOpeningError(null);
    setOpeningResult(null);
    setIsOpeningOpen(true);
  };

  const previewNet = sourceMonth
    ? transactions
        .filter((tx) => tx.transaction_date.startsWith(sourceMonth))
        .reduce((sum, tx) => sum + (tx.transaction_type === 'income' ? tx.amount : -tx.amount), 0)
    : 0;

  const handleConfirmOpening = async () => {
    setOpeningLoading(true);
    setOpeningError(null);
    try {
      const res = await api.createOpeningTransaction(sourceMonth);
      setOpeningResult({ netBalance: res.netBalance, targetDate: res.targetDate, removedCount: res.removedCount });
      onRefresh();
    } catch (err) {
      setOpeningError((err as Error).message || 'Gagal membuat transaksi awal.');
    } finally {
      setOpeningLoading(false);
    }
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Month Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-full">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>{periodBadgeLabels[period]}</span>
        </div>
        <button
          onClick={onOpenAddTransaction}
          className="text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" /> Catat Transaksi
        </button>
      </div>

      {/* Period Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium">
        {(['daily', 'weekly', 'monthly'] as PeriodTab[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              period === p
                ? 'bg-white text-slate-800 font-semibold shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Main Balance Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2 flex items-center justify-between">
          <span>{saldoLabel}</span>
          <button
            onClick={openOpeningModal}
            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium px-2 py-0.5 rounded-full tracking-normal normal-case flex items-center gap-1"
          >
            <BookOpen className="w-3 h-3" /> Buka Transaksi Awal
          </button>
        </p>

        <div className="text-4xl sm:text-5xl font-light tracking-tighter text-slate-900 mb-6">
          {formatIDR(saldoPeriod)}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Total Masuk</div>
            <div className="font-semibold text-emerald-600 text-sm">{formatIDR(pemasukan)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Total Keluar</div>
            <div className="font-semibold text-rose-500 text-sm">{formatIDR(pengeluaran)}</div>
          </div>
        </div>
      </div>

      {/* Monthly Summary Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Income Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Pemasukan {periodLabels[period]}</span>
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-medium text-emerald-600 tracking-tight">
            + {formatIDR(pemasukan)}
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Pengeluaran {periodLabels[period]}</span>
            <div className="w-8 h-8 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-medium text-rose-500 tracking-tight">
            - {formatIDR(pengeluaran)}
          </div>
        </div>
      </div>

      {/* Recent Transactions List (5-10) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="font-semibold text-slate-800 text-base">
            Transaksi Terbaru
          </h2>
          <button
            onClick={onNavigateTransactions}
            className="text-xs font-medium text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
          >
            Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTxs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 space-y-2">
            <ReceiptText className="w-10 h-10 mx-auto stroke-1 text-slate-300" />
            <p className="text-xs font-medium">Belum ada transaksi bulan ini</p>
            <button
              onClick={onOpenAddTransaction}
              className="text-xs font-semibold text-emerald-600 underline hover:text-emerald-700"
            >
              Tambah Transaksi Pertama
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTxs.map((tx) => {
              const isIncome = tx.transaction_type === 'income';
              return (
                <div
                  key={tx.id}
                  onClick={() => onEditTransaction(tx)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50/80 -mx-2 px-2 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isIncome ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 text-sm truncate">
                        {tx.category_name}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{formatDateIndonesian(tx.transaction_date)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium text-[10px]">
                          <CreditCard className="w-2.5 h-2.5" />
                          {tx.payment_method_name}
                        </span>
                      </div>
                      {tx.notes && (
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px] mt-0.5">
                          {tx.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`font-bold text-sm ${
                        isIncome ? 'text-emerald-600' : 'text-slate-800'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{formatIDR(tx.amount)}
                    </div>
                    <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 font-medium transition-colors">
                      Edit &gt;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Opening Transaction Modal */}
      {isOpeningOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-base">Buka Transaksi Awal</h3>
              <button
                onClick={() => setIsOpeningOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Sistem akan menghitung sisa saldo dari bulan yang dipilih dan membuat transaksi pemasukan <span className="font-medium text-slate-700">Saldo Awal</span> pada tanggal 1 bulan berikutnya. Jika sudah pernah dibuka, transaksi lama akan diganti.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Pilih Bulan Sumber</label>
              <input
                type="month"
                value={sourceMonth}
                onChange={(e) => {
                  setSourceMonth(e.target.value);
                  setOpeningResult(null);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {sourceMonth && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1">
                <div className="text-[11px] text-slate-500">Perkiraan sisa saldo {sourceMonth}</div>
                <div className={`text-base font-semibold ${previewNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatIDR(previewNet)}
                </div>
              </div>
            )}

            {openingResult && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-xs text-emerald-800 space-y-1">
                <p>Transaksi awal berhasil dibuat tanggal {openingResult.targetDate}.</p>
                <p>Saldo yang dibawa: {formatIDR(openingResult.netBalance)}</p>
                {openingResult.removedCount > 0 && (
                  <p>{openingResult.removedCount} transaksi lama diganti.</p>
                )}
              </div>
            )}

            {openingError && (
              <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-2xl p-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{openingError}</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setIsOpeningOpen(false)}
                className="flex-1 py-2.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmOpening}
                disabled={!sourceMonth || openingLoading}
                className="flex-1 py-2.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 rounded-xl transition-colors"
              >
                {openingLoading ? 'Memproses...' : 'Buka Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
