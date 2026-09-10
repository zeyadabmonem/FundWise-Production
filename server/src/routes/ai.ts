import { Router } from "express";
import multer from "multer";
import { aiService } from "../services/aiService.js";
import { requireUser } from "../middlewares/auth.js";
import { aiRateLimiter } from "../middlewares/rateLimit.js";
import { CategorizeRequestSchema } from "../types/index.js";

const router = Router();

// Protect all AI routes with session authentication and rate limiting
router.use(requireUser);
router.use(aiRateLimiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// ─── Voice: Audio → Whisper → Entity Extraction ─────────────────────────────
router.post("/transcribe", upload.single("audio"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No audio file provided" });
      return;
    }

    const result = await aiService.transcribeAndExtract(
      req.file.buffer,
      req.file.mimetype,
      req.user?.id
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ─── Receipt: Image → GPT-4o-mini Vision OCR ────────────────────────────────
router.post("/scan-receipt", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const result = await aiService.scanReceipt(
      req.file.buffer,
      req.file.mimetype,
      req.user?.id
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ─── Categorize: Merchant Name → Category + Confidence ──────────────────────
router.post("/categorize", async (req, res, next) => {
  try {
    const validated = CategorizeRequestSchema.parse(req.body);
    const result = await aiService.categorizeMerchant(validated.merchant, req.user?.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
