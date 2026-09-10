import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db, isPostgresActive } from "./connection.js";
import {
  usersTable,
  sessionsTable,
  transactionsTable,
  merchantOverridesTable,
  activityEventsTable,
  appExportsTable,
} from "./schema/index.js";
import type {
  User,
  PublicUser,
  Session,
  Transaction,
  MerchantOverride,
  ActivityEvent,
  AppExport,
  Category,
  UserRole,
} from "../types/index.js";
import { randomUUID, randomBytes, scrypt as scryptCallback } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export interface IStorage {
  getUser(id: number): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(data: { name: string; email: string; passwordHash: string; role?: UserRole }): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | null>;
  getAllUsers(): Promise<User[]>;

  createSession(tokenHash: string, userId: number, expiresAt: Date): Promise<Session>;
  getSession(tokenHash: string): Promise<{ session: Session; user: User } | null>;
  deleteSession(tokenHash: string): Promise<void>;

  getTransactions(userId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  createTransaction(tx: Omit<Transaction, "createdAt" | "updatedAt">): Promise<Transaction>;
  getTransaction(id: string, userId: number): Promise<Transaction | null>;
  updateTransaction(id: string, userId: number, updates: Partial<Transaction>): Promise<Transaction | null>;
  deleteTransaction(id: string, userId: number): Promise<boolean>;

  getOverrides(userId: number): Promise<Record<string, Category>>;
  upsertOverride(userId: number, merchant: string, category: Category): Promise<MerchantOverride>;

  recordActivity(event: { type: string; title: string; detail?: string | null; userId?: number | null }): Promise<ActivityEvent>;
  getActivities(limit?: number): Promise<ActivityEvent[]>;

  getExports(limit?: number): Promise<AppExport[]>;
  createExport(format: string, rowCount: number, requestedBy: number): Promise<AppExport>;
}

// ─── PostgreSQL Storage Implementation ──────────────────────────────────────
class PgStorage implements IStorage {
  async getUser(id: number): Promise<User | null> {
    if (!db) return null;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    return (user as unknown as User) ?? null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (!db) return null;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    return (user as unknown as User) ?? null;
  }

  async createUser(data: { name: string; email: string; passwordHash: string; role?: UserRole }): Promise<User> {
    if (!db) throw new Error("DB not connected");
    const [user] = await db
      .insert(usersTable)
      .values({
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        role: data.role ?? "member",
        lastSeen: new Date(),
      })
      .returning();
    return user as unknown as User;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | null> {
    if (!db) return null;
    const [updated] = await db.update(usersTable).set(data).where(eq(usersTable.id, id)).returning();
    return (updated as unknown as User) ?? null;
  }

  async getAllUsers(): Promise<User[]> {
    if (!db) return [];
    const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
    return users as unknown as User[];
  }

  async createSession(tokenHash: string, userId: number, expiresAt: Date): Promise<Session> {
    if (!db) throw new Error("DB not connected");
    const [session] = await db
      .insert(sessionsTable)
      .values({ tokenHash, userId, expiresAt })
      .returning();
    return session as unknown as Session;
  }

  async getSession(tokenHash: string): Promise<{ session: Session; user: User } | null> {
    if (!db) return null;
    const [result] = await db
      .select({ session: sessionsTable, user: usersTable })
      .from(sessionsTable)
      .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
      .where(and(eq(sessionsTable.tokenHash, tokenHash), gt(sessionsTable.expiresAt, new Date())))
      .limit(1);
    if (!result) return null;
    return {
      session: result.session as unknown as Session,
      user: result.user as unknown as User,
    };
  }

  async deleteSession(tokenHash: string): Promise<void> {
    if (!db) return;
    await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, tokenHash));
  }

  async getTransactions(userId: number): Promise<Transaction[]> {
    if (!db) return [];
    const txs = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, userId))
      .orderBy(desc(transactionsTable.date));
    return txs as unknown as Transaction[];
  }

  async getAllTransactions(): Promise<Transaction[]> {
    if (!db) return [];
    const txs = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.date));
    return txs as unknown as Transaction[];
  }

  async createTransaction(tx: Omit<Transaction, "createdAt" | "updatedAt">): Promise<Transaction> {
    if (!db) throw new Error("DB not connected");
    const [created] = await db
      .insert(transactionsTable)
      .values({
        id: tx.id,
        userId: tx.userId,
        merchant: tx.merchant,
        amount: tx.amount,
        category: tx.category,
        date: tx.date,
        notes: tx.notes,
        captureChannel: tx.captureChannel,
        isLowConfidence: tx.isLowConfidence,
        reviewStatus: tx.reviewStatus,
      })
      .returning();
    return created as unknown as Transaction;
  }

  async getTransaction(id: string, userId: number): Promise<Transaction | null> {
    if (!db) return null;
    const [tx] = await db
      .select()
      .from(transactionsTable)
      .where(and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)))
      .limit(1);
    return (tx as unknown as Transaction) ?? null;
  }

  async updateTransaction(id: string, userId: number, updates: Partial<Transaction>): Promise<Transaction | null> {
    if (!db) return null;
    const [updated] = await db
      .update(transactionsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)))
      .returning();
    return (updated as unknown as Transaction) ?? null;
  }

  async deleteTransaction(id: string, userId: number): Promise<boolean> {
    if (!db) return false;
    const res = await db
      .delete(transactionsTable)
      .where(and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)))
      .returning({ id: transactionsTable.id });
    return res.length > 0;
  }

  async getOverrides(userId: number): Promise<Record<string, Category>> {
    if (!db) return {};
    const rows = await db
      .select()
      .from(merchantOverridesTable)
      .where(eq(merchantOverridesTable.userId, userId));
    const result: Record<string, Category> = {};
    for (const row of rows) {
      result[row.merchant.toLowerCase()] = row.category as Category;
    }
    return result;
  }

  async upsertOverride(userId: number, merchant: string, category: Category): Promise<MerchantOverride> {
    if (!db) throw new Error("DB not connected");
    const [existing] = await db
      .select()
      .from(merchantOverridesTable)
      .where(and(eq(merchantOverridesTable.userId, userId), eq(merchantOverridesTable.merchant, merchant.toLowerCase())))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(merchantOverridesTable)
        .set({ category })
        .where(eq(merchantOverridesTable.id, existing.id))
        .returning();
      return updated as unknown as MerchantOverride;
    }

    const [created] = await db
      .insert(merchantOverridesTable)
      .values({ userId, merchant: merchant.toLowerCase(), category })
      .returning();
    return created as unknown as MerchantOverride;
  }

  async recordActivity(event: { type: string; title: string; detail?: string | null; userId?: number | null }): Promise<ActivityEvent> {
    if (!db) throw new Error("DB not connected");
    const [created] = await db.insert(activityEventsTable).values(event).returning();
    return created as unknown as ActivityEvent;
  }

  async getActivities(limit = 20): Promise<ActivityEvent[]> {
    if (!db) return [];
    const events = await db
      .select()
      .from(activityEventsTable)
      .orderBy(desc(activityEventsTable.createdAt))
      .limit(limit);
    return events as unknown as ActivityEvent[];
  }

  async getExports(limit = 50): Promise<AppExport[]> {
    if (!db) return [];
    const exports = await db
      .select()
      .from(appExportsTable)
      .orderBy(desc(appExportsTable.createdAt))
      .limit(limit);
    return exports as unknown as AppExport[];
  }

  async createExport(format: string, rowCount: number, requestedBy: number): Promise<AppExport> {
    if (!db) throw new Error("DB not connected");
    const [created] = await db
      .insert(appExportsTable)
      .values({ format, rowCount, requestedBy })
      .returning();
    return created as unknown as AppExport;
  }
}

