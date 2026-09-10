import { Router } from "express";
import { RegisterSchema, LoginSchema } from "../types/index.js";
import { storage } from "../db/storage.js";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  publicUser,
  requireUser,
} from "../middlewares/auth.js";
import { authRateLimiter } from "../middlewares/rateLimit.js";
import { isAdminEmail } from "../config/index.js";

const router = Router();

// ─── Register ───────────────────────────────────────────────────────────────
router.post("/auth/register", authRateLimiter, async (req, res, next) => {
  try {
    const validated = RegisterSchema.parse(req.body);
    const email = validated.email.trim().toLowerCase();

    const existing = await storage.getUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await hashPassword(validated.password);
    const role = isAdminEmail(email) ? "admin" : "member";

    const user = await storage.createUser({
      name: validated.name.trim(),
      email,
      passwordHash,
      role,
    });

    await createSession(res, user.id);
    await storage.recordActivity({
      type: "user",
      title: "New user registered",
      detail: user.email,
      userId: user.id,
    });

    res.status(201).json(publicUser(user));
  } catch (error) {
    next(error);
  }
});

// ─── Login ──────────────────────────────────────────────────────────────────
router.post("/auth/login", authRateLimiter, async (req, res, next) => {
  try {
    const validated = LoginSchema.parse(req.body);
    const email = validated.email.trim().toLowerCase();

    const user = await storage.getUserByEmail(email);
    if (!user || user.status !== "Active") {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const isValid = await verifyPassword(validated.password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Promote to admin if email is in ADMIN_EMAILS
    const role = isAdminEmail(email) ? "admin" : user.role;
    const updatedUser = await storage.updateUser(user.id, {
      lastSeen: new Date(),
      role,
    });

    await createSession(res, user.id);
    await storage.recordActivity({
      type: "auth",
      title: "User signed in",
      detail: user.email,
      userId: user.id,
    });

    res.json(publicUser(updatedUser || user));
  } catch (error) {
    next(error);
  }
});

// ─── Logout ─────────────────────────────────────────────────────────────────
router.post("/auth/logout", async (req, res, next) => {
  try {
    await destroySession(req, res);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

// ─── Current User ───────────────────────────────────────────────────────────
router.get("/auth/me", requireUser, async (req, res) => {
  res.json(publicUser(req.user!));
});

export default router;
