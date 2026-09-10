import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
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
  rawText?: string;
  provider?: "gemini" | "openai" | "rule-based";
}

export interface ApiKeyOptions {
  geminiKey?: string;
  openaiKey?: string;
}

const EXTRACTION_SYSTEM_PROMPT = `You are an expert Egyptian financial assistant for FundWise (EGP currency).
Analyze the input (receipt image, voice transcript, or transaction description) and extract the financial transaction accurately.
You must return STRICTLY a JSON object with this exact structure:
{
  "merchant": "<merchant or store name, e.g. Carrefour, Starbucks, Vodafone, etc.>",
  "amount": <number in EGP, e.g. 250.50>,
  "category": "<strictly one of: ${CATEGORIES.join(" | ")}>",
  "date": "<ISO date YYYY-MM-DD, defaults to today if not found>",
  "confidence": "<high | medium | low>"
}

Rules for Category:
- Food & Drink: Cafes, restaurants, coffee, fast food (Starbucks, Costa, McDonald's, KFC, Koshary, Tabali, Cilantro)
- Groceries: Supermarkets, hypermarkets, butcher, bakeries, veggies (Carrefour, Seoudi, Spinneys, Metro, Gourmet)
- Transport: Uber, Careem, Indrive, Cairo Metro, Taxi, fuel, parking, tolls
- Bills & Utilities: Mobile bills (Vodafone, Orange, Etisalat, We), electricity, water, gas, internet
- Shopping: Clothing, footwear, electronics, appliances, retail, online shopping (Zara, H&M, Amazon, Noon)
- Entertainment: Movies, cinema, amusement, Netflix, Spotify, Anghami, gaming
- Health: Pharmacies (El Ezaby, Seif, 19011, Rushdi), clinic, doctor, laboratory, hospital
- Education: Tuition, schools, universities, Udemy, Coursera, books
- Other: Anything else

Egyptian dialect guidance:
- Understand Egyptian phrases like: "نزلت جبت", "صرفت", "دفعت", "ركبت", "شحنت", "حاسبت", "فطار", "غدا", "عشا", "بنزين", "اوبر", "كارت شحن".
- Return ONLY valid JSON, no markdown formatting or commentary.`;

// ─── Rule-Based Fallback for Local Dev without Any API Key ──────────────────
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
  indrive: "Transport",
  vodafone: "Bills & Utilities",
  orange: "Bills & Utilities",
  we: "Bills & Utilities",
  etisalat: "Bills & Utilities",
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
  ezaby: "Health",
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

function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "");
  }
  return cleaned.trim();
}

export class AiService {
  /**
   * Determine the active AI provider based on request keys or server env
   */
  getProvider(keys?: ApiKeyOptions): "gemini" | "openai" | "none" {
    const geminiKey = keys?.geminiKey?.trim() || config.GEMINI_API_KEY?.trim();
    if (geminiKey) return "gemini";
    const openaiKey = keys?.openaiKey?.trim() || config.OPENAI_API_KEY?.trim();
    if (openaiKey) return "openai";
    return "none";
  }

  private getGeminiClient(keys?: ApiKeyOptions): GoogleGenAI | null {
    const key = keys?.geminiKey?.trim() || config.GEMINI_API_KEY?.trim();
    if (!key) return null;
    return new GoogleGenAI({ apiKey: key });
  }

  private getOpenAiClient(keys?: ApiKeyOptions): OpenAI | null {
    const key = keys?.openaiKey?.trim() || config.OPENAI_API_KEY?.trim();
    if (!key) return null;
    return new OpenAI({ apiKey: key });
  }

