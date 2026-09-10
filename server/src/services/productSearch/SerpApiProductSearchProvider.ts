/**
 * SerpAPI Google Shopping Provider
 *
 * Calls SerpAPI's Google Shopping engine using Egypt's Cairo location to retrieve
 * structured product results: title, price, merchant, product URL, image.
 *
 * RULES (never violate):
 *  - All price / URL / merchant values come exclusively from SerpAPI response.
 *  - No AI-generated commerce data is added here.
 *  - If a field is absent in the provider response, it is left undefined or 'unknown'.
 *
 * SerpAPI docs: https://serpapi.com/google-shopping-api
 */

import type {
  IProductSearchProvider,
  ProductResult,
  ProviderSearchRequest,
  DataSource,
  AvailabilityStatus,
} from './IProductSearchProvider.js';
import { ProviderError } from './IProductSearchProvider.js';
import { logger } from '../../lib/logger.js';

// ─── SerpAPI Response Shape (partial typing) ──────────────────────────────────

interface SerpApiShoppingResult {
  title?: string;
  price?: string;         // e.g. "EGP 10,499" or "10,499 EGP" or "ج.م 10,499"
  extracted_price?: number;
  source?: string;        // merchant name
  link?: string;          // product URL (when present)
  product_link?: string;  // alternate field name
  serpapi_product_api?: string; // link to detailed product page
  thumbnail?: string;
  in_stock?: boolean;
  second_hand_condition?: string;
  badge?: string;
  extensions?: string[];
  rating?: number;
  reviews?: number;
  delivery?: string;
  store_rating?: number;
  store_reviews?: number;
  old_price?: string;
  old_price_extracted?: number;
  currency?: string;
}

interface SerpApiResponse {
  shopping_results?: SerpApiShoppingResult[];
  inline_shopping_results?: SerpApiShoppingResult[];
  error?: string;
}

// ─── Price Parsing ────────────────────────────────────────────────────────────

function parsePrice(result: SerpApiShoppingResult): number | null {
  // SerpAPI often returns extracted_price as a clean number
  if (typeof result.extracted_price === 'number' && result.extracted_price > 0) {
    return result.extracted_price;
  }
  if (typeof result.price === 'string') {
    // Strip currency symbols and thousands separators, parse as float
    const cleaned = result.price.replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function detectCurrency(priceStr?: string): string | null {
  if (!priceStr) return null;
  if (priceStr.includes('EGP') || priceStr.includes('ج.م') || priceStr.includes('جنيه')) return 'EGP';
  if (priceStr.includes('USD') || priceStr.includes('$')) return 'USD';
  if (priceStr.includes('EUR') || priceStr.includes('€')) return 'EUR';
  return null;
}

function detectAvailability(result: SerpApiShoppingResult): AvailabilityStatus {
  if (typeof result.in_stock === 'boolean') return result.in_stock ? 'in_stock' : 'out_of_stock';
  if (result.badge?.toLowerCase().includes('out of stock')) return 'out_of_stock';
  if (result.badge?.toLowerCase().includes('in stock')) return 'in_stock';
  return 'unknown';
}

function getProductUrl(result: SerpApiShoppingResult): string | null {
  return result.link || result.product_link || null;
}

// ─── Provider Implementation ──────────────────────────────────────────────────

export class SerpApiProductSearchProvider implements IProductSearchProvider {
  readonly providerId: DataSource = 'serpapi_google_shopping';

  constructor(private readonly apiKey: string) {}

  isAvailable(): boolean {
    return Boolean(this.apiKey?.trim());
  }

  async search(request: ProviderSearchRequest): Promise<ProductResult[]> {
    if (!this.isAvailable()) {
      throw new ProviderError(this.providerId, 'No SerpAPI key configured');
    }

    const allResults: ProductResult[] = [];
    const now = new Date().toISOString();
    let remaining = request.maxResultsTotal;

    for (const query of request.queries) {
      if (remaining <= 0) break;

      const maxPerQuery = Math.min(query.maxResults ?? 10, remaining, 10);
      const startMs = Date.now();

      try {
        const params = new URLSearchParams({
          engine: 'google_shopping',
          q: query.q,
          hl: query.hl ?? 'ar',
          num: String(maxPerQuery),
          api_key: this.apiKey,
        });
        if (query.gl) params.set('gl', query.gl);
        if (query.location) params.set('location', query.location);

        const url = `https://serpapi.com/search.json?${params.toString()}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        let raw: SerpApiResponse;
        try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);

          if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new ProviderError(
              this.providerId,
              `HTTP ${response.status}: ${text.slice(0, 200)}`
            );
          }
          raw = (await response.json()) as SerpApiResponse;
        } catch (err: any) {
          clearTimeout(timeout);
          if (err?.name === 'AbortError') {
            throw new ProviderError(this.providerId, 'Request timeout after 10s');
          }
          throw err;
        }

        if (raw.error) {
          throw new ProviderError(this.providerId, `API error: ${raw.error}`);
        }

        const rows: SerpApiShoppingResult[] = [
          ...(raw.shopping_results ?? []),
          ...(raw.inline_shopping_results ?? []),
        ].slice(0, maxPerQuery);

        const latencyMs = Date.now() - startMs;
        logger.info(
          { providerId: this.providerId, query: query.q, results: rows.length, latencyMs },
          'ProductSearch: SerpAPI query completed'
        );

        for (const row of rows) {
          const price = parsePrice(row);
          const url = getProductUrl(row);
          const currency = detectCurrency(row.price ?? row.currency);

          // Every field rendered to the user needs evidence from SerpAPI. In
          // particular, never infer EGP merely because this is an Egypt query.
          if (price === null || !url || !row.title || !row.source || !currency) {
            logger.debug({ title: row.title, price, url, currency }, 'ProductSearch: skipping row with incomplete evidence');
            continue;
          }

          const result: ProductResult = {
            title: row.title,
            price,
            currency,
            merchant: row.source,
            url,
            imageUrl: row.thumbnail,
            availability: detectAvailability(row),
            condition: row.second_hand_condition ?? 'new',
            shippingCost: null, // SerpAPI delivery string is not always a parseable number
            retrievedAt: now,
            dataSource: this.providerId,
          };

          // Extract brand hint from extensions if present
          if (row.extensions?.length) {
            const brandExt = row.extensions.find((e) =>
              /brand|ماركة|علامة/i.test(e)
            );
            if (brandExt) result.brand = brandExt.replace(/brand[:\s]*/i, '').trim();
          }

          allResults.push(result);
          remaining--;
          if (remaining <= 0) break;
        }
      } catch (err) {
        if (err instanceof ProviderError) throw err;
        throw new ProviderError(this.providerId, 'Unexpected fetch error', err);
      }
    }

    logger.info(
      { providerId: this.providerId, totalResults: allResults.length },
      'ProductSearch: SerpAPI total results collected'
    );

    return allResults;
  }
}
