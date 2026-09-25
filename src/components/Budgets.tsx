import React from 'react';
import { PiggyBank, TriangleAlert, X, Trash2, Pencil, Check } from 'lucide-react';
import { Budget, Category, Transaction } from '../types';
import { api } from '../api';
import { formatIDR, formatIDRShort, getCategorySpending, getCurrentMonthKey, getMonthYearIndonesian } from '../utils';

interface BudgetOverviewProps {
  budgets: Budget[];
  transactions: Transaction[];
  onManage: () => void;
}

export const BudgetOverview: React.FC<BudgetOverviewProps> = ({ budgets, transactions, onManage }) => {
  const monthKey = getCurrentMonthKey();
  const spending = React.useMemo(
    () => getCategorySpending(transactions, monthKey),
    [transactions, monthKey]
  );

  if (budgets.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-5 shadow-xs flex items-center gap-4">
        <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
          <PiggyBank className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-800 text-sm">Budget Bulanan</h3>
          <p className="text-xs text-slate-400">Atur batas belanja per kategori agar tidak kebablasan.</p>
        </div>
        <button
          onClick={onManage}
          className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl transition-colors shrink-0"
        >
          Atur Budget
        </button>
      </div>
    );
  }

  const rows = budgets
    .map((b) => {
      const spent = spending.get(b.category_id) || 0;
      return {
        ...b,
        spent,
        pct: b.amount > 0 ? (spent / b.amount) * 100 : 0,
      };
    })
    .sort((a, b) => b.pct - a.pct);

  const overCount = rows.filter((r) => r.pct >= 100).length;
  const shown = rows.slice(0, 4);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 text-base flex items-center gap-1.5">
            <PiggyBank className="w-4 h-4 text-emerald-600" /> Budget {getMonthYearIndonesian()}
          </h3>
          {overCount > 0 ? (
            <p className="text-xs text-rose-500 font-medium flex items-center gap-1 mt-0.5">
              <TriangleAlert className="w-3.5 h-3.5" />
              {overCount} dari {rows.length} budget terlampaui
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5">
              {rows.length} kategori terpantau
            </p>
          )}
        </div>
        <button
          onClick={onManage}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors"
        >
          Kelola
        </button>
      </div>

      <div className="space-y-2.5">
        {shown.map((r) => {
          const over = r.pct >= 100;
          const warn = !over && r.pct >= 80;
          return (
            <div key={r.category_id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-700 truncate">
                  {r.category_name || 'Kategori'}
                </span>
                <span className={`font-semibold ${over ? 'text-rose-600' : 'text-slate-500'}`}>
                  {formatIDRShort(r.spent)} / {formatIDRShort(r.amount)}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    over ? 'bg-rose-500' : warn ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(r.pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface BudgetModalProps {
  isOpen: boolean;
  budgets: Budget[];
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

function parseAmountInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  const num = Number(digits);
  return num > 0 ? num : null;
}

function formatAmountInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('id-ID').format(Number(digits));
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  budgets,
  categories,
  onClose,
  onSaved,
}) => {
  const budgetMap = React.useMemo(
    () => new Map(budgets.map((b) => [b.category_id, b])),
    [budgets]
  );
  const sortedBudgets = React.useMemo(
    () => [...budgets].sort((a, b) => (a.category_name || '').localeCompare(b.category_name || '')),
    [budgets]
  );
  const unbudgeted = React.useMemo(
    () =>
      categories
        .filter((c) => c.type === 'expense' && !budgetMap.has(c.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories, budgetMap]
  );

  const [newCatId, setNewCatId] = React.useState('');
  const [newAmount, setNewAmount] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editAmount, setEditAmount] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setNewCatId('');
      setNewAmount('');
      setEditingId(null);
      setEditAmount('');
      setBusy(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = async () => {
    if (!newCatId) {
      setError('Pilih kategori terlebih dahulu.');
      return;
    }
    const num = parseAmountInput(newAmount);
    if (num === null) {
      setError('Nominal budget harus lebih besar dari 0.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.setBudget(newCatId, num);
      setNewCatId('');
      setNewAmount('');
      onSaved();
    } catch (err) {
      setError((err as Error).message || 'Gagal menyimpan budget.');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (categoryId: string) => {
    setEditingId(categoryId);
    setEditAmount(String(budgetMap.get(categoryId)?.amount || ''));
    setError(null);
  };

  const handleSaveEdit = async (categoryId: string) => {
    const num = parseAmountInput(editAmount);
    if (num === null) {
      setError('Nominal budget harus lebih besar dari 0.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.setBudget(categoryId, num);
      setEditingId(null);
      onSaved();
    } catch (err) {
      setError((err as Error).message || 'Gagal menyimpan budget.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.deleteBudget(categoryId);
      if (editingId === categoryId) setEditingId(null);
      onSaved();
    } catch (err) {
      setError((err as Error).message || 'Gagal menghapus budget.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md sm:max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Kelola Budget Bulanan</h3>
            <p className="text-xs text-slate-400">Batas belanja per kategori, berlaku setiap bulan</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3">
            {error}
          </div>
        )}

        {/* Add budget */}
        {unbudgeted.length > 0 ? (
          <div className="flex items-center gap-2">
            <select
              value={newCatId}
              onChange={(e) => setNewCatId(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            >
              <option value="">Pilih kategori...</option>
              {unbudgeted.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="relative w-32 shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={formatAmountInput(newAmount)}
                onChange={(e) => setNewAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={busy}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 shrink-0"
            >
              Tambah
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center">
            Semua kategori pengeluaran sudah memiliki budget.
          </p>
        )}

        {/* Budget cards */}
        {sortedBudgets.length === 0 ? (
          <div className="text-center py-6 text-slate-400 space-y-2">
            <PiggyBank className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
            <p className="text-xs">Belum ada budget. Tambahkan lewat form di atas.</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {sortedBudgets.map((b) => {
              const isEditing = editingId === b.category_id;
              return (
                <div
                  key={b.category_id}
                  className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <PiggyBank className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-800 text-sm truncate">
                      {b.category_name || 'Kategori'}
                    </div>
                    {isEditing ? (
                      <div className="relative mt-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          Rp
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoFocus
                          value={formatAmountInput(editAmount)}
                          onChange={(e) => setEditAmount(e.target.value.replace(/\D/g, ''))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(b.category_id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="w-full pl-7 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                        />
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500">
                        {formatIDR(b.amount)}/bln
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleSaveEdit(b.category_id)}
                        disabled={busy}
                        title="Simpan"
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        title="Batal"
                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(b.category_id)}
                        title="Edit budget"
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(b.category_id)}
                        disabled={busy}
                        title="Hapus budget"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