// ─── In-Memory Storage Implementation (Zero-Config Fallback) ────────────────
class MemStorage implements IStorage {
  private users: User[] = [];
  private sessions: Session[] = [];
  private transactions: Transaction[] = [];
  private overrides: MerchantOverride[] = [];
  private activities: ActivityEvent[] = [];
  private exports: AppExport[] = [];
  private nextUserId = 1;
  private nextOverrideId = 1;
  private nextActivityId = 1;
  private nextExportId = 1;

  constructor() {
    this.seedInitialData();
  }

  private async seedInitialData() {
    const demoPasswordHash = await hashPassword("password123");

    const demoUser: User = {
      id: this.nextUserId++,
      name: "Ahmed Hassan",
      email: "demo@fundwise.eg",
      passwordHash: demoPasswordHash,
      role: "member",
      plan: "Free",
      status: "Active",
      lastSeen: new Date(),
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    };

    const adminUser: User = {
      id: this.nextUserId++,
      name: "Super Admin",
      email: "admin@fundwise.eg",
      passwordHash: demoPasswordHash,
      role: "admin",
      plan: "Premium",
      status: "Active",
      lastSeen: new Date(),
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    };

    this.users.push(demoUser, adminUser);

    // Seed Egyptian transactions for demo user
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const seedItems = [
      { m: "Starbucks", a: 95, c: "Food & Drink", ch: "voice", days: 1 },
      { m: "Uber", a: 75, c: "Transport", ch: "sms", days: 1, low: true },
      { m: "Carrefour", a: 650, c: "Groceries", ch: "receipt", days: 2 },
      { m: "Vodafone", a: 350, c: "Bills & Utilities", ch: "sms", days: 2 },
      { m: "Netflix", a: 180, c: "Entertainment", ch: "sms", days: 3 },
      { m: "Cilantro", a: 65, c: "Food & Drink", ch: "manual", days: 4 },
      { m: "Zara", a: 1200, c: "Shopping", ch: "receipt", days: 5 },
      { m: "Seoudi Market", a: 480, c: "Groceries", ch: "qr", days: 6 },
      { m: "Careem", a: 60, c: "Transport", ch: "sms", days: 7 },
      { m: "KFC", a: 280, c: "Food & Drink", ch: "voice", days: 8 },
      { m: "Cleopatra Hospital", a: 500, c: "Health", ch: "manual", days: 9 },
      { m: "Orange Egypt", a: 250, c: "Bills & Utilities", ch: "sms", days: 10 },
      { m: "McDonald's", a: 220, c: "Food & Drink", ch: "receipt", days: 11, low: true },
      { m: "H&M", a: 450, c: "Shopping", ch: "receipt", days: 12 },
      { m: "Udemy", a: 350, c: "Education", ch: "sms", days: 13 },
      { m: "Spinneys", a: 800, c: "Groceries", ch: "qr", days: 14 },
      { m: "Cairo Metro", a: 25, c: "Transport", ch: "manual", days: 15 },
      { m: "Costa Coffee", a: 110, c: "Food & Drink", ch: "voice", days: 16 },
      { m: "We Telecom", a: 400, c: "Bills & Utilities", ch: "sms", days: 17 },
      { m: "Anghami", a: 90, c: "Entertainment", ch: "sms", days: 18 },
      { m: "Tabali", a: 150, c: "Food & Drink", ch: "qr", days: 19 },
      { m: "Shifa Pharmacy", a: 210, c: "Health", ch: "receipt", days: 20 },
      { m: "Noon.com", a: 650, c: "Shopping", ch: "sms", days: 21 },
      { m: "Koshary El Tahrir", a: 65, c: "Food & Drink", ch: "manual", days: 23 },
      { m: "Synergy Gas", a: 120, c: "Bills & Utilities", ch: "manual", days: 25, low: true },
      { m: "Coursera", a: 400, c: "Education", ch: "sms", days: 27 },
      { m: "Uber", a: 85, c: "Transport", ch: "sms", days: 28 },
      { m: "Metro Market", a: 320, c: "Groceries", ch: "receipt", days: 29 },
      { m: "Majid Cinema", a: 360, c: "Entertainment", ch: "qr", days: 31 },
      { m: "Starbucks", a: 95, c: "Food & Drink", ch: "voice", days: 32 },
      { m: "Amazon Egypt", a: 950, c: "Shopping", ch: "sms", days: 34 },
      { m: "Carrefour", a: 540, c: "Groceries", ch: "receipt", days: 36 },
      { m: "Cairo Metro", a: 25, c: "Transport", ch: "manual", days: 37 },
      { m: "KFC", a: 180, c: "Food & Drink", ch: "voice", days: 39 },
      { m: "Vodafone", a: 350, c: "Bills & Utilities", ch: "sms", days: 40 },
    ];

    for (let i = 0; i < seedItems.length; i++) {
      const item = seedItems[i];
      const d = new Date(now - item.days * dayMs);
      this.transactions.push({
        id: String(i + 1),
        userId: demoUser.id,
        merchant: item.m,
        amount: item.a,
        category: item.c as Category,
        date: d,
        notes: null,
        captureChannel: item.ch as any,
        isLowConfidence: Boolean(item.low),
        reviewStatus: item.low ? "pending" : "approved",
        reviewedAt: item.low ? null : d,
        reviewedBy: null,
        createdAt: d,
        updatedAt: d,
      });
    }

    this.activities.push({
      id: this.nextActivityId++,
      type: "auth",
      title: "System initialized",
      detail: "Demo seed data ready",
      userId: demoUser.id,
      createdAt: new Date(),
    });
  }

