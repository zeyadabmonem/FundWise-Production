import { Router } from "express";
import { randomUUID } from "crypto";
import { CreateTransactionSchema, UpdateTransactionSchema } from "../types/index.js";
import { storage } from "../db/storage.js";
import { requireUser } from "../middlewares/auth.js";

const router = Router();
router.use(requireUser);

// ─── List Transactions ──────────────────────────────────────────────────────
router.get("/transactions", async (req, res, next) => {
  try {
    const transactions = await storage.getTransactions(req.user!.id);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

// ─── Create Transaction ─────────────────────────────────────────────────────
router.post("/transactions", async (req, res, next) => {
  try {
    const validated = CreateTransactionSchema.parse(req.body);
    const id = randomUUID();

    const transaction = await storage.createTransaction({
      id,
      userId: req.user!.id,
      merchant: validated.merchant.trim(),
      amount: validated.amount,
      category: validated.category,
      date: validated.date,
      notes: validated.notes ?? null,
      captureChannel: validated.captureChannel,
      isLowConfidence: validated.isLowConfidence ?? false,
      reviewStatus: validated.isLowConfidence ? "pending" : "approved",
      reviewedAt: validated.isLowConfidence ? null : new Date(),
      reviewedBy: null,
    });

    // Automatically store/update category override for this merchant
    await storage.upsertOverride(req.user!.id, validated.merchant, validated.category);

    await storage.recordActivity({
      type: "transaction",
      title: "Transaction captured",
      detail: `${transaction.merchant} · EGP ${transaction.amount.toLocaleString()}`,
      userId: req.user!.id,
    });

    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
});

// ─── Get Single Transaction ─────────────────────────────────────────────────
router.get("/transactions/:id", async (req, res, next) => {
  try {
    const transaction = await storage.getTransaction(req.params.id, req.user!.id);
    if (!transaction) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

// ─── Update Transaction ─────────────────────────────────────────────────────
router.patch("/transactions/:id", async (req, res, next) => {
  try {
    const validated = UpdateTransactionSchema.parse(req.body);

    const updates: any = { ...validated };
    if (validated.isLowConfidence === false) {
      updates.reviewStatus = "approved";
      updates.reviewedAt = new Date();
      updates.reviewedBy = req.user!.id;
    }

    const updated = await storage.updateTransaction(req.params.id, req.user!.id, updates);
    if (!updated) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    if (validated.merchant && validated.category) {
      await storage.upsertOverride(req.user!.id, validated.merchant, validated.category);
    }

    await storage.recordActivity({
      type: "transaction",
      title: "Transaction updated",
      detail: updated.merchant,
      userId: req.user!.id,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// ─── Delete Transaction ─────────────────────────────────────────────────────
router.delete("/transactions/:id", async (req, res, next) => {
  try {
    const deleted = await storage.deleteTransaction(req.params.id, req.user!.id);
    if (!deleted) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    await storage.recordActivity({
      type: "transaction",
      title: "Transaction deleted",
      detail: `ID: ${req.params.id}`,
      userId: req.user!.id,
    });

    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

export default router;