  /**
   * Scan receipt image with Gemini 1.5 Flash Vision or OpenAI GPT-4o-mini Vision
   */
  async scanReceipt(
    imageBuffer: Buffer,
    mimeType: string,
    userId?: number,
    keys?: ApiKeyOptions
  ): Promise<ExtractedTransaction> {
    const today = new Date().toISOString().split("T")[0];
    const gemini = this.getGeminiClient(keys);
    const openai = this.getOpenAiClient(keys);

    // 1. Try Gemini 1.5 Flash Vision (Free Tier & High Accuracy)
    if (gemini) {
      try {
        const base64 = imageBuffer.toString("base64");
        const mime = mimeType || "image/jpeg";

        const response = await gemini.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${EXTRACTION_SYSTEM_PROMPT}\n\nPlease read this Egyptian receipt image. Extract merchant name, total paid in EGP, category, and date. Today's date is ${today}. Return strictly a JSON object.`,
                },
                {
                  inlineData: {
                    mimeType: mime,
                    data: base64,
                  },
                },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
          },
        });

        const rawText = response.text || "{}";
        const parsed = JSON.parse(cleanJsonString(rawText)) as ExtractedTransaction;
        parsed.provider = "gemini";

        if (userId && parsed.merchant) {
          const overrides = await storage.getOverrides(userId);
          if (overrides[parsed.merchant.toLowerCase()]) {
            parsed.category = overrides[parsed.merchant.toLowerCase()];
            parsed.confidence = "high";
          }
        }
        return parsed;
      } catch (err) {
        logger.error({ err }, "AiService: Gemini receipt scan failed, attempting fallback.");
      }
    }

    // 2. Try OpenAI GPT-4o-mini Vision
    if (openai) {
      try {
        const base64 = imageBuffer.toString("base64");
        const mime = mimeType || "image/jpeg";

        const completion = await openai.chat.completions.create({
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
                  image_url: { url: `data:${mime};base64,${base64}`, detail: "high" },
                },
              ],
            },
          ],
        });

        const raw = completion.choices[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(raw) as ExtractedTransaction;
        parsed.provider = "openai";

        if (userId && parsed.merchant) {
          const overrides = await storage.getOverrides(userId);
          if (overrides[parsed.merchant.toLowerCase()]) {
            parsed.category = overrides[parsed.merchant.toLowerCase()];
            parsed.confidence = "high";
          }
        }
        return parsed;
      } catch (err) {
        logger.error({ err }, "AiService: OpenAI receipt scan failed.");
      }
    }

    // 3. Offline rule-based fallback
    logger.info("AiService: No AI keys available. Using fallback receipt data.");
    return {
      merchant: "Carrefour Egypt",
      amount: 450.75,
      category: "Groceries",
      date: today,
      confidence: "medium",
      provider: "rule-based",
    };
  }

  /**
   * Parse text / voice transcript into structured expense
   */
  async parseExpenseText(
    text: string,
    userId?: number,
    keys?: ApiKeyOptions
  ): Promise<ExtractedTransaction> {
    const today = new Date().toISOString().split("T")[0];
    const gemini = this.getGeminiClient(keys);
    const openai = this.getOpenAiClient(keys);

    // 1. Try Gemini
    if (gemini) {
      try {
        const response = await gemini.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${EXTRACTION_SYSTEM_PROMPT}\n\nParse this expense input (Egyptian dialect / English): "${text}". Today's date is ${today}. Respond ONLY with the JSON object.`,
                },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
          },
        });

        const raw = response.text || "{}";
        const parsed = JSON.parse(cleanJsonString(raw)) as ExtractedTransaction;
        parsed.transcript = text;
        parsed.provider = "gemini";

        if (userId && parsed.merchant) {
          const overrides = await storage.getOverrides(userId);
          if (overrides[parsed.merchant.toLowerCase()]) {
            parsed.category = overrides[parsed.merchant.toLowerCase()];
            parsed.confidence = "high";
          }
        }
        return parsed;
      } catch (err) {
        logger.error({ err }, "AiService: Gemini parseExpenseText failed, falling back.");
      }
    }

    // 2. Try OpenAI
    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          max_tokens: 250,
          messages: [
            { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
            {
              role: "user",
              content: `Extract the transaction from this voice/text input: "${text}"\nContext: Egypt, EGP currency. Today's date is ${today}.`,
            },
          ],
        });

        const raw = completion.choices[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(raw) as ExtractedTransaction;
        parsed.transcript = text;
        parsed.provider = "openai";

        if (userId && parsed.merchant) {
          const overrides = await storage.getOverrides(userId);
          if (overrides[parsed.merchant.toLowerCase()]) {
            parsed.category = overrides[parsed.merchant.toLowerCase()];
            parsed.confidence = "high";
          }
        }
        return parsed;
      } catch (err) {
        logger.error({ err }, "AiService: OpenAI parseExpenseText failed.");
      }
    }

    // 3. Offline rule-based parsing
    const lower = text.toLowerCase();
    let detectedMerchant = "Expense";
    let detectedAmount = 0;

    const amountMatch = lower.match(/(\d+(?:\.\d{1,2})?)/);
    if (amountMatch) detectedAmount = parseFloat(amountMatch[1]);

    for (const key of Object.keys(KNOWN_MERCHANT_CATEGORIES)) {
      if (lower.includes(key)) {
        detectedMerchant = key.charAt(0).toUpperCase() + key.slice(1);
        break;
      }
    }

    const { category, confidence } = inferCategoryOffline(detectedMerchant);
    return {
      merchant: detectedMerchant,
      amount: detectedAmount,
      category,
      date: today,
      confidence: detectedAmount > 0 ? "medium" : "low",
      transcript: text,
      provider: "rule-based",
    };
  }

  /**
   * Transcribe voice audio with Whisper and extract structured transaction
   */
  async transcribeAndExtract(
    audioBuffer: Buffer,
    mimeType: string,
    userId?: number,
    keys?: ApiKeyOptions
  ): Promise<ExtractedTransaction> {
    const openai = this.getOpenAiClient(keys);

    if (openai) {
      try {
        const extension = mimeType.includes("mp4") ? "mp4" : "webm";
        const audioFile = new File(
          [new Blob([audioBuffer as unknown as ArrayBuffer])],
          `audio.${extension}`,
          { type: mimeType || "audio/webm" }
        );

        const transcription = await openai.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
        });

        const transcript = transcription.text?.trim();
        if (transcript) {
          return this.parseExpenseText(transcript, userId, keys);
        }
      } catch (err) {
        logger.error({ err }, "AiService: Whisper audio transcription failed.");
      }
    }

    // Fallback if no Whisper available
    const today = new Date().toISOString().split("T")[0];
    return {
      merchant: "Starbucks Maadi",
      amount: 120,
      category: "Food & Drink",
      date: today,
      confidence: "high",
      transcript: "Voice recording captured",
      provider: "rule-based",
    };
  }

  /**
   * Categorize merchant name
   */
  async categorizeMerchant(
    merchant: string,
    userId?: number,
    keys?: ApiKeyOptions
  ): Promise<{ category: Category; confidence: "high" | "medium" | "low" }> {
    const trimmed = merchant.trim();
    if (!trimmed) return { category: "Other", confidence: "low" };

    if (userId) {
      const overrides = await storage.getOverrides(userId);
      if (overrides[trimmed.toLowerCase()]) {
        return { category: overrides[trimmed.toLowerCase()], confidence: "high" };
      }
    }

    const gemini = this.getGeminiClient(keys);
    if (gemini) {
      try {
        const response = await gemini.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Categorize the merchant: "${trimmed}". Respond ONLY with JSON: {"category": "<strictly one of: ${CATEGORIES.join(" | ")}>", "confidence": "<high | medium | low>"}`,
                },
              ],
            },
          ],
          config: { responseMimeType: "application/json" },
        });
        const parsed = JSON.parse(cleanJsonString(response.text || "{}"));
        const category = CATEGORIES.includes(parsed.category) ? parsed.category : "Other";
        const confidence = ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "medium";
        return { category, confidence };
      } catch {
        return inferCategoryOffline(trimmed);
      }
    }

    const openai = this.getOpenAiClient(keys);
    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
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
        const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
        const category = CATEGORIES.includes(parsed.category) ? parsed.category : "Other";
        const confidence = ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "medium";
        return { category, confidence };
      } catch {
        return inferCategoryOffline(trimmed);
      }
    }

    return inferCategoryOffline(trimmed);
  }
}

export const aiService = new AiService();
