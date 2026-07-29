import React, { useState, useEffect } from 'react';
import { X, Trash2, Calendar, DollarSign, Tag, CreditCard, FileText, AlertCircle } from 'lucide-react';
import { Category, PaymentMethod, Transaction, TransactionType } from '../types';
import { getTodayDateString } from '../utils';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    category_id: string;
    payment_method_id: string;
    transaction_type: TransactionType;
    amount: number;
    transaction_date: string;
    notes?: string;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialTransaction?: Transaction | null;
  categories: Category[];
  paymentMethods: PaymentMethod[];
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialTransaction,
  categories,
  paymentMethods,
}) => {
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [transactionDate, setTransactionDate] = useState(getTodayDateString());
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filter categories by type
  const availableCategories = categories.filter((c) => c.type === transactionType);

  useEffect(() => {
    if (initialTransaction) {
      setTransactionType(initialTransaction.transaction_type);
      setTransactionDate(initialTransaction.transaction_date || getTodayDateString());
      setAmount(initialTransaction.amount.toString());
      setCategoryId(initialTransaction.category_id);
      setPaymentMethodId(initialTransaction.payment_method_id);
      setNotes(initialTransaction.notes || '');
    } else {
      // Default new transaction values
      setTransactionType('expense');
      setTransactionDate(getTodayDateString());
      setAmount('');
      setNotes('');

      // Find default payment method "Tunai"
      const tunaiPm = paymentMethods.find((p) => p.name.toLowerCase() === 'tunai');
      setPaymentMethodId(tunaiPm ? tunaiPm.id : paymentMethods[0]?.id || '');

      // Set default category for expense
      const expenseCats = categories.filter((c) => c.type === 'expense');
      setCategoryId(expenseCats[0]?.id || '');
    }
    setError(null);
    setShowConfirmDelete(false);
  }, [initialTransaction, isOpen, categories, paymentMethods]);

  // When type changes, adjust selected category if needed
  const handleTypeChange = (newType: TransactionType) => {
    setTransactionType(newType);
    const validCats = categories.filter((c) => c.type === newType);
    if (validCats.length > 0) {
      setCategoryId(validCats[0].id);
    } else {
      setCategoryId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transactionDate) {
      setError('Tanggal transaksi wajib diisi.');
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Nominal harus lebih besar dari 0.');
      return;
    }

    if (!categoryId) {
      setError('Kategori wajib dipilih.');
      return;
    }

    let pmId = paymentMethodId;
    if (!pmId) {
      const tunaiPm = paymentMethods.find((p) => p.name.toLowerCase() === 'tunai');
      pmId = tunaiPm ? tunaiPm.id : paymentMethods[0]?.id || '';
    }

    setLoading(true);
    setError(null);

    try {
      await onSave({
        id: initialTransaction?.id,
        category_id: categoryId,
        payment_method_id: pmId,
        transaction_type: transactionType,
        amount: numAmount,
        transaction_date: transactionDate,
        notes,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan transaksi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialTransaction || !onDelete) return;

    setDeleting(true);
    try {
      await onDelete(initialTransaction.id);
      setShowConfirmDelete(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus transaksi.');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-base">
            {initialTransaction ? 'Edit Transaksi' : 'Tambah Transaksi'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                transactionType === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                transactionType === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pemasukan
            </button>
          </div>

          {/* Amount (Nominal) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Nominal (Rp) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          {/* Date & Payment Method Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Date */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tanggal <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Metode Pembayaran <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethodId}
                onChange={(e) => setPaymentMethodId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              >
                {paymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-slate-400" /> Kategori <span className="text-rose-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            >
              {availableCategories.length === 0 ? (
                <option value="">Belum ada kategori</option>
              ) : (
                availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Catatan (Opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan catatan singkat..."
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            {initialTransaction && onDelete ? (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Hapus
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog for Deleting Transaction */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xs w-full p-5 space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Hapus Transaksi?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus transaksi ini?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
