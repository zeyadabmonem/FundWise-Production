import OpenAI from "openai";
import { config } from "../config/index.js";
import { logger } from "../lib/logger.js";
import { CATEGORIES, type Category } from "../types/index.js";
import { storage } from "../db/storage.js";

export interface ExtractedTransaction {
  merchant: string;
  amount: number;
  category: Category;
  date: string;
  confidence: "high" | "medium" | "low";
  transcript?: string;
}

let openaiClient: OpenAI | null = null;
if (config.OPENAI_API_KEY && config.OPENAI_API_KEY.trim() !== "") {
  openaiClient = new OpenAI({ apiKey: config.OPENAI_API_KEY });
}

const EXTRACTION_SYSTEM_PROMPT = `You are an intelligent financial assistant for the Egyptian market (currency in EGP).
Extract transaction details from user input and respond ONLY with a valid JSON object matching this schema:
{
  "merchant": "<merchant name, capitalized properly>",
  "amount": <positive number in EGP>,
  "category": "<strictly one of: ${CATEGORIES.join(" | ")}>",
  "date": "<ISO date YYYY-MM-DD, default to today if unspecified>",
  "confidence": "<high | medium | low>"
}

Rules for categories:
- Food & Drink: Cafes, restaurants, coffee shops, fast food (Starbucks, Costa, Cilantro, KFC, McDonald's, Tabali)
- Groceries: Supermarkets, hypermarkets, butcher, bakeries (Carrefour, Seoudi, Spinneys, Metro Market)
- Transport: Uber, Careem, taxis, Cairo Metro, fuel, parking
- Bills & Utilities: Mobile bills (Vodafone, Orange, We), electricity, water, gas (Synergy)
- Shopping: Clothes, retail, electronics, online shopping (Zara, H&M, Amazon, Noon)
- Entertainment: Cinema, concerts, games, streaming (Netflix, Anghami, Majid Cinema)
- Health: Pharmacies (El Ezaby, Shifa), doctors, hospitals (Cleopatra)
- Education: Courses, books, tuition (Udemy, Coursera)
- Other: Anything else

Confidence rules:
- Set confidence to "high" if merchant and amount are clearly stated.
- Set confidence to "medium" or "low" if merchant or amount is ambiguous.`;

// ─── Rule-Based Fallback for Local Dev without API Key ─────────────────────
const KNOWN_MERCHANT_CATEGORIES: Record<string, Category> = {
  starbucks: "Food & Drink",
  cilantro: "Food & Drink",
  costa: "Food & Drink",
  kfc: "Food & Drink",
  "mcdonald's": "Food & Drink",
  mcdonalds: "Food & Drink",
  tabali: "Food & Drink",
  koshary: "Food & Drink",
  carrefour: "Groceries",
  seoudi: "Groceries",
  spinneys: "Groceries",
  metro: "Transport",
  "cairo metro": "Transport",
  uber: "Transport",
  careem: "Transport",
  vodafone: "Bills & Utilities",
  orange: "Bills & Utilities",
  we: "Bills & Utilities",
  netflix: "Entertainment",
  anghami: "Entertainment",
  zara: "Shopping",
  "h&m": "Shopping",
  hm: "Shopping",
  amazon: "Shopping",
  noon: "Shopping",
  cleopatra: "Health",
  pharmacy: "Health",
  shifa: "Health",
  udemy: "Education",
  coursera: "Education",
};

export function inferCategoryOffline(merchant: string): { category: Category; confidence: "high" | "medium" | "low" } {
  const lower = merchant.toLowerCase().trim();
  for (const [known, cat] of Object.entries(KNOWN_MERCHANT_CATEGORIES)) {
    if (lower.includes(known)) {
      return { category: cat, confidence: "high" };
    }
  }
  return { category: "Other", confidence: "medium" };
}

