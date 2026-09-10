import type { Transaction } from "../data/seedData";
import type { User } from "../contexts/AppContext";

export interface AdminMetrics {
  range: number;
  currentVolume: number;
  previousVolume: number;
  volumeChangePct: number;
  totalUsers: number;
  activeUsers: number;
  premiumUsers: number;
  atRiskUsers: number;
  aiCaptureRate: number;
  capturedTransactions: number;
  currentTransactions: number;
  needsReview: number;
}

export interface ActivityEvent {
  id: number;
  type: string;
  title: string;
  detail?: string | null;
  userId?: number | null;
  createdAt: string;
}

export interface AppExport {
  id: number;
  format: string;
  rowCount: number;
  requestedBy: number;
  createdAt: string;
}

export interface AdminOverview {
  metrics: AdminMetrics;
  transactions: Transaction[];
  users: User[];
  activity: ActivityEvent[];
  exports: AppExport[];
}
