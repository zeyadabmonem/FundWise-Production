import { subDays } from 'date-fns';

export type Category = 
  | 'Food & Drink'
  | 'Groceries'
  | 'Transport'
  | 'Bills & Utilities'
  | 'Shopping'
  | 'Entertainment'
  | 'Health'
  | 'Education'
  | 'Other';

export type CaptureChannel = 'manual' | 'voice' | 'receipt' | 'qr' | 'sms';

export interface Transaction {
  id: string;
  userId?: number;
  merchant: string;
  amount: number;
  category: Category;
  date: string; // ISO string
  notes?: string;
  captureChannel: CaptureChannel;
  isLowConfidence?: boolean;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string | null;
  reviewedBy?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

const CATEGORIES: Category[] = [
  'Food & Drink',
  'Groceries',
  'Transport',
  'Bills & Utilities',
  'Shopping',
  'Entertainment',
  'Health',
  'Education',
  'Other'
];

export const CATEGORY_COLORS: Record<Category, string> = {
  'Food & Drink': '#F97316',
  'Groceries': '#10B981',
  'Transport': '#3B82F6',
  'Bills & Utilities': '#8B5CF6',
  'Shopping': '#EC4899',
  'Entertainment': '#F59E0B',
  'Health': '#EF4444',
  'Education': '#06B6D4',
  'Other': '#6B7280'
};

const TODAY = new Date();

export const SEED_TRANSACTIONS: Transaction[] = [
  { id: '1', merchant: 'Starbucks', amount: 95, category: 'Food & Drink', date: subDays(TODAY, 1).toISOString(), captureChannel: 'voice' },
  { id: '2', merchant: 'Uber', amount: 75, category: 'Transport', date: subDays(TODAY, 1).toISOString(), captureChannel: 'sms', isLowConfidence: true },
  { id: '3', merchant: 'Carrefour', amount: 650, category: 'Groceries', date: subDays(TODAY, 2).toISOString(), captureChannel: 'receipt' },
  { id: '4', merchant: 'Vodafone', amount: 350, category: 'Bills & Utilities', date: subDays(TODAY, 2).toISOString(), captureChannel: 'sms' },
  { id: '5', merchant: 'Netflix', amount: 180, category: 'Entertainment', date: subDays(TODAY, 3).toISOString(), captureChannel: 'sms' },
  { id: '6', merchant: 'Cilantro', amount: 65, category: 'Food & Drink', date: subDays(TODAY, 4).toISOString(), captureChannel: 'manual' },
  { id: '7', merchant: 'Zara', amount: 1200, category: 'Shopping', date: subDays(TODAY, 5).toISOString(), captureChannel: 'receipt' },
  { id: '8', merchant: 'Seoudi Market', amount: 480, category: 'Groceries', date: subDays(TODAY, 6).toISOString(), captureChannel: 'qr' },
  { id: '9', merchant: 'Careem', amount: 60, category: 'Transport', date: subDays(TODAY, 7).toISOString(), captureChannel: 'sms' },
  { id: '10', merchant: 'KFC', amount: 280, category: 'Food & Drink', date: subDays(TODAY, 8).toISOString(), captureChannel: 'voice' },
  { id: '11', merchant: 'Cleopatra Hospital', amount: 500, category: 'Health', date: subDays(TODAY, 9).toISOString(), captureChannel: 'manual' },
  { id: '12', merchant: 'Orange Egypt', amount: 250, category: 'Bills & Utilities', date: subDays(TODAY, 10).toISOString(), captureChannel: 'sms' },
  { id: '13', merchant: 'McDonald\'s', amount: 220, category: 'Food & Drink', date: subDays(TODAY, 11).toISOString(), captureChannel: 'receipt', isLowConfidence: true },
  { id: '14', merchant: 'H&M', amount: 450, category: 'Shopping', date: subDays(TODAY, 12).toISOString(), captureChannel: 'receipt' },
  { id: '15', merchant: 'Udemy', amount: 350, category: 'Education', date: subDays(TODAY, 13).toISOString(), captureChannel: 'sms' },
  { id: '16', merchant: 'Spinneys', amount: 800, category: 'Groceries', date: subDays(TODAY, 14).toISOString(), captureChannel: 'qr' },
  { id: '17', merchant: 'Cairo Metro', amount: 25, category: 'Transport', date: subDays(TODAY, 15).toISOString(), captureChannel: 'manual' },
  { id: '18', merchant: 'Costa Coffee', amount: 110, category: 'Food & Drink', date: subDays(TODAY, 16).toISOString(), captureChannel: 'voice' },
  { id: '19', merchant: 'We Telecom', amount: 400, category: 'Bills & Utilities', date: subDays(TODAY, 17).toISOString(), captureChannel: 'sms' },
  { id: '20', merchant: 'Anghami', amount: 90, category: 'Entertainment', date: subDays(TODAY, 18).toISOString(), captureChannel: 'sms' },
  { id: '21', merchant: 'Tabali', amount: 150, category: 'Food & Drink', date: subDays(TODAY, 19).toISOString(), captureChannel: 'qr' },
  { id: '22', merchant: 'Shifa Pharmacy', amount: 210, category: 'Health', date: subDays(TODAY, 20).toISOString(), captureChannel: 'receipt' },
  { id: '23', merchant: 'Noon.com', amount: 650, category: 'Shopping', date: subDays(TODAY, 21).toISOString(), captureChannel: 'sms' },
  { id: '24', merchant: 'Koshary El Tahrir', amount: 65, category: 'Food & Drink', date: subDays(TODAY, 23).toISOString(), captureChannel: 'manual' },
  { id: '25', merchant: 'Synergy Gas', amount: 120, category: 'Bills & Utilities', date: subDays(TODAY, 25).toISOString(), captureChannel: 'manual', isLowConfidence: true },
  { id: '26', merchant: 'Coursera', amount: 400, category: 'Education', date: subDays(TODAY, 27).toISOString(), captureChannel: 'sms' },
  { id: '27', merchant: 'Uber', amount: 85, category: 'Transport', date: subDays(TODAY, 28).toISOString(), captureChannel: 'sms' },
  { id: '28', merchant: 'Metro Market', amount: 320, category: 'Groceries', date: subDays(TODAY, 29).toISOString(), captureChannel: 'receipt' },
  { id: '29', merchant: 'Majid Cinema', amount: 360, category: 'Entertainment', date: subDays(TODAY, 31).toISOString(), captureChannel: 'qr' },
  { id: '30', merchant: 'Starbucks', amount: 95, category: 'Food & Drink', date: subDays(TODAY, 32).toISOString(), captureChannel: 'voice' },
  { id: '31', merchant: 'Amazon Egypt', amount: 950, category: 'Shopping', date: subDays(TODAY, 34).toISOString(), captureChannel: 'sms' },
  { id: '32', merchant: 'Carrefour', amount: 540, category: 'Groceries', date: subDays(TODAY, 36).toISOString(), captureChannel: 'receipt' },
  { id: '33', merchant: 'Cairo Metro', amount: 25, category: 'Transport', date: subDays(TODAY, 37).toISOString(), captureChannel: 'manual' },
  { id: '34', merchant: 'KFC', amount: 180, category: 'Food & Drink', date: subDays(TODAY, 39).toISOString(), captureChannel: 'voice' },
  { id: '35', merchant: 'Vodafone', amount: 350, category: 'Bills & Utilities', date: subDays(TODAY, 40).toISOString(), captureChannel: 'sms' },
];

export const AI_ALTERNATIVES = [
  { product: 'Starbucks', currentPrice: 95, altProduct: 'Cilantro Latte', altPrice: 55 },
  { product: 'Netflix', currentPrice: 180, altProduct: 'Shahid (monthly)', altPrice: 80 },
  { product: 'Uber', currentPrice: 95, altProduct: 'Cairo Metro', altPrice: 15 },
  { product: 'H&M', currentPrice: 450, altProduct: 'Local Brand T-shirt', altPrice: 200 },
  { product: 'KFC', currentPrice: 280, altProduct: 'Koshary El Tahrir', altPrice: 65 },
  { product: 'Coursera', currentPrice: 400, altProduct: 'YouTube Premium', altPrice: 120 },
  { product: 'Majid Cinema', currentPrice: 180, altProduct: 'Netflix movie', altPrice: 0 },
  { product: 'Anghami', currentPrice: 90, altProduct: 'Free Spotify', altPrice: 0 },
  { product: 'Zara', currentPrice: 1200, altProduct: 'Defacto jeans', altPrice: 450 },
];
