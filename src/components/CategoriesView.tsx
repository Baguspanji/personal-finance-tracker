import React, { useState } from 'react';
import { Tag, Plus, Edit2, Trash2, TrendingUp, TrendingDown, AlertCircle, Check } from 'lucide-react';
import { Category, TransactionType } from '../types';
import { api } from '../api';

interface CategoriesViewProps {
  categories: Category[];
  loading: boolean;
  onRefreshCategories: () => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  loading,
  onRefreshCategories,
}) => {
  const [typeTab, setTypeTab] = useState<TransactionType>('expense');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<TransactionType>('expense');
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === typeTab);

  const handleOpenAdd = () => {
    setEditingCat(null);
    setCatName('');
    setCatType(typeTab);
    setErrorMessage(null);
    setSuccessMessage(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatType(cat.type);
    setErrorMessage(null);
    setSuccessMessage(null);
    setModalOpen(true);
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setErrorMessage('Nama kategori wajib diisi.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (editingCat) {
        await api.updateCategory(editingCat.id, catName.trim(), catType);
        setSuccessMessage('Kategori berhasil diperbarui!');
      } else {
        await api.createCategory(catName.trim(), catType);
        setSuccessMessage('Kategori baru berhasil ditambahkan!');
      }
      onRefreshCategories();
      setTimeout(() => {
        setModalOpen(false);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan kategori.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setErrorMessage(null);

    try {
      await api.deleteCategory(deleteTarget.id);
      setSuccessMessage(`Kategori "${deleteTarget.name}" berhasil dihapus.`);
      setDeleteTarget(null);
      onRefreshCategories();
    } catch (err: any) {
      // PRD Validation Error Display
      setErrorMessage(
        err.message ||
          'Kategori masih digunakan oleh transaksi. Pindahkan transaksi ke kategori lain sebelum menghapus kategori ini.'
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Manajemen Kategori</h2>
          <p className="text-xs text-slate-400">Kelola kategori pemasukan & pengeluaran</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Kategori Baru
        </button>
      </div>

      {/* Alert Messages */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-start gap-2 animate-shake">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl text-xs font-medium">
        <button
          onClick={() => setTypeTab('expense')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            typeTab === 'expense'
              ? 'bg-rose-600 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingDown className="w-4 h-4" /> Pengeluaran ({categories.filter((c) => c.type === 'expense').length})
        </button>
        <button
          onClick={() => setTypeTab('income')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            typeTab === 'income'
              ? 'bg-emerald-600 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Pemasukan ({categories.filter((c) => c.type === 'income').length})
        </button>
      </div>

      {/* Category List */}
      <div className="bg-white border border-slate-200 rounded-3xl p-2 shadow-xs">
        {loading && categories.length === 0 ? (
          <div className="space-y-2 p-3 animate-pulse">
            <div className="h-10 bg-slate-100 rounded-xl" />
            <div className="h-10 bg-slate-100 rounded-xl" />
            <div className="h-10 bg-slate-100 rounded-xl" />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-8 text-slate-400 space-y-2">
            <Tag className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
            <p className="text-xs">Belum ada kategori untuk jenis ini</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCategories.map((cat) => (
              <div
                key={cat.id}
                className="py-2.5 px-3 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      cat.type === 'income'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {cat.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">{cat.name}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    title="Edit Kategori"
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(cat)}
                    title="Hapus Kategori"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-800 text-base">
              {editingCat ? 'Edit Kategori' : 'Tambah Kategori Baru'}
            </h3>

            <form onSubmit={handleSubmitModal} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nama Kategori</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Misal: Makanan, Bonus, Hobi..."
                  required
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Jenis Transaksi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCatType('expense')}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      catType === 'expense'
                        ? 'bg-rose-50 border-rose-300 text-rose-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    Pengeluaran
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatType('income')}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      catType === 'income'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    Pemasukan
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Category Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Hapus Kategori?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus kategori <strong>"{deleteTarget.name}"</strong>?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {deleting ? 'Hapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
