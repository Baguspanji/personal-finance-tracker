import React from 'react';
import { Wallet, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-xs">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-800 text-base tracking-tight leading-tight">Personal Finance</h1>
            <p className="text-xs text-slate-400 font-normal leading-none mt-0.5">Catat Keuangan Harian</p>
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-2">
          {user && (
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200/60 text-slate-700 text-xs px-3 py-1.5 rounded-full font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="max-w-[100px] truncate">{user.name}</span>
            </div>
          )}
          <button
            onClick={onLogout}
            title="Keluar"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
