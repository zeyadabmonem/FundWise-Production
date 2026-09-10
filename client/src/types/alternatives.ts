/**
 * Frontend type definitions for AI Alternatives feature.
 * Mirrors the server-side DTOs from IProductSearchProvider.ts.
 */

export type MatchType = 'EXACT' | 'EQUIVALENT' | 'SIMILAR' | 'BUDGET_ALTERNATIVE';
export type DataSource = 'serpapi_google_shopping';
export type AvailabilityStatus = 'in_stock' | 'out_of_stock' | 'unknown';

export interface ParsedProductIntent {
  product: string;
  category?: string;
  brand?: string;
  model?: string;
  condition?: string;
  color?: string;
  size?: string;
  maxPrice?: number;
  currency: string;
  country: string;
  searchQueries: string[];
}

export interface ProductResult {
  title: string;
  brand?: string;
  model?: string;
  price: number;
  currency: string;
  merchant: string;
  url: string;
  imageUrl?: string;
  availability: AvailabilityStatus;
  condition?: string;
  shippingCost?: number | null;
  retrievedAt: string;
  dataSource: DataSource;
  matchType?: MatchType;
  matchScore?: number;
  explanation?: string;
  withinBudget?: boolean;
}

export interface AlternativesResponse {
  query: string;
  intent: ParsedProductIntent;
  retrievedAt: string;
  fromCache: boolean;
  bestMatches: ProductResult[];
  cheaperAlternatives: ProductResult[];
  otherOptions: ProductResult[];
  priceSummary?: {
    lowestVerifiedPrice: number;
    highestVerifiedPrice: number;
    currency: string;
    savingsVsHighest: number;
    savingsPercentage: number;
  };
  coverageNote?: string;
}
