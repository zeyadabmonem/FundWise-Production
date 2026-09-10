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
