import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tag,
  PieChart,
  Plus,
  Wallet,
  LogOut,
  KeyRound,
  type LucideIcon,
} from 'lucide-react';
import { TabType } from './BottomNav';
import { User } from '../types';

interface SidebarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenAddTransaction: () => void;
  user: User | null;
  onOpenMcpKeys: () => void;
  onLogout: () => void;
}

const NAV_ITEMS: { key: TabType; label: string; desc: string; icon: LucideIcon }[] = [
  { key: 'dashboard', label: 'Dashboard', desc: 'Ringkasan keuangan', icon: LayoutDashboard },
  { key: 'transactions', label: 'Transaksi', desc: 'Riwayat & kelola', icon: ArrowLeftRight },
  { key: 'categories', label: 'Kategori', desc: 'Kategori & pembayaran', icon: Tag },
  { key: 'reports', label: 'Laporan', desc: 'Analisis pengeluaran', icon: PieChart },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onChangeTab,
  onOpenAddTransaction,
  user,
  onOpenMcpKeys,
  onLogout,
}) => {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 xl:w-72 flex-col bg-white border-r border-slate-200 z-40">
      {/* Brand */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-2.5">
        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-xs">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-semibold text-slate-800 text-base tracking-tight leading-tight">
            Personal Finance
          </h1>
          <p className="text-xs text-slate-400 font-normal leading-none mt-0.5">
            Catat Keuangan Harian
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-2">
        <button
          onClick={onOpenAddTransaction}
          className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tambah Transaksi
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChangeTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                active
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="min-w-0">
                <span className={`block text-sm ${active ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
                <span
                  className={`block text-[11px] truncate ${
                    active ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {item.desc}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-100">
        {user && (
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-800 truncate">
                {user.name}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
              </span>
            </span>
          </div>
        )}
        <button
          onClick={onOpenMcpKeys}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
        >
          <KeyRound className="w-4 h-4" /> Kunci MCP
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> Keluar
        </button>
      </div>
    </aside>
  );
};
