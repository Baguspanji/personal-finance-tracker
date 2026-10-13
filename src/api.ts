import { AuthResponse, Budget, Category, DashboardSummary, McpKey, PaymentMethod, Transaction, User } from './types';

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

  createPaymentMethod: async (name: string): Promise<PaymentMethod> => {
    return fetchApi<PaymentMethod>('/api/payment-methods', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  updatePaymentMethod: async (id: string, name: string): Promise<PaymentMethod> => {
    return fetchApi<PaymentMethod>(`/api/payment-methods/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  },

  deletePaymentMethod: async (id: string): Promise<{ success: boolean; message: string }> => {
    return fetchApi<{ success: boolean; message: string }>(`/api/payment-methods/${id}`, {
      method: 'DELETE',
    });
  },

  // Budgets (monthly limit per expense category)
  getBudgets: async (): Promise<Budget[]> => {
    return fetchApi<Budget[]>('/api/budgets');
  },

  setBudget: async (categoryId: string, amount: number): Promise<Budget> => {
    return fetchApi<Budget>(`/api/budgets/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify({ amount }),
    });
  },

  deleteBudget: async (categoryId: string): Promise<{ success: boolean; message: string }> => {
    return fetchApi<{ success: boolean; message: string }>(`/api/budgets/${categoryId}`, {
      method: 'DELETE',
    });
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
  // Omitting both bounds returns the full history — used by Dashboard/Reports.
  getTransactions: async (params?: { startDate?: string; endDate?: string }): Promise<Transaction[]> => {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    return fetchApi<Transaction[]>(`/api/transactions${qs ? `?${qs}` : ''}`);
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

  // MCP Access Keys
  listMcpKeys: async (): Promise<McpKey[]> => {
    return fetchApi<McpKey[]>('/api/mcp-keys');
  },

  // The plaintext key is returned here and never again.
  createMcpKey: async (name: string): Promise<McpKey> => {
    return fetchApi<McpKey>('/api/mcp-keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  revokeMcpKey: async (id: string): Promise<{ success: boolean }> => {
    return fetchApi<{ success: boolean }>(`/api/mcp-keys/${id}`, { method: 'DELETE' });
  },
};
