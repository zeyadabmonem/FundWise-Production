import { Router } from "express";
import multer from "multer";
import { aiService, type ApiKeyOptions } from "../services/aiService.js";
import { requireUser } from "../middlewares/auth.js";
import { aiRateLimiter } from "../middlewares/rateLimit.js";
import { CategorizeRequestSchema } from "../types/index.js";
import { config } from "../config/index.js";

const router = Router();

// Protect all AI routes with session authentication and rate limiting
router.use(requireUser);
router.use(aiRateLimiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

function getCustomKeys(req: any): ApiKeyOptions {
  return {
    geminiKey: (req.headers["x-gemini-api-key"] as string) || undefined,
    openaiKey: (req.headers["x-openai-api-key"] as string) || undefined,
  };
}

// ─── Status: Check if AI keys are configured on server or request ──────────
router.get("/status", (req, res) => {
  const keys = getCustomKeys(req);
  const activeProvider = aiService.getProvider(keys);
  res.json({
    hasServerGemini: Boolean(config.GEMINI_API_KEY && config.GEMINI_API_KEY.trim().length > 0),
    hasServerOpenAI: Boolean(config.OPENAI_API_KEY && config.OPENAI_API_KEY.trim().length > 0),
    activeProvider,
  });
});

// ─── Parse Text: Understand colloquial Egyptian voice or typed expense ──────
router.post("/parse-text", async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      res.status(400).json({ error: "Text is required" });
      return;
    }

    const keys = getCustomKeys(req);
    const result = await aiService.parseExpenseText(text.trim(), req.user?.id, keys);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ─── Voice: Audio → Whisper → Entity Extraction ─────────────────────────────
router.post("/transcribe", upload.single("audio"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No audio file provided" });
      return;
    }

    const keys = getCustomKeys(req);
    const result = await aiService.transcribeAndExtract(
      req.file.buffer,
      req.file.mimetype,
      req.user?.id,
      keys
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ─── Receipt: Image → Gemini Vision / GPT-4o-mini Vision OCR ────────────────
router.post("/scan-receipt", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const keys = getCustomKeys(req);
    const result = await aiService.scanReceipt(
      req.file.buffer,
      req.file.mimetype,
      req.user?.id,
      keys
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
    const keys = getCustomKeys(req);
    const result = await aiService.categorizeMerchant(validated.merchant, req.user?.id, keys);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
