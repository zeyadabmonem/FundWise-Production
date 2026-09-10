import { Router } from "express";
import { UpsertOverrideSchema } from "../types/index.js";
import { storage } from "../db/storage.js";
import { requireUser } from "../middlewares/auth.js";

const router = Router();
router.use(requireUser);

// ─── Get All Overrides ──────────────────────────────────────────────────────
router.get("/merchant-overrides", async (req, res, next) => {
  try {
    const overrides = await storage.getOverrides(req.user!.id);
    res.json(overrides);
  } catch (error) {
    next(error);
  }
});

// ─── Upsert Override ────────────────────────────────────────────────────────
router.post("/merchant-overrides", async (req, res, next) => {
  try {
    const validated = UpsertOverrideSchema.parse(req.body);
    const override = await storage.upsertOverride(
      req.user!.id,
      validated.merchant,
      validated.category
    );
    res.status(200).json(override);
  } catch (error) {
    next(error);
  }
});

export default router;
