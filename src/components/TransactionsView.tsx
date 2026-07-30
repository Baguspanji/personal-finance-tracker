import React, { useState } from 'react';
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Calendar,
  Plus,
  Trash2,
  Edit2,
} from 'lucide-react';
import { Transaction } from '../types';
import { formatIDR, formatDateIndonesian } from '../utils';

interface TransactionsViewProps {
  transactions: Transaction[];
  loading: boolean;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  onOpenAddTransaction: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  loading,
  onEditTransaction,
  onDeleteTransaction,
  onOpenAddTransaction,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const filtered = transactions.filter((tx) => {
    // Filter by type
    if (filterType !== 'all' && tx.transaction_type !== filterType) {
      return false;
    }
    // Search by category, payment method or notes
    if (search.trim()) {
      const q = search.toLowerCase();
      const catMatch = tx.category_name?.toLowerCase().includes(q);
      const pmMatch = tx.payment_method_name?.toLowerCase().includes(q);
      const notesMatch = tx.notes?.toLowerCase().includes(q);
      const dateMatch = tx.transaction_date.includes(q);
      return catMatch || pmMatch || notesMatch || dateMatch;
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Daftar Transaksi</h2>
          <p className="text-xs text-slate-400">Kelola riwayat pemasukan dan pengeluaran</p>
        </div>
        <button
          onClick={onOpenAddTransaction}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Transaksi Baru
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white border border-slate-200 rounded-3xl p-3.5 space-y-3 shadow-xs">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari transaksi, catatan, tanggal..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              filterType === 'all'
                ? 'bg-white text-slate-800 font-semibold shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Semua ({transactions.length})
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
              filterType === 'income'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Pemasukan
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
              filterType === 'expense'
                ? 'bg-rose-600 text-white font-semibold shadow-xs'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" /> Pengeluaran
          </button>
        </div>
      </div>

      {/* Transaction List */}
      {loading && transactions.length === 0 ? (
        <div className="space-y-3 py-4 animate-pulse">
          <div className="h-16 bg-slate-200 rounded-2xl" />
          <div className="h-16 bg-slate-200 rounded-2xl" />
          <div className="h-16 bg-slate-200 rounded-2xl" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
          <Filter className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
          <p className="text-sm font-semibold text-slate-700">Tidak ada transaksi ditemukan</p>
          <p className="text-xs text-slate-400">
            {search ? 'Coba gunakan kata kunci pencarian lain' : 'Belum ada data untuk kategori ini'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden">
          {filtered.map((tx) => {
            const isIncome = tx.transaction_type === 'income';
            return (
              <div
                key={tx.id}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors group"
              >
                <div
                  onClick={() => onEditTransaction(tx)}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
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

                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-sm truncate">
                        {tx.category_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDateIndonesian(tx.transaction_date)}
                      </span>
                      <span>•</span>
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium text-[10px] flex items-center gap-0.5">
                        <CreditCard className="w-2.5 h-2.5" />
                        {tx.payment_method_name}
                      </span>
                    </div>

                    {tx.notes && (
                      <p className="text-[11px] text-slate-500 mt-1 truncate">
                        {tx.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div
                    onClick={() => onEditTransaction(tx)}
                    className="text-right cursor-pointer mr-1"
                  >
                    <div
                      className={`font-bold text-sm ${
                        isIncome ? 'text-emerald-600' : 'text-slate-800'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{formatIDR(tx.amount)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onEditTransaction(tx)}
                      title="Edit"
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteTransaction(tx)}
                      title="Hapus"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
