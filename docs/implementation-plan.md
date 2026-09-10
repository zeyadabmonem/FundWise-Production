# Implementation Status

## AI Alternatives / product price comparison

Implemented:

- Dedicated mobile-first **AI Alternatives** route and bottom-navigation entry.
- Authenticated `POST /api/ai/alternatives/search` endpoint with per-user rate limiting, request bounds, cache, request de-duplication, and sanitized provider failures.
- Product-search provider boundary (`IProductSearchProvider`) with a SerpAPI Google Shopping implementation for the Egypt market (`gl=eg`, `hl=ar`).
- Normalization that rejects provider records missing a title, merchant, price, currency, or merchant URL. FundWise never creates commerce facts or URLs itself.
- Deterministic deduplication, budget filtering, match classification, ranking, and EGP price-summary calculations.
- Result states for loading, limited/no coverage, errors, cached data, result freshness, merchant links, and shipping-cost uncertainty.
- API security/validation coverage for the alternatives endpoint.

Configuration required for live results:

- Set `SERP_API_KEY` in the server environment. Without a structured provider response, FundWise returns no offers rather than an AI-generated approximation.

Known coverage limitation:

- SerpAPI is a discovery/search scope, not a complete commerce index. Results are described as the **lowest verified price found**, not the cheapest price on the internet.
