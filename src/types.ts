export type TransactionType = 'income' | 'expense';

export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  category_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
  category_name?: string;
}

export interface Transaction {
  id: string;
  category_id: string;
  payment_method_id: string;
  transaction_type: TransactionType;
  amount: number;
  transaction_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  is_opening?: boolean;

  // Joined fields for convenience in UI
  category_name?: string;
  payment_method_name?: string;
}

export interface DashboardSummary {
  saldo: number;
  pemasukanBulanIni: number;
  pengeluaranBulanIni: number;
  recentTransactions: Transaction[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface McpKey {
  id: string;
  user_id: string;
  name: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  /** Only present in the response that creates the key. Never persisted. */
  plaintext?: string;
}
