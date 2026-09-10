/**
 * Product Search Domain Contracts
 *
 * These interfaces and DTOs define the abstraction boundary between
 * the AI Alternatives business logic (AlternativesService) and any
 * concrete product-data / web-search provider.
 *
 * Rules:
 *  - Business logic MUST depend only on this interface.
 *  - Concrete providers go in the same directory and implement IProductSearchProvider.
 *  - No provider-specific fields may appear here.
 */

// ─── Match Classification ─────────────────────────────────────────────────────

/** How closely a result matches the user's original request. */
export type MatchType = 'EXACT' | 'EQUIVALENT' | 'SIMILAR' | 'BUDGET_ALTERNATIVE';

/** Source of truth for commerce data. */
export type DataSource = 'serpapi_google_shopping';

/** Availability string returned by provider. */
export type AvailabilityStatus = 'in_stock' | 'out_of_stock' | 'unknown';

// ─── Product Result ───────────────────────────────────────────────────────────

/** A single normalized product/offer result from a provider. */
export interface ProductResult {
  /** Display title from provider — NOT AI-generated. */
  title: string;

  /** Brand name if available from provider. */
  brand?: string;

  /** Model identifier if available from provider. */
  model?: string;

  /**
   * Price as a number. Must come from the provider payload.
   * Never set this to a value the AI generated from internal knowledge.
   */
  price: number;

  /** Currency code. Default "EGP". */
  currency: string;

  /** Merchant / seller name from provider. */
  merchant: string;

  /**
   * Deep link to the product on the merchant's site.
   * Must be a real provider-sourced URL. Never fabricated.
   */
  url: string;

  /** Product image URL from provider. May be undefined if not in response. */
  imageUrl?: string;

  /** Stock status from provider. Use 'unknown' when provider does not report. */
  availability: AvailabilityStatus;

  /** Condition string from provider (e.g. "new", "used"). */
  condition?: string;

  /** Shipping cost if reported by provider. Null = provider did not report. */
  shippingCost?: number | null;

  /** ISO 8601 timestamp when this result was fetched. */
  retrievedAt: string;

  /** Identifies the actual provider that supplied this result. */
  dataSource: DataSource;

  // ─── Populated by AlternativesService (not by provider) ─────────────────

  /** Match classification assigned by AlternativesService ranking logic. */
  matchType?: MatchType;

  /**
   * Relevance score 0-1 assigned deterministically by ranking logic.
   * Never an LLM-generated float.
   */
  matchScore?: number;

  /**
   * Short AI explanation GROUNDED in this result's actual attributes.
   * Only populated if matchType is set and an AI key is available.
   */
  explanation?: string;

  /** Whether this result's price is within the user's stated maxBudget. */
  withinBudget?: boolean;
}

// ─── Request / Response ───────────────────────────────────────────────────────

/** A raw search query string and optional locale overrides. */
export interface ProductSearchQuery {
  /** The search string to send to the provider. */
  q: string;

  /** Optional provider-supported country code. */
  gl?: string;

  /** Interface language (default: 'ar'). */
  hl?: string;

  /** Search location used by providers that support city-level localization. */
  location?: string;

  /** Maximum results to fetch from this provider call. */
  maxResults?: number;
}

/** The structured intent understood from the user's query. */
export interface ParsedProductIntent {
  /** Human-readable product name/description. */
  product: string;

  /** Category hint (e.g. "headphones", "smartphone"). */
  category?: string;

  /** Brand name (e.g. "Sony"). */
  brand?: string;

  /** Model (e.g. "WH-1000XM5"). */
  model?: string;

  /** Condition: "new" | "used" | undefined. */
  condition?: string;

  /** Colour preference. */
  color?: string;

  /** Size preference (for apparel, shoes, etc.). */
  size?: string;

  /** Maximum acceptable price. */
  maxPrice?: number;

  /** Currency (default: "EGP"). */
  currency: string;

  /** Country/market (default: "EG"). */
  country: string;

  /** Provider search query strings generated from this intent (max 3). */
  searchQueries: string[];
}

/** Provider-level request. */
export interface ProviderSearchRequest {
  queries: ProductSearchQuery[];
  maxResultsTotal: number;
}

/** Structured response from the backend /api/ai/alternatives/search endpoint. */
export interface AlternativesResponse {
  /** The original user query string. */
  query: string;

  /** The structured intent the AI extracted from the query. */
  intent: ParsedProductIntent;

  /** ISO 8601 timestamp of the response. */
  retrievedAt: string;

  /** Whether results came from cache. */
  fromCache: boolean;

  /** Top-ranked results — best match(es). */
  bestMatches: ProductResult[];

  /** Cheaper alternatives to the requested product. */
  cheaperAlternatives: ProductResult[];

  /** Other relevant options (not cheapest but good value). */
  otherOptions: ProductResult[];

  /** Price comparison summary when sufficient data available. */
  priceSummary?: {
    lowestVerifiedPrice: number;
    highestVerifiedPrice: number;
    currency: string;
    savingsVsHighest: number;
    savingsPercentage: number;
  };

  /** Provider coverage note — e.g. if no Egypt results found. */
  coverageNote?: string;
}

// ─── Provider Interface ───────────────────────────────────────────────────────

/**
 * IProductSearchProvider — abstraction over any product-search / web-search
 * provider. Business logic in AlternativesService depends on this interface;
 * it must never import a concrete provider directly.
 */
export interface IProductSearchProvider {
  /**
   * Unique identifier for this provider (used in logs and dataSource field).
   */
  readonly providerId: DataSource;

  /**
   * Indicates whether this provider is configured and available.
   * (e.g., checks if the required API key is present)
   */
  isAvailable(): boolean;

  /**
   * Execute a product search and return normalized ProductResult[].
   *
   * RULES:
   *  - Every ProductResult.price must come from the provider response payload.
   *  - Every ProductResult.url must come from the provider response payload.
   *  - Every ProductResult.merchant must come from the provider response payload.
   *  - If the provider does not supply a field, leave it undefined / 'unknown'.
   *  - Do NOT generate or infer commerce data from internal AI knowledge.
   *
   * @param request — normalized query set
   * @returns normalized results, empty array if provider has no results
   * @throws ProviderError when provider call fails (not when results are empty)
   */
  search(request: ProviderSearchRequest): Promise<ProductResult[]>;
}

// ─── Error Types ──────────────────────────────────────────────────────────────

export class ProviderError extends Error {
  constructor(
    public readonly providerId: DataSource,
    message: string,
    public readonly cause?: unknown
  ) {
    super(`[${providerId}] ${message}`);
    this.name = 'ProviderError';
  }
}

export class RateLimitError extends Error {
  constructor(message = 'Too many searches. Please wait a moment.') {
    super(message);
    this.name = 'RateLimitError';
  }
}
