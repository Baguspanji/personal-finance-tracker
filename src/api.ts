import { AuthResponse, Category, DashboardSummary, PaymentMethod, Transaction, User } from './types';

const TOKEN_KEY = 'finance_tracker_token';

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      removeToken();
    }
    throw new Error(data.error || 'Terjadi kesalahan pada server');
  }

  return data as T;
}

export const api = {
  // Auth
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const data = await fetchApi<AuthResponse>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  logout: async (): Promise<void> => {
    try {
      await fetchApi<{ message: string }>('/api/logout', { method: 'POST' });
    } finally {
      removeToken();
    }
  },

  getCurrentUser: async (): Promise<User> => {
    return fetchApi<User>('/api/me');
  },

  // Dashboard
  getDashboard: async (): Promise<DashboardSummary> => {
    return fetchApi<DashboardSummary>('/api/dashboard');
  },

  createOpeningTransaction: async (sourceMonth: string): Promise<{
    success: boolean;
    netBalance: number;
    targetDate: string;
    openingTransaction: Transaction;
    removedCount: number;
  }> => {
    return fetchApi('/api/opening-transactions', {
      method: 'POST',
      body: JSON.stringify({ sourceMonth }),
    });
  },

  // Payment Methods
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    return fetchApi<PaymentMethod[]>('/api/payment-methods');
  },

  // Categories
  getCategories: async (): Promise<Category[]> => {
    return fetchApi<Category[]>('/api/categories');
  },

  createCategory: async (name: string, type: 'income' | 'expense'): Promise<Category> => {
    return fetchApi<Category>('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name, type }),
    });
  },

  updateCategory: async (id: string, name: string, type: 'income' | 'expense'): Promise<Category> => {
    return fetchApi<Category>(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, type }),
    });
  },

  deleteCategory: async (id: string): Promise<{ success: boolean; message: string }> => {
    return fetchApi<{ success: boolean; message: string }>(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  },

  // Transactions
  getTransactions: async (): Promise<Transaction[]> => {
    return fetchApi<Transaction[]>('/api/transactions');
  },

  getTransactionById: async (id: string): Promise<Transaction> => {
    return fetchApi<Transaction>(`/api/transactions/${id}`);
  },

  createTransaction: async (data: {
    category_id: string;
    payment_method_id?: string;
    transaction_type: 'income' | 'expense';
    amount: number;
    transaction_date: string;
    notes?: string;
  }): Promise<Transaction> => {
    return fetchApi<Transaction>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateTransaction: async (
    id: string,
    data: {
      category_id?: string;
      payment_method_id?: string;
      transaction_type?: 'income' | 'expense';
      amount?: number;
      transaction_date?: string;
      notes?: string;
    }
  ): Promise<Transaction> => {
    return fetchApi<Transaction>(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteTransaction: async (id: string): Promise<{ success: boolean; message: string }> => {
    return fetchApi<{ success: boolean; message: string }>(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
  },
};
