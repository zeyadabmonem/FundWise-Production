/**
 * AlternativesService — Application-layer orchestrator for AI Alternatives.
 *
 * Pipeline:
 *  1. Validate request
 *  2. Check in-memory cache
 *  3. AI Query Understanding → ParsedProductIntent
 *  4. Build search queries
 *  5. Call IProductSearchProvider (SerpAPI)
 *  6. Normalize & deduplicate results
 *  7. Filter invalid / over-budget results
 *  8. Classify match type (deterministic)
 *  9. Rank results (deterministic)
 * 10. Generate short explanations (Gemini, grounded in actual attributes)
 * 11. Build AlternativesResponse sections
 * 12. Cache result
 * 13. Return
 *
 * RULES:
 *  - ranking and price comparison are ALWAYS deterministic (no LLM deciding)
 *  - LLM is only used for: query understanding and short explanation text
 *  - provider results are NEVER modified to change price/URL/merchant
 */

import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';
import type { ApiKeyOptions } from './aiService.js';
import type {
  IProductSearchProvider,
  ParsedProductIntent,
  ProductResult,
  AlternativesResponse,
  MatchType,
} from './productSearch/IProductSearchProvider.js';
import { ProviderError } from './productSearch/IProductSearchProvider.js';
import { SerpApiProductSearchProvider } from './productSearch/SerpApiProductSearchProvider.js';

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  response: AlternativesResponse;
  expiresAt: number;
}

const searchCache = new Map<string, CacheEntry>();

function cacheKey(query: string, details: string, maxBudget?: number, country?: string): string {
  const raw = `${query.toLowerCase().trim()}|${details.toLowerCase().trim()}|${maxBudget ?? ''}|${country ?? 'eg'}`;
  return crypto.createHash('sha1').update(raw).digest('hex');
}

function getCached(key: string): AlternativesResponse | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  return { ...entry.response, fromCache: true };
}

function setCache(key: string, response: AlternativesResponse): void {
  // Prune old entries first to avoid unbounded growth
  const now = Date.now();
  for (const [k, v] of searchCache.entries()) {
    if (now > v.expiresAt) searchCache.delete(k);
  }
  searchCache.set(key, { response, expiresAt: now + CACHE_TTL_MS });
}

// ─── In-flight dedup (prevent concurrent identical requests) ─────────────────

const inFlight = new Map<string, Promise<AlternativesResponse>>();

// ─── Gemini Models Fallback ───────────────────────────────────────────────────

const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
];

