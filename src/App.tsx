import React, { useState, useEffect, useCallback } from 'react';
import { api, getToken, removeToken } from './api';
import { Category, DashboardSummary, PaymentMethod, Transaction, User } from './types';
import { Navbar } from './components/Navbar';
import { BottomNav, TabType } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { CategoriesView } from './components/CategoriesView';
import { ReportsView } from './components/ReportsView';
import { LoginPage } from './components/LoginPage';
import { TransactionFormModal } from './components/TransactionFormModal';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // App Tabs
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // App Data
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Fetch initial auth user
  useEffect(() => {
    async function checkAuth() {
      const token = getToken();
      if (!token) {
        setAuthChecking(false);
        return;
      }
      try {
        const me = await api.getCurrentUser();
        setUser(me);
      } catch (err) {
        console.error('Session expired or invalid:', err);
        removeToken();
        setUser(null);
      } finally {
        setAuthChecking(false);
      }
    }
    checkAuth();
  }, []);

  // Fetch all core app data
  const loadAppData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const [sumRes, txsRes, catsRes, pmRes] = await Promise.all([
        api.getDashboard(),
        api.getTransactions(),
        api.getCategories(),
        api.getPaymentMethods(),
      ]);
      setSummary(sumRes);
      setTransactions(txsRes);
      setCategories(catsRes);
      setPaymentMethods(pmRes);
    } catch (err) {
      console.error('Failed loading app data:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAppData();
    }
  }, [user, loadAppData]);

  // Handlers
  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
  };

  const handleOpenAddTransaction = () => {
    setEditingTransaction(null);
    setIsFormOpen(true);
  };

  const handleOpenEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsFormOpen(true);
  };

  const handleSaveTransaction = async (data: {
    id?: string;
    category_id: string;
    payment_method_id: string;
    transaction_type: 'income' | 'expense';
    amount: number;
    transaction_date: string;
    notes?: string;
  }) => {
    if (data.id) {
      await api.updateTransaction(data.id, data);
    } else {
      await api.createTransaction(data);
    }
    await loadAppData();
  };

  const handleDeleteTransaction = async (id: string) => {
    await api.deleteTransaction(id);
    await loadAppData();
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500 text-xs font-medium">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span>Memuat Personal Finance Tracker...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans antialiased selection:bg-emerald-200">
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 border-x border-slate-200/60 shadow-xl flex flex-col relative">
        {/* Top Header Navbar */}
        <Navbar user={user} onLogout={handleLogout} />

        {/* View Content */}
        <main className="flex-1 p-4">
          {activeTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              transactions={transactions}
              loading={dataLoading}
              onEditTransaction={handleOpenEditTransaction}
              onNavigateTransactions={() => setActiveTab('transactions')}
              onOpenAddTransaction={handleOpenAddTransaction}
              onRefresh={loadAppData}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              loading={dataLoading}
              onEditTransaction={handleOpenEditTransaction}
              onDeleteTransaction={(tx) => {
                setEditingTransaction(tx);
                setIsFormOpen(true);
              }}
              onOpenAddTransaction={handleOpenAddTransaction}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesView
              categories={categories}
              loading={dataLoading}
              onRefreshCategories={loadAppData}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              transactions={transactions}
              loading={dataLoading}
            />
          )}
        </main>

        {/* Bottom Floating Navigation */}
        <BottomNav
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onOpenAddTransaction={handleOpenAddTransaction}
        />

        {/* Add/Edit Transaction Form Modal */}
        <TransactionFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveTransaction}
          onDelete={handleDeleteTransaction}
          initialTransaction={editingTransaction}
          categories={categories}
          paymentMethods={paymentMethods}
        />
      </div>
    </div>
  );
}
