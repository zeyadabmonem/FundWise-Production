import { Router } from "express";
import { z } from "zod";
import { storage } from "../db/storage.js";
import { requireAdmin, publicUser } from "../middlewares/auth.js";

const router = Router();
router.use("/admin", requireAdmin);

const ReviewDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

const ExportBodySchema = z.object({
  format: z.string().default("csv"),
});

// ─── Admin Overview ─────────────────────────────────────────────────────────
router.get("/admin/overview", async (req, res, next) => {
  try {
    const range = req.query.range ? Number(req.query.range) : 30;
    const now = new Date();
    const currentStart = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);
    const previousStart = new Date(now.getTime() - range * 2 * 24 * 60 * 60 * 1000);

    const [transactions, users, activity, exports] = await Promise.all([
      storage.getAllTransactions(),
      storage.getAllUsers(),
      storage.getActivities(20),
      storage.getExports(10),
    ]);

    const current = transactions.filter((t) => new Date(t.date) >= currentStart);
    const previous = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= previousStart && d < currentStart;
    });

    const currentVolume = current.reduce((sum, t) => sum + Number(t.amount), 0);
    const previousVolume = previous.reduce((sum, t) => sum + Number(t.amount), 0);
    const capturedTransactions = current.filter((t) => t.captureChannel !== "manual").length;

    const activeCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const atRiskCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const activeUsers = users.filter((u) => u.lastSeen && new Date(u.lastSeen) >= activeCutoff).length;
    const atRiskUsers = users.filter((u) => !u.lastSeen || new Date(u.lastSeen) < atRiskCutoff).length;

    const overview = {
      metrics: {
        range,
        currentVolume,
        previousVolume,
        volumeChangePct: previousVolume ? Math.round(((currentVolume - previousVolume) / previousVolume) * 100) : 0,
        totalUsers: users.length,
        activeUsers,
        premiumUsers: users.filter((u) => u.plan === "Premium").length,
        atRiskUsers,
        aiCaptureRate: current.length ? Math.round((capturedTransactions / current.length) * 100) : 0,
        capturedTransactions,
        currentTransactions: current.length,
        needsReview: current.filter((t) => t.isLowConfidence && t.reviewStatus === "pending").length,
      },
      transactions,
      users: users.map(publicUser),
      activity,
      exports,
    };

    res.json(overview);
  } catch (error) {
    next(error);
  }
});

// ─── Review Decision ────────────────────────────────────────────────────────
router.post("/admin/reviews/:id", async (req, res, next) => {
  try {
    const validated = ReviewDecisionSchema.parse(req.body);
    const reviewedAt = new Date();

    const updated = await storage.updateTransaction(req.params.id, req.user!.id, {
      reviewStatus: validated.decision,
      reviewedAt,
      reviewedBy: req.user!.id,
    });

    if (!updated) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    await storage.recordActivity({
      type: "review",
      title: `Transaction ${validated.decision}`,
      detail: `${updated.merchant} · reviewed by ${req.user!.email}`,
      userId: req.user!.id,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// ─── List Exports ───────────────────────────────────────────────────────────
router.get("/admin/exports", async (_req, res, next) => {
  try {
    const exports = await storage.getExports(50);
    res.json(exports);
  } catch (error) {
    next(error);
  }
});

// ─── Create Export ──────────────────────────────────────────────────────────
router.post("/admin/exports", async (req, res, next) => {
  try {
    const validated = ExportBodySchema.parse(req.body);
    const transactions = await storage.getAllTransactions();

    const created = await storage.createExport(
      validated.format,
      transactions.length,
      req.user!.id
    );

    await storage.recordActivity({
      type: "export",
      title: "Transaction export created",
      detail: `${transactions.length} rows · ${validated.format.toUpperCase()}`,
      userId: req.user!.id,
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

export default router;
