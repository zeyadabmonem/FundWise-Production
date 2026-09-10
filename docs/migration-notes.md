# FundWise Migration Notes & Bug Fixes

## 1. Prototype Flaws in Original Source & Applied Solutions

| Source Flaw | Original Behavior | Fixed in Rebuild |
|---|---|---|
| **Random Confidence Indicator** | `ConfirmationCard.tsx:41` used `Math.random() > 0.2 ? 'high' : 'low'` to fake AI confidence. | AI endpoints compute and return genuine confidence (`high` / `medium` / `low`). Frontend renders exact returned value. |
| **Hardcoded "vs Last Month"** | `DashboardPage.tsx:150` hardcoded `+12%` as static text. | Dynamic computation comparing current calendar month transactions vs prior month transactions. |
| **Static AI Insights** | `DashboardPage.tsx:36-40` rendered 3 hardcoded static strings. | Insights are generated dynamically based on actual spending distribution, anomalies, and highest expense categories. |
| **Merchant Overrides Lost** | Stored strictly in browser `localStorage` and never queried on the backend. | Database table `merchant_category_overrides` stores user customizations. Queried prior to AI categorization calls. |
| **Unprotected AI Endpoints** | `/api/ai/*` had no authentication check. | Protected with `requireUser` session middleware and IP/user rate limiting. |
| **Monorepo Complexity** | Confusing symlinks, `.replit` dependencies, proprietary Vite plugins. | Standard npm workspaces / dual-package layout with Vite and Express. Zero proprietary dependencies. |

---

## 2. Preserved Elements (100% Fidelity)

- All 13 screens and navigation paths.
- Tailwind color tokens and dark mode styling.
- Framer-motion transitions and bottom sheets.
- EGP currency formatting and Egypt-localized presets.
- Goal simulator calculation models.
- Mock AI alternatives engine for smart budget suggestions.