async function callGemini(gemini: GoogleGenAI, prompt: string): Promise<string> {
  let lastError: unknown;
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await gemini.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' },
      });
      return response.text ?? '{}';
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message ?? '');
      if (msg.includes('not found') || msg.includes('NOT_FOUND') || msg.includes('no longer available')) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function withTimeout<T>(work: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function cleanJson(raw: string): string {
  let c = raw.trim();
  if (c.startsWith('```json')) c = c.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  else if (c.startsWith('```')) c = c.replace(/^```\s*/, '').replace(/```\s*$/, '');
  return c.trim();
}

// ─── Query Understanding ──────────────────────────────────────────────────────

const INTENT_PROMPT = (query: string, details: string, maxBudget?: number, country?: string) => `
You are a product search assistant helping users in Egypt find better deals.

User query: "${query}"
Additional details: "${details || 'none'}"
Max budget: ${maxBudget ? `${maxBudget} EGP` : 'not specified'}
Country: ${country ?? 'Egypt (EG)'}

Extract the user's product intent and return STRICTLY a JSON object:
{
  "product": "<main product name in English for search>",
  "category": "<product category e.g. headphones, smartphone, laptop>",
  "brand": "<brand name if specified, null otherwise>",
  "model": "<model number/name if specified, null otherwise>",
  "condition": "<new | used | null>",
  "color": "<color if specified, null otherwise>",
  "size": "<size if specified, null otherwise>",
  "maxPrice": ${maxBudget ? maxBudget : 'null'},
  "currency": "EGP",
  "country": "${country ?? 'EG'}",
  "searchQueries": [
    "<primary search query — most specific>",
    "<secondary — slightly broader>",
    "<tertiary — Egypt/EGP focused>"
  ]
}

Rules for searchQueries:
- Maximum 3 queries
- Each query should be in English for better results
- Include "Egypt" or "EGP" in at least one query when relevant
- Keep queries concise (under 60 characters each)
- Do NOT include your analysis, only the JSON object
`.trim();

async function parseProductIntent(
  query: string,
  details: string,
  maxBudget: number | undefined,
  country: string,
  gemini: GoogleGenAI | null
): Promise<ParsedProductIntent> {
  // Fallback intent (used when no AI key available)
  const fallback: ParsedProductIntent = {
    product: query,
    currency: 'EGP',
    country,
    searchQueries: [
      query,
      `${query} Egypt`,
      `${query} EGP price`,
    ],
  };

  if (!gemini) return fallback;

  try {
    const raw = await withTimeout(
      callGemini(gemini, INTENT_PROMPT(query, details, maxBudget, country)),
      8_000,
      'Product intent parsing'
    );
    const parsed = JSON.parse(cleanJson(raw));

    if (!parsed.product) return fallback;

    return {
      product: parsed.product ?? query,
      category: parsed.category ?? undefined,
      brand: parsed.brand ?? undefined,
      model: parsed.model ?? undefined,
      condition: parsed.condition ?? undefined,
      color: parsed.color ?? undefined,
      size: parsed.size ?? undefined,
      maxPrice: typeof parsed.maxPrice === 'number' ? parsed.maxPrice : maxBudget,
      currency: 'EGP',
      country,
      searchQueries: Array.isArray(parsed.searchQueries) && parsed.searchQueries.length > 0
        ? parsed.searchQueries.slice(0, 3)
        : fallback.searchQueries,
    };
  } catch (err) {
    logger.warn({ err }, 'AlternativesService: intent parsing failed, using fallback');
    return fallback;
  }
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function similarityScore(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  // Simple token overlap
  const ta = new Set(na.split(/\s+/));
  const tb = new Set(nb.split(/\s+/));
  const intersection = [...ta].filter((t) => tb.has(t)).length;
  const union = new Set([...ta, ...tb]).size;
  return union === 0 ? 0 : intersection / union;
}

function deduplicateResults(results: ProductResult[]): ProductResult[] {
  const deduped: ProductResult[] = [];

  for (const result of results) {
    const isDuplicate = deduped.some((existing) => {
      const titleSim = similarityScore(existing.title, result.title);
      const sameUrl = existing.url && result.url && existing.url === result.url;
      const sameBrandModel =
        existing.brand &&
        result.brand &&
        existing.brand.toLowerCase() === result.brand.toLowerCase() &&
        existing.model &&
        result.model &&
        existing.model.toLowerCase() === result.model.toLowerCase();

      // A product may be listed by several merchants. Retain those offers for
      // price comparison; only remove duplicate records from the same seller.
      const sameMerchant = existing.merchant.toLowerCase() === result.merchant.toLowerCase();
      return sameUrl || (sameMerchant && (sameBrandModel || titleSim >= 0.85));
    });

    if (!isDuplicate) {
      deduped.push(result);
    }
  }

  return deduped;
}

// ─── Match Classification ─────────────────────────────────────────────────────

function classifyMatchType(intent: ParsedProductIntent, result: ProductResult): MatchType {
  const titleLower = result.title.toLowerCase();
  const productLower = intent.product.toLowerCase();

  // Check brand+model exact match
  const hasExactBrand =
    !intent.brand ||
    titleLower.includes(intent.brand.toLowerCase()) ||
    (result.brand && result.brand.toLowerCase() === intent.brand.toLowerCase());

  const hasExactModel =
    !intent.model ||
    titleLower.includes(intent.model.toLowerCase());

  const titleSim = similarityScore(intent.product, result.title);

  if (hasExactBrand && hasExactModel && titleSim >= 0.7) return 'EXACT';
  if (hasExactBrand && titleSim >= 0.5) return 'EQUIVALENT';
  if (titleSim >= 0.3 || (intent.category && titleLower.includes(intent.category.toLowerCase()))) return 'SIMILAR';
  return 'BUDGET_ALTERNATIVE';
}

// ─── Ranking ──────────────────────────────────────────────────────────────────

/**
 * Deterministic ranking — LLM has NO role in deciding order.
 *
 * Priority signals:
 * 1. EXACT > EQUIVALENT > SIMILAR > BUDGET_ALTERNATIVE
 * 2. In stock > unknown > out of stock
 * 3. Egypt merchant (heuristic: EGP currency)
 * 4. Within budget
 * 5. Lower price
 */
function rankScore(result: ProductResult, intent: ParsedProductIntent): number {
  let score = 0;

  // Match type (40 points)
  const matchPoints: Record<MatchType, number> = {
    EXACT: 40,
    EQUIVALENT: 30,
    SIMILAR: 15,
    BUDGET_ALTERNATIVE: 5,
  };
  score += matchPoints[result.matchType ?? 'BUDGET_ALTERNATIVE'];

  // Availability (20 points)
  if (result.availability === 'in_stock') score += 20;
  else if (result.availability === 'unknown') score += 5;

  // Egypt / EGP (10 points)
  if (result.currency === 'EGP') score += 10;

  // Within budget (15 points)
  if (result.withinBudget) score += 15;

  // Price (15 points — lower is better, capped at 15)
  const maxPrice = intent.maxPrice ?? 999_999;
  const priceRatio = maxPrice > 0 ? result.price / maxPrice : 1;
  score += Math.max(0, 15 - priceRatio * 15);

  return score;
}

// ─── Explanation Generation ───────────────────────────────────────────────────

const EXPLANATION_PROMPT = (intent: ParsedProductIntent, results: ProductResult[]) => `
You are a helpful product search assistant. For each product below, write a SHORT (under 15 words) explanation of why it is relevant to the user's search.

User searched for: "${intent.product}" ${intent.brand ? `(brand: ${intent.brand})` : ''} ${intent.model ? `(model: ${intent.model})` : ''}

Products:
${results
  .map(
    (r, i) => `${i + 1}. "${r.title}" — ${r.price} ${r.currency} at ${r.merchant} (match: ${r.matchType})`
  )
  .join('\n')}

Return STRICTLY a JSON array of explanation strings, one per product, in the same order:
["explanation for product 1", "explanation for product 2", ...]

Rules:
- Each explanation must be grounded in the product attributes listed above.
- Do NOT invent specs, features, or prices not in the list.
- Max 15 words each.
- Write in English; the UI will display appropriately per locale.
`.trim();

async function generateExplanations(
  intent: ParsedProductIntent,
  results: ProductResult[],
  gemini: GoogleGenAI | null
): Promise<string[]> {
  const defaults = () => results.map((r) => {
    if (r.matchType === 'EXACT') return 'Matches the requested product details.';
    if (r.matchType === 'EQUIVALENT') return 'A closely matching offer from another seller.';
    if (r.matchType === 'SIMILAR') return 'A similar product in the same category.';
    return 'A lower-priced option for a similar use case.';
  });

  if (!gemini || results.length === 0) return defaults();

  try {
    const raw = await withTimeout(
      callGemini(gemini, EXPLANATION_PROMPT(intent, results)),
      8_000,
      'Product explanation generation'
    );
    const parsed: string[] = JSON.parse(cleanJson(raw));
    if (Array.isArray(parsed) && parsed.length === results.length) {
      return parsed.map((s) => (typeof s === 'string' ? s : ''));
    }
  } catch (err) {
    logger.warn({ err }, 'AlternativesService: explanation generation failed, using defaults');
  }

  return defaults();
}

// ─── Price Summary ────────────────────────────────────────────────────────────

function buildPriceSummary(
  results: ProductResult[]
): AlternativesResponse['priceSummary'] | undefined {
  const priced = results.filter((r) => r.price > 0 && r.currency === 'EGP');
  if (priced.length < 2) return undefined;

  const prices = priced.map((r) => r.price);
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);
  const savings = highest - lowest;
  const pct = highest > 0 ? (savings / highest) * 100 : 0;

  return {
    lowestVerifiedPrice: lowest,
    highestVerifiedPrice: highest,
    currency: 'EGP',
    savingsVsHighest: savings,
    savingsPercentage: Math.round(pct * 10) / 10,
  };
}

// ─── Main Service ─────────────────────────────────────────────────────────────

export interface AlternativesSearchRequest {
  query: string;
  details?: string;
  maxBudget?: number;
  currency?: string;
  country?: string;
}

export class AlternativesService {
  private getGemini(keys?: ApiKeyOptions): GoogleGenAI | null {
    const key = keys?.geminiKey?.trim() || config.GEMINI_API_KEY?.trim();
    if (!key) return null;
    return new GoogleGenAI({ apiKey: key });
  }

  private getProviders(keys?: ApiKeyOptions): IProductSearchProvider[] {
    const providers: IProductSearchProvider[] = [];

    const serpKey = keys?.serpApiKey?.trim() || config.SERP_API_KEY?.trim();
    if (serpKey) {
      providers.push(new SerpApiProductSearchProvider(serpKey));
    }

    return providers;
  }

  async searchAlternatives(
    req: AlternativesSearchRequest,
    keys?: ApiKeyOptions
  ): Promise<AlternativesResponse> {
    const query = req.query.trim();
    const details = (req.details ?? '').trim();
    const maxBudget = req.maxBudget && req.maxBudget > 0 ? req.maxBudget : undefined;
    const country = (req.country ?? 'EG').toUpperCase();

    // Cache check
    const key = cacheKey(query, details, maxBudget, country);
    const cached = getCached(key);
    if (cached) {
      logger.info({ key }, 'AlternativesService: cache hit');
      return cached;
    }

    // Dedup in-flight requests
    const existing = inFlight.get(key);
    if (existing) {
      logger.info({ key }, 'AlternativesService: joining in-flight request');
      return existing;
    }

    const promise = this._executeSearch(query, details, maxBudget, country, key, keys);
    inFlight.set(key, promise);

    try {
      const result = await promise;
      setCache(key, result);
      return result;
    } finally {
      inFlight.delete(key);
    }
  }

  private async _executeSearch(
    query: string,
    details: string,
    maxBudget: number | undefined,
    country: string,
    cacheKeyStr: string,
    keys?: ApiKeyOptions
  ): Promise<AlternativesResponse> {
    const startMs = Date.now();
    const now = new Date().toISOString();
    const gemini = this.getGemini(keys);
    const providers = this.getProviders(keys);

    logger.info(
      { query, maxBudget, country, providers: providers.map((p) => p.providerId) },
      'AlternativesService: search started'
    );

    // Step 1: Parse intent
    const intent = await parseProductIntent(query, details, maxBudget, country, gemini);
    logger.info({ intent }, 'AlternativesService: intent parsed');

    // Step 2: Search via providers (primary → fallback)
    let rawResults: ProductResult[] = [];
    let coverageNote: string | undefined;
    let providerUsed: string | null = null;
    let lastProviderError: ProviderError | null = null;

    for (const provider of providers) {
      if (!provider.isAvailable()) continue;
      try {
        const providerResults = await provider.search({
          queries: intent.searchQueries.map((q) => ({
            q,
            // Google Shopping does not support Egypt as a `gl` market. A
            // city-level location keeps the search Egypt-first without
            // sending an unsupported country code to SerpAPI.
            gl: country === 'EG' ? undefined : country.toLowerCase(),
            location: country === 'EG' ? 'Cairo, Egypt' : undefined,
            hl: 'ar',
            maxResults: 8,
          })),
          maxResultsTotal: 20,
        });

        if (providerResults.length > 0) {
          rawResults = providerResults;
          providerUsed = provider.providerId;
          logger.info(
            { provider: provider.providerId, results: providerResults.length },
            'AlternativesService: results from provider'
          );
          break;
        }
      } catch (err) {
        if (err instanceof ProviderError) {
          lastProviderError = err;
          logger.warn({ err: err.message, providerId: err.providerId }, 'AlternativesService: provider failed, trying next');
        } else {
          logger.error({ err }, 'AlternativesService: unexpected provider error');
        }
      }
    }

    // An empty successful response means limited coverage. A failed configured
    // provider (for example, an invalid credential) is a service error and
    // must not be presented as if the search found no products.
    if (rawResults.length === 0 && lastProviderError) {
      throw lastProviderError;
    }

    if (rawResults.length === 0) {
      coverageNote = country === 'EG'
        ? 'No reliable Egyptian offers found for this product.'
        : 'No reliable product listings found.';
    }

    // Step 3: Deduplicate
    const deduped = deduplicateResults(rawResults);

    // Step 4: Filter zero-price / missing URL results
    const valid = deduped.filter((r) => r.price > 0 && r.url);

    // Step 5: Filter by budget
    const budgetAnnotated = valid.map((r) => ({
      ...r,
      withinBudget: maxBudget ? r.price <= maxBudget : true,
    }));
    const budgetFiltered = maxBudget
      ? budgetAnnotated.filter((r) => r.withinBudget)
      : budgetAnnotated;

    // Step 6: Classify match types
    const classified = budgetFiltered.map((r) => ({
      ...r,
      matchType: classifyMatchType(intent, r) as MatchType,
    }));

    // Step 7: Rank
    const ranked = [...classified].sort(
      (a, b) => rankScore(b, intent) - rankScore(a, intent)
    );

    // Step 8: Assign match scores (normalized 0-1 based on rank position)
    const scored = ranked.map((r, i) => ({
      ...r,
      matchScore: Math.max(0, 1 - i * 0.1),
    }));

    // Step 9: Explanations (max 10 results to keep cost bounded)
    const forExplanation = scored.slice(0, 10);
    const explanations = await generateExplanations(intent, forExplanation, gemini);
    const withExplanations = forExplanation.map((r, i) => ({
      ...r,
      explanation: explanations[i] ?? '',
    }));

    // Step 10: Build sections
    const bestMatches = withExplanations
      .filter((r) => r.matchType === 'EXACT' || r.matchType === 'EQUIVALENT')
      .slice(0, 3);

    const cheaperAlternatives = withExplanations
      .filter(
        (r) =>
          (r.matchType === 'SIMILAR' || r.matchType === 'BUDGET_ALTERNATIVE') &&
          r.price < (bestMatches[0]?.price ?? Infinity)
      )
      .slice(0, 3);

    const otherOptions = withExplanations
      .filter(
        (r) =>
          !bestMatches.includes(r) &&
          !cheaperAlternatives.includes(r)
      )
      .slice(0, 3);

    // Step 11: Price summary
    const allForSummary = [...bestMatches, ...cheaperAlternatives, ...otherOptions];
    const priceSummary = buildPriceSummary(bestMatches);

    const duration = Date.now() - startMs;
    logger.info(
      {
        query,
        provider: providerUsed,
        total: allForSummary.length,
        best: bestMatches.length,
        cheaper: cheaperAlternatives.length,
        other: otherOptions.length,
        durationMs: duration,
      },
      'AlternativesService: search complete'
    );

    return {
      query,
      intent,
      retrievedAt: now,
      fromCache: false,
      bestMatches,
      cheaperAlternatives,
      otherOptions,
      priceSummary,
      coverageNote,
    };
  }
}

export const alternativesService = new AlternativesService();
