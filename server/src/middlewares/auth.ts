import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { Request, Response, NextFunction } from "express";
import { storage } from "../db/storage.js";
import type { User, PublicUser } from "../types/index.js";
import { isAdminEmail } from "../config/index.js";

const scrypt = promisify(scryptCallback);

export const SESSION_COOKIE = "fw_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function publicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan,
    status: user.status,
    lastSeen: user.lastSeen,
    createdAt: user.createdAt,
  };
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(key, "hex");
  return expected.length === derivedKey.length && timingSafeEqual(expected, derivedKey);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  };
}

export async function createSession(res: Response, userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await storage.createSession(hashSessionToken(token), userId, expiresAt);
  res.cookie(SESSION_COOKIE, token, cookieOptions());
  return token;
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (token) {
    await storage.deleteSession(hashSessionToken(token));
  }
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function getUserFromRequest(req: Request): Promise<User | null> {
  const authHeader = req.header("authorization");
  const cookieToken = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : cookieToken;
  if (!token) return null;

  const result = await storage.getSession(hashSessionToken(token));
  return result?.user ?? null;
}

export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.status !== "Active") {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.status !== "Active") {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (user.role !== "admin" && !isAdminEmail(user.email)) {
      res.status(403).json({ error: "Administrator role required" });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
