# FundWise AI Architecture & Pipeline Specifications

## 1. Overview

FundWise incorporates multi-modal AI capabilities to make expense capture as frictionless as possible:
1. **Audio Voice Capture**: `whisper-1` + `gpt-4o-mini`
2. **Receipt Image Capture**: `gpt-4o-mini` with Vision
3. **Real-time Categorization**: `gpt-4o-mini` JSON extraction with override memory

---

## 2. Category Taxonomy (9 Locked Categories)

The 9 canonical expense categories are immutable:
1. `Food & Drink` (Restaurants, cafes, food delivery)
2. `Groceries` (Supermarkets, mini-markets, bakeries)
3. `Transport` (Uber, Careem, metro tickets, fuel, parking)
4. `Bills & Utilities` (Electricity, water, gas, internet, mobile bills)
5. `Shopping` (Clothing, electronics, household goods)
6. `Entertainment` (Cinema, concerts, gaming, subscriptions)
7. `Health` (Pharmacies, doctors, clinics, medications)
8. `Education` (Tuition, courses, books, training)
9. `Other` (Unclassified or general items)

---

## 3. Voice Capture Pipeline

```
[User Mic] 
   │ (WebM/MP4 Audio)
   ▼
[POST /api/ai/transcribe] ──> [Session Auth Middleware]
   │
   ▼
[OpenAI Whisper-1]
   │ (Transcript: "I bought groceries from Seoudi for 450 pounds")
   ▼
[OpenAI GPT-4o-mini] (System Prompt with strict JSON schema)
   │
   ▼
{
  "merchant": "Seoudi Market",
  "amount": 450,
  "category": "Groceries",
  "date": "2026-09-10",
  "confidence": "high",
  "transcript": "I bought groceries from Seoudi for 450 pounds"
}
   │
   ▼
[Client ConfirmationCard Bottom Sheet] (User can inspect & edit before saving)
```

---

## 4. Receipt OCR Pipeline

```
[Camera / Image File]
   │ (JPEG/PNG Buffer)
   ▼
[POST /api/ai/scan-receipt] ──> [Session Auth Middleware]
   │
   ▼
[OpenAI GPT-4o-mini Vision]
   │ (Detail: "low", strict JSON schema prompt)
   ▼
{
  "merchant": "Carrefour Maadi",
  "amount": 890.50,
  "category": "Groceries",
  "date": "2026-09-08",
  "confidence": "high"
}
   │
   ▼
[Client ConfirmationCard Bottom Sheet]
```

---

## 5. Offline Dev & Rule-Based Fallback

When `OPENAI_API_KEY` is not provided in `.env`, the server automatically engages a smart rule-based parser:
- **Merchant Matcher**: Matches common Egyptian brand names (e.g., Starbucks, McDonald's, Carrefour, Uber, Vodafone, Metro) to their designated category.
- **Transcript Parser**: Regex-based number extraction for amounts in EGP.
- **Receipt Fallback**: Mock parsed receipt with realistic items and high confidence for rapid local development.

---

## 6. AI Alternatives & Product Price Comparison Architecture

### 6.1 Overview & Zero-Hallucination Guarantee
The AI Alternatives engine searches real-world merchant data to find verified product prices and cheaper alternatives in Egypt. SerpAPI Shopping is localized with `location=Cairo, Egypt`; Google Shopping does not accept Egypt as a `gl` market code.
**Strict Commerce Rule**: The LLM NEVER invents product prices, merchant names, product URLs, or stock availability. All commerce data originates exclusively from verified provider API responses.

```
[User Query + Constraints] (e.g. "Nike Air Force 1", budget: 3500, brand: "Nike")
       │
       ▼
[Rate Limiter] (10 req / 15 min per IP) ──> [Session Auth Middleware]
       │
       ▼
[Gemini Intent Parser] (Clean query, brand, model, normalized constraints)
       │
       ▼
[Provider Router]
  └─► SerpAPI Google Shopping (`location=Cairo, Egypt`) [live merchant offers in Egypt]
       │
       ▼
[Deduplication & Budget Filtering] (Domain/title dedup, maxBudget filter)
       │
       ▼
[Deterministic Match Classifier]
  ├─ EXACT: query title matches result title tokens
  ├─ EQUIVALENT: same product category & model
  ├─ SIMILAR: same category, different brand/specs
  └─ BUDGET_ALTERNATIVE: price < 85% of reference product
       │
       ▼
[Deterministic Ranker] (Exact > In-stock > Egypt merchants > Lower price)
       │
       ▼
[Gemini Natural Summary] (Short contextual explanation referencing only verified prices)
       │
       ▼
[In-Memory Cache] (5-minute TTL keyed by normalized query + constraints)
       │
       ▼
[Client AlternativesPage] (Best Match, Cheaper Alternatives, Other Options, Price Summary)
```

### 6.2 Provider Implementations
- **`SerpApiProductSearchProvider`**: Queries Google Shopping with `location=Cairo, Egypt` and Arabic (`hl=ar`). It normalizes provider-sourced fields and rejects records missing a title, merchant, price, currency, or product URL.
- **Provider decision and limitation**: SerpAPI Google Shopping is used because it returns structured title, merchant, price, currency, URL, and image fields. Coverage is limited to the provider's indexed Egyptian offers; therefore FundWise says “lowest verified price found”, never “lowest price on the internet”. A configured provider failure (such as an invalid key) returns a sanitized unavailable error; no structured provider response returns a clearly communicated empty result instead of asking an LLM to reconstruct commerce facts from web snippets.

### 6.3 Security, Caching & Performance
- **Caching**: 5-minute in-memory cache with concurrent in-flight request deduplication prevents duplicate upstream API calls.
- **Provider Error Masking**: Upstream API keys and provider-specific error details are never exposed to the client; sanitized 503/500 responses are returned with user-friendly error messages.
- **Egypt-First Normalization**: Prioritizes local merchants with `.eg` domains or Egyptian currency (`EGP` / `ج.م`).
