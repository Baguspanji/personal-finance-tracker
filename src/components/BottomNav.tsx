import React from 'react';
import { LayoutDashboard, ArrowLeftRight, Tag, Plus } from 'lucide-react';

export type TabType = 'dashboard' | 'transactions' | 'categories';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenAddTransaction: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenAddTransaction,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      <div className="max-w-md mx-auto relative px-4 pb-3">
        {/* FAB Button */}
        <div className="absolute right-6 -top-18 pointer-events-auto">
          <button
            onClick={onOpenAddTransaction}
            className="w-16 h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-2xl border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer focus:outline-none"
            aria-label="Tambah Transaksi"
            title="Tambah Transaksi"
          >
            <Plus className="w-8 h-8 stroke-[2.5]" />
          </button>
        </div>

        {/* Navigation Bar */}
        <nav className="bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-sm rounded-full flex items-center justify-around py-2 px-3 pointer-events-auto">
          <button
            onClick={() => onChangeTab('dashboard')}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-full transition-all ${
              activeTab === 'dashboard'
                ? 'text-slate-900 font-semibold bg-slate-100'
                : 'text-slate-400 hover:text-slate-600 font-normal'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[10px]">Dashboard</span>
          </button>

          <button
            onClick={() => onChangeTab('transactions')}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-full transition-all ${
              activeTab === 'transactions'
                ? 'text-slate-900 font-semibold bg-slate-100'
                : 'text-slate-400 hover:text-slate-600 font-normal'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span className="text-[10px]">Transaksi</span>
          </button>

          <button
            onClick={() => onChangeTab('categories')}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-full transition-all ${
              activeTab === 'categories'
                ? 'text-slate-900 font-semibold bg-slate-100'
                : 'text-slate-400 hover:text-slate-600 font-normal'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span className="text-[10px]">Kategori</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
