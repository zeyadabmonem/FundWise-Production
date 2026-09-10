import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Transaction, Category } from '../data/seedData';
import { translations, type Language } from '../locales/translations';

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

export interface ServerAiStatus {
  hasServerGemini: boolean;
  hasServerOpenAI: boolean;
  hasServerSerpApi: boolean;
  activeProvider: 'gemini' | 'openai' | 'none';
}

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
  // Language & Egyptian Localization
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: typeof translations['ar'];
  isRtl: boolean;
  // AI Keys & Integration
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  openaiApiKey: string;
  setOpenaiApiKey: (key: string) => void;
  serpApiKey: string;
  setSerpApiKey: (key: string) => void;
  serverAiStatus: ServerAiStatus | null;
  getAiHeaders: () => Record<string, string>;
  isAiEnabled: boolean;
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
  const [language, setLanguageState] = useState<Language>('ar');
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Keys & Server Status
  const [geminiApiKey, setGeminiApiKeyState] = useState('');
  const [openaiApiKey, setOpenaiApiKeyState] = useState('');
  const [serpApiKey, setSerpApiKeyState] = useState('');
  const [serverAiStatus, setServerAiStatus] = useState<ServerAiStatus | null>(null);

  const loadTransactions = async () => {
    const data = await request<Record<string, unknown>[]>('/api/transactions');
    setTransactions(data.map(toLocalTransaction));
  };

  const checkAiStatus = async () => {
    try {
      const status = await request<ServerAiStatus>('/api/ai/status');
      setServerAiStatus(status);
    } catch {
      // Ignore if unauthenticated or endpoint unavailable
    }
  };

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const storedOverrides = localStorage.getItem('fw_overrides');
      const storedDarkMode = localStorage.getItem('fw_dark_mode');
      const storedGeminiKey = localStorage.getItem('fw_gemini_key');
      const storedOpenaiKey = localStorage.getItem('fw_openai_key');
      const storedSerpApiKey = localStorage.getItem('fw_serpapi_key');
      const storedLang = (localStorage.getItem('fw_lang') as Language) || 'ar';

      if (storedOverrides) {
        try { setMerchantOverrides(JSON.parse(storedOverrides)); } catch { /* Ignore malformed preference data. */ }
      }
      if (storedDarkMode === 'true') {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      }
      if (storedGeminiKey) setGeminiApiKeyState(storedGeminiKey);
      if (storedOpenaiKey) setOpenaiApiKeyState(storedOpenaiKey);
      if (storedSerpApiKey) setSerpApiKeyState(storedSerpApiKey);

      setLanguageState(storedLang);
      document.documentElement.dir = storedLang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = storedLang;

      try {
        const currentUser = await request<User>('/api/auth/me');
        if (!cancelled) {
          setUser(currentUser);
          await loadTransactions();
          await checkAiStatus();
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

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('fw_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const setGeminiApiKey = (key: string) => {
    const trimmed = key.trim();
    setGeminiApiKeyState(trimmed);
    localStorage.setItem('fw_gemini_key', trimmed);
  };

  const setOpenaiApiKey = (key: string) => {
    const trimmed = key.trim();
    setOpenaiApiKeyState(trimmed);
    localStorage.setItem('fw_openai_key', trimmed);
  };

  const setSerpApiKey = (key: string) => {
    const trimmed = key.trim();
    setSerpApiKeyState(trimmed);
    localStorage.setItem('fw_serpapi_key', trimmed);
  };

  const getAiHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (geminiApiKey) headers['x-gemini-api-key'] = geminiApiKey;
    if (openaiApiKey) headers['x-openai-api-key'] = openaiApiKey;
    if (serpApiKey) headers['x-serpapi-key'] = serpApiKey;
    return headers;
  };

  const isAiEnabled = Boolean(
    geminiApiKey.length > 0 ||
    openaiApiKey.length > 0 ||
    serpApiKey.length > 0 ||
    serverAiStatus?.hasServerGemini ||
    serverAiStatus?.hasServerOpenAI
    || serverAiStatus?.hasServerSerpApi
  );

  const authenticate = async (path: '/api/auth/login' | '/api/auth/register', body: Record<string, string>) => {
    try {
      setError(null);
      const authenticatedUser = await request<User>(path, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setUser(authenticatedUser);
      await loadTransactions();
      await checkAiStatus();
      return authenticatedUser;
    } catch (authError: unknown) {
      const message = authError instanceof Error ? authError.message : 'Authentication failed';
      setError(message);
      return null;
    }
  };

  const login = async (email: string, password: string) => authenticate('/api/auth/login', { email, password });
  const register = async (name: string, email: string, password: string) => authenticate('/api/auth/register', { name, email, password });

  const logout = async () => {
    try {
      await request<void>('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setTransactions([]);
      setMerchantOverrides({});
    }
  };

  const addTransaction = async (tx: TransactionInput) => {
    try {
      setError(null);
      const created = await request<Record<string, unknown>>('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(tx),
      });
      const local = toLocalTransaction(created);
      setTransactions((prev) => [local, ...prev]);
      return local;
    } catch (transactionError: unknown) {
      setError(transactionError instanceof Error ? transactionError.message : 'Unable to save transaction');
      return null;
    }
  };

  const updateTransaction = async (id: string, tx: TransactionUpdate) => {
    try {
      setError(null);
      const updated = await request<Record<string, unknown>>(`/api/transactions/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(tx),
      });
      const local = toLocalTransaction(updated);
      setTransactions((prev) => prev.map((item) => (item.id === id ? local : item)));
      return local;
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

  const t = translations[language] || translations.ar;
  const isRtl = language === 'ar';

  return (
    <AppContext.Provider value={{
      user, isLoading, error, login, register, logout, transactions, addTransaction,
      updateTransaction, deleteTransaction, merchantOverrides, setMerchantCategory,
      isDarkMode, toggleDarkMode,
      language, setLanguage, toggleLanguage, t, isRtl,
      geminiApiKey, setGeminiApiKey,
      openaiApiKey, setOpenaiApiKey,
      serpApiKey, setSerpApiKey,
      serverAiStatus, getAiHeaders, isAiEnabled,
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
