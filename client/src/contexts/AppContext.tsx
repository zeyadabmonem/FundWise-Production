import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Transaction, Category } from '../data/seedData';

export type UserRole = 'member' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  plan: string;
  status: string;
  lastSeen?: string | null;
  createdAt: string;
}

type TransactionInput = Omit<Transaction, 'id' | 'userId' | 'reviewStatus' | 'reviewedAt' | 'reviewedBy' | 'createdAt' | 'updatedAt'>;
type TransactionUpdate = Partial<TransactionInput>;

interface AppContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User | null>;
  register: (name: string, email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  transactions: Transaction[];
  addTransaction: (tx: TransactionInput) => Promise<Transaction | null>;
  updateTransaction: (id: string, tx: TransactionUpdate) => Promise<Transaction | null>;
  deleteTransaction: (id: string) => Promise<void>;
  merchantOverrides: Record<string, Category>;
  setMerchantCategory: (merchant: string, category: Category) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json() as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep the status-based error when the response has no JSON body.
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function toLocalTransaction(transaction: Record<string, unknown>): Transaction {
  return {
    id: String(transaction.id),
    userId: Number(transaction.userId),
    merchant: String(transaction.merchant),
    amount: Number(transaction.amount),
    category: transaction.category as Category,
    date: String(transaction.date),
    notes: transaction.notes == null ? undefined : String(transaction.notes),
    captureChannel: transaction.captureChannel as Transaction['captureChannel'],
    isLowConfidence: Boolean(transaction.isLowConfidence),
    reviewStatus: transaction.reviewStatus as Transaction['reviewStatus'],
    reviewedAt: transaction.reviewedAt == null ? null : String(transaction.reviewedAt),
    reviewedBy: transaction.reviewedBy == null ? null : Number(transaction.reviewedBy),
    createdAt: String(transaction.createdAt),
    updatedAt: String(transaction.updatedAt),
  };
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [merchantOverrides, setMerchantOverrides] = useState<Record<string, Category>>({});
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = async () => {
    const data = await request<Record<string, unknown>[]>('/api/transactions');
    setTransactions(data.map(toLocalTransaction));
  };

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const storedOverrides = localStorage.getItem('fw_overrides');
      const storedDarkMode = localStorage.getItem('fw_dark_mode');
      if (storedOverrides) {
        try { setMerchantOverrides(JSON.parse(storedOverrides)); } catch { /* Ignore malformed preference data. */ }
      }
      if (storedDarkMode === 'true') {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      }

      try {
        const currentUser = await request<User>('/api/auth/me');
        if (!cancelled) {
          setUser(currentUser);
          await loadTransactions();
          try {
            const dbOverrides = await request<Record<string, Category>>('/api/merchant-overrides');
            if (dbOverrides) setMerchantOverrides((prev) => ({ ...prev, ...dbOverrides }));
          } catch { /* ignore */ }
        }
      } catch (authError: unknown) {
        if (!cancelled && authError instanceof Error && !authError.message.includes('(401)')) {
          setError(authError.message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsHydrated(true);
        }
      }
    };
    void hydrate();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem('fw_overrides', JSON.stringify(merchantOverrides));
    localStorage.setItem('fw_dark_mode', String(isDarkMode));
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [merchantOverrides, isDarkMode, isHydrated]);

  const authenticate = async (path: '/api/auth/login' | '/api/auth/register', body: Record<string, string>) => {
    try {
      setError(null);
      const authenticatedUser = await request<User>(path, { method: 'POST', body: JSON.stringify(body) });
      setUser(authenticatedUser);
      await loadTransactions();
      return authenticatedUser;
    } catch (authError: unknown) {
      setError(authError instanceof Error ? authError.message : 'Unable to sign in');
      return null;
    }
  };

  const login = (email: string, password: string) => authenticate('/api/auth/login', { email, password });
  const register = (name: string, email: string, password: string) => authenticate('/api/auth/register', { name, email, password });

  const logout = async () => {
    try { await request<void>('/api/auth/logout', { method: 'POST' }); }
    finally {
      setUser(null);
      setTransactions([]);
      setError(null);
    }
  };

  const addTransaction = async (tx: TransactionInput) => {
    try {
      const saved = await request<Record<string, unknown>>('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(tx),
      });
      const localTransaction = toLocalTransaction(saved);
      setTransactions((prev) => [localTransaction, ...prev]);
      return localTransaction;
    } catch (transactionError: unknown) {
      setError(transactionError instanceof Error ? transactionError.message : 'Unable to save transaction');
      return null;
    }
  };

  const updateTransaction = async (id: string, updates: TransactionUpdate) => {
    try {
      const saved = await request<Record<string, unknown>>(`/api/transactions/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      const localTransaction = toLocalTransaction(saved);
      setTransactions((prev) => prev.map((tx) => tx.id === id ? localTransaction : tx));
      return localTransaction;
    } catch (transactionError: unknown) {
      setError(transactionError instanceof Error ? transactionError.message : 'Unable to update transaction');
      return null;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await request<void>(`/api/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    } catch (transactionError: unknown) {
      setError(transactionError instanceof Error ? transactionError.message : 'Unable to delete transaction');
    }
  };

  const setMerchantCategory = (merchant: string, category: Category) => {
    setMerchantOverrides((prev) => ({ ...prev, [merchant.toLowerCase()]: category }));
    void request('/api/merchant-overrides', {
      method: 'POST',
      body: JSON.stringify({ merchant, category }),
    }).catch(() => {});
  };

  const toggleDarkMode = () => setIsDarkMode((previous) => !previous);

  if (!isHydrated) return null;

  return (
    <AppContext.Provider value={{
      user, isLoading, error, login, register, logout, transactions, addTransaction,
      updateTransaction, deleteTransaction, merchantOverrides, setMerchantCategory,
      isDarkMode, toggleDarkMode,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};