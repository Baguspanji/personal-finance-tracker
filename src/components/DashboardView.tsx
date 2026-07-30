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
} from 'lucide-react';
import { DashboardSummary, Transaction } from '../types';
import { formatIDR, formatDateIndonesian, getMonthYearIndonesian } from '../utils';

interface DashboardViewProps {
  summary: DashboardSummary | null;
  loading: boolean;
  onEditTransaction: (tx: Transaction) => void;
  onNavigateTransactions: () => void;
  onOpenAddTransaction: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  loading,
  onEditTransaction,
  onNavigateTransactions,
  onOpenAddTransaction,
}) => {
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
  const pemasukan = summary?.pemasukanBulanIni || 0;
  const pengeluaran = summary?.pengeluaranBulanIni || 0;
  const recentTxs = summary?.transaksiTerbaru || [];

  return (
    <div className="space-y-5 pb-24">
      {/* Month Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-full">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>{getMonthYearIndonesian()}</span>
        </div>
        <button
          onClick={onOpenAddTransaction}
          className="text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" /> Catat Transaksi
        </button>
      </div>

      {/* Main Balance Card (Saldo Saat Ini) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2 flex items-center justify-between">
          <span>Saldo Saat Ini</span>
          <span className="text-[10px] bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded-full tracking-normal normal-case">
            Terkini
          </span>
        </p>

        <div className="text-4xl sm:text-5xl font-light tracking-tighter text-slate-900 mb-6">
          {formatIDR(saldo)}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Total Masuk</div>
            <div className="font-semibold text-emerald-600 text-sm">{formatIDR(summary ? summary.pemasukanBulanIni : 0)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Total Keluar</div>
            <div className="font-semibold text-rose-500 text-sm">{formatIDR(summary ? summary.pengeluaranBulanIni : 0)}</div>
          </div>
        </div>
      </div>

      {/* Monthly Summary Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Income Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Pemasukan Bulan Ini</span>
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
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Pengeluaran Bulan Ini</span>
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
    </div>
  );
};
