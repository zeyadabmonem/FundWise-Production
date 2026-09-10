import { z } from "zod";

export const CATEGORIES = [
  "Food & Drink",
  "Groceries",
  "Transport",
  "Bills & Utilities",
  "Shopping",
  "Entertainment",
  "Health",
  "Education",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CAPTURE_CHANNELS = ["manual", "voice", "receipt", "qr", "sms"] as const;
export type CaptureChannel = (typeof CAPTURE_CHANNELS)[number];

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const USER_ROLES = ["member", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// ─── User Models ────────────────────────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  plan: string;
  status: string;
  lastSeen: Date | null;
  createdAt: Date;
}

export type PublicUser = Omit<User, "passwordHash">;

// ─── Transaction Models ─────────────────────────────────────────────────────
export interface Transaction {
  id: string;
  userId: number;
  merchant: string;
  amount: number;
  category: Category;
  date: Date;
  notes: string | null;
  captureChannel: CaptureChannel;
  isLowConfidence: boolean;
  reviewStatus: ReviewStatus;
  reviewedAt: Date | null;
  reviewedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Session Models ─────────────────────────────────────────────────────────
export interface Session {
  tokenHash: string;
  userId: number;
  expiresAt: Date;
  createdAt: Date;
}

// ─── Merchant Override Models ───────────────────────────────────────────────
export interface MerchantOverride {
  id: number;
  userId: number;
  merchant: string;
  category: Category;
  createdAt: Date;
}

// ─── Activity Events ────────────────────────────────────────────────────────
export interface ActivityEvent {
  id: number;
  type: string;
  title: string;
  detail: string | null;
  userId: number | null;
  createdAt: Date;
}

// ─── App Export ─────────────────────────────────────────────────────────────
export interface AppExport {
  id: number;
  format: string;
  rowCount: number;
  requestedBy: number;
  createdAt: Date;
}

// ─── Zod Validation Schemas ─────────────────────────────────────────────────
export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const CreateTransactionSchema = z.object({
  merchant: z.string().min(1, "Merchant name is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  category: z.enum(CATEGORIES, {
    errorMap: () => ({ message: `Category must be one of: ${CATEGORIES.join(", ")}` }),
  }),
  date: z.coerce.date().default(() => new Date()),
  notes: z.string().optional().nullable(),
  captureChannel: z.enum(CAPTURE_CHANNELS).default("manual"),
  isLowConfidence: z.boolean().optional().default(false),
});

export const UpdateTransactionSchema = CreateTransactionSchema.partial().extend({
  reviewStatus: z.enum(REVIEW_STATUSES).optional(),
});

export const CategorizeRequestSchema = z.object({
  merchant: z.string().min(1, "Merchant name is required"),
});

export const UpsertOverrideSchema = z.object({
  merchant: z.string().min(1, "Merchant is required"),
  category: z.enum(CATEGORIES),
});