  async getUser(id: number): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  async createUser(data: { name: string; email: string; passwordHash: string; role?: UserRole }): Promise<User> {
    const user: User = {
      id: this.nextUserId++,
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      role: data.role ?? "member",
      plan: "Free",
      status: "Active",
      lastSeen: new Date(),
      createdAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | null> {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    Object.assign(user, data);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return [...this.users].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createSession(tokenHash: string, userId: number, expiresAt: Date): Promise<Session> {
    const session: Session = {
      tokenHash,
      userId,
      expiresAt,
      createdAt: new Date(),
    };
    this.sessions.push(session);
    return session;
  }

  async getSession(tokenHash: string): Promise<{ session: Session; user: User } | null> {
    const session = this.sessions.find((s) => s.tokenHash === tokenHash && s.expiresAt > new Date());
    if (!session) return null;
    const user = this.users.find((u) => u.id === session.userId);
    if (!user) return null;
    return { session, user };
  }

  async deleteSession(tokenHash: string): Promise<void> {
    this.sessions = this.sessions.filter((s) => s.tokenHash !== tokenHash);
  }

  async getTransactions(userId: number): Promise<Transaction[]> {
    return this.transactions
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return [...this.transactions].sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async createTransaction(tx: Omit<Transaction, "createdAt" | "updatedAt">): Promise<Transaction> {
    const fullTx: Transaction = {
      ...tx,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.transactions.unshift(fullTx);
    return fullTx;
  }

  async getTransaction(id: string, userId: number): Promise<Transaction | null> {
    return this.transactions.find((t) => t.id === id && t.userId === userId) ?? null;
  }

  async updateTransaction(id: string, userId: number, updates: Partial<Transaction>): Promise<Transaction | null> {
    const tx = this.transactions.find((t) => t.id === id && t.userId === userId);
    if (!tx) return null;
    Object.assign(tx, updates, { updatedAt: new Date() });
    return tx;
  }

  async deleteTransaction(id: string, userId: number): Promise<boolean> {
    const prevLen = this.transactions.length;
    this.transactions = this.transactions.filter((t) => !(t.id === id && t.userId === userId));
    return this.transactions.length < prevLen;
  }

  async getOverrides(userId: number): Promise<Record<string, Category>> {
    const result: Record<string, Category> = {};
    for (const ov of this.overrides.filter((o) => o.userId === userId)) {
      result[ov.merchant.toLowerCase()] = ov.category;
    }
    return result;
  }

  async upsertOverride(userId: number, merchant: string, category: Category): Promise<MerchantOverride> {
    const existing = this.overrides.find((o) => o.userId === userId && o.merchant.toLowerCase() === merchant.toLowerCase());
    if (existing) {
      existing.category = category;
      return existing;
    }
    const created: MerchantOverride = {
      id: this.nextOverrideId++,
      userId,
      merchant: merchant.toLowerCase(),
      category,
      createdAt: new Date(),
    };
    this.overrides.push(created);
    return created;
  }

  async recordActivity(event: { type: string; title: string; detail?: string | null; userId?: number | null }): Promise<ActivityEvent> {
    const act: ActivityEvent = {
      id: this.nextActivityId++,
      type: event.type,
      title: event.title,
      detail: event.detail ?? null,
      userId: event.userId ?? null,
      createdAt: new Date(),
    };
    this.activities.unshift(act);
    return act;
  }

  async getActivities(limit = 20): Promise<ActivityEvent[]> {
    return this.activities.slice(0, limit);
  }

  async getExports(limit = 50): Promise<AppExport[]> {
    return this.exports.slice(0, limit);
  }

  async createExport(format: string, rowCount: number, requestedBy: number): Promise<AppExport> {
    const exp: AppExport = {
      id: this.nextExportId++,
      format,
      rowCount,
      requestedBy,
      createdAt: new Date(),
    };
    this.exports.unshift(exp);
    return exp;
  }
}

const pgStorage = new PgStorage();
const memStorage = new MemStorage();

export const storage: IStorage = new Proxy({} as IStorage, {
  get(_target, prop: keyof IStorage) {
    const activeStorage = isPostgresActive ? pgStorage : memStorage;
    const value = activeStorage[prop];
    return typeof value === "function" ? value.bind(activeStorage) : value;
  },
});