export class AiService {
  /**
   * Transcribe voice audio with Whisper-1 and extract structured transaction via GPT-4o-mini
   */
  async transcribeAndExtract(
    audioBuffer: Buffer,
    mimeType: string,
    userId?: number
  ): Promise<ExtractedTransaction> {
    const today = new Date().toISOString().split("T")[0];

    // Check offline fallback if no API key
    if (!openaiClient) {
      logger.info("AiService: No OpenAI key provided. Running offline transcription fallback.");
      return {
        merchant: "Starbucks Maadi",
        amount: 120,
        category: "Food & Drink",
        date: today,
        confidence: "high",
        transcript: "Bought coffee and breakfast from Starbucks for 120 pounds",
      };
    }

    // 1. Whisper Transcription
    const extension = mimeType.includes("mp4") ? "mp4" : "webm";
    const audioFile = new File(
      [new Blob([audioBuffer as unknown as ArrayBuffer])],
      `audio.${extension}`,
      { type: mimeType || "audio/webm" }
    );

    const transcription = await openaiClient.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    const transcript = transcription.text?.trim();
    if (!transcript || transcript.length < 2) {
      throw new Error("Could not understand audio. Please speak clearly or enter manually.");
    }

    // 2. Structured entity extraction via GPT-4o-mini
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: 300,
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract the transaction from this voice transcript: "${transcript}"\nContext: Egypt, EGP currency. Today's date is ${today}.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result = JSON.parse(raw) as ExtractedTransaction;
    result.transcript = transcript;

    // Check user overrides if available
    if (userId && result.merchant) {
      const overrides = await storage.getOverrides(userId);
      if (overrides[result.merchant.toLowerCase()]) {
        result.category = overrides[result.merchant.toLowerCase()];
        result.confidence = "high";
      }
    }

    return result;
  }

  /**
   * OCR Receipt image with GPT-4o-mini vision and extract structured transaction
   */
  async scanReceipt(
    imageBuffer: Buffer,
    mimeType: string,
    userId?: number
  ): Promise<ExtractedTransaction> {
    const today = new Date().toISOString().split("T")[0];

    // Offline fallback
    if (!openaiClient) {
      logger.info("AiService: No OpenAI key provided. Running offline receipt OCR fallback.");
      return {
        merchant: "Carrefour Egypt",
        amount: 450.75,
        category: "Groceries",
        date: today,
        confidence: "high",
      };
    }

    const base64 = imageBuffer.toString("base64");
    const mime = mimeType || "image/jpeg";

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: 300,
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract the total amount paid, merchant name, category, and date from this receipt image. Context: Egypt, EGP currency. Today is ${today}.`,
            },
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${base64}`, detail: "low" },
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result = JSON.parse(raw) as ExtractedTransaction;

    // Check overrides
    if (userId && result.merchant) {
      const overrides = await storage.getOverrides(userId);
      if (overrides[result.merchant.toLowerCase()]) {
        result.category = overrides[result.merchant.toLowerCase()];
        result.confidence = "high";
      }
    }

    return result;
  }

  /**
   * Categorize merchant name with confidence score and user overrides
   */
  async categorizeMerchant(
    merchant: string,
    userId?: number
  ): Promise<{ category: Category; confidence: "high" | "medium" | "low" }> {
    const trimmed = merchant.trim();
    if (!trimmed) {
      return { category: "Other", confidence: "low" };
    }

    // 1. Check user database overrides first
    if (userId) {
      const overrides = await storage.getOverrides(userId);
      if (overrides[trimmed.toLowerCase()]) {
        return { category: overrides[trimmed.toLowerCase()], confidence: "high" };
      }
    }

    // 2. Offline fallback if no OpenAI key
    if (!openaiClient) {
      return inferCategoryOffline(trimmed);
    }

    try {
      const completion = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        max_tokens: 60,
        messages: [
          {
            role: "system",
            content: `Categorize the merchant. Respond with JSON: {"category": "<strictly one of: ${CATEGORIES.join(" | ")}>", "confidence": "<high | medium | low>"}`,
          },
          { role: "user", content: `Merchant: "${trimmed}"` },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? '{"category":"Other","confidence":"medium"}';
      const parsed = JSON.parse(raw);
      const category = CATEGORIES.includes(parsed.category) ? parsed.category : "Other";
      const confidence = ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "medium";

      return { category, confidence };
    } catch (err) {
      logger.warn({ err }, "AiService: OpenAI categorization failed. Using offline fallback.");
      return inferCategoryOffline(trimmed);
    }
  }
}

export const aiService = new AiService();
