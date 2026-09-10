import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Search, SlidersHorizontal, ChevronDown, ChevronUp,
  ExternalLink, CheckCircle2, Clock, Zap, AlertCircle, RefreshCw,
  Tag, Star, PackageSearch, Loader2, BadgeCheck, Sparkles, Info,
  type LucideIcon,
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import type { AlternativesResponse, ProductResult, MatchType } from '../types/alternatives';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function freshnessLabel(isoDate: string, t: ReturnType<typeof useAppContext>['t']): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 90) return `${secs} ${t.altSecondsAgo}`;
  const mins = Math.floor(secs / 60);
  if (mins < 2) return `1 ${t.altMinuteAgo}`;
  if (mins < 60) return `${mins} ${t.altMinutesAgo}`;
  return t.altPriceMayChange;
}

function formatPrice(price: number, currency: string): string {
  if (!price) return '—';
  return `${price.toLocaleString('ar-EG')} ${currency === 'EGP' ? 'ج.م' : currency}`;
}

function matchLabel(type: MatchType, t: ReturnType<typeof useAppContext>['t']): string {
  switch (type) {
    case 'EXACT': return t.altExact;
    case 'EQUIVALENT': return t.altEquivalent;
    case 'SIMILAR': return t.altSimilar;
    case 'BUDGET_ALTERNATIVE': return t.altBudgetAlt;
  }
}

function matchColor(type: MatchType): string {
  switch (type) {
    case 'EXACT': return 'text-success bg-success/10 border-success/30';
    case 'EQUIVALENT': return 'text-accent bg-accent/10 border-accent/30';
    case 'SIMILAR': return 'text-warning bg-warning/10 border-warning/30';
    case 'BUDGET_ALTERNATIVE': return 'text-muted-foreground bg-muted border-border';
  }
}

function availabilityBadge(
  status: ProductResult['availability'],
  t: ReturnType<typeof useAppContext>['t']
) {
  if (status === 'in_stock') return { label: t.altInStock, color: 'text-success' };
  if (status === 'out_of_stock') return { label: t.altOutOfStock, color: 'text-destructive' };
  return { label: t.altUnknownStock, color: 'text-muted-foreground' };
}

// ─── Product Result Card ──────────────────────────────────────────────────────

function ProductCard({
  result,
  refPrice,
  t,
}: {
  result: ProductResult;
  refPrice?: number;
  t: ReturnType<typeof useAppContext>['t'];
}) {
  const avail = availabilityBadge(result.availability, t);
  const savings = refPrice && result.price > 0 && refPrice > result.price
    ? refPrice - result.price
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex gap-3 p-4">
        {/* Product Image */}
        {result.imageUrl ? (
          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted border border-card-border">
            <img
              src={result.imageUrl}
              alt={result.title}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-lg flex-shrink-0 bg-muted border border-card-border flex items-center justify-center">
            <PackageSearch size={28} className="text-muted-foreground" />
          </div>
        )}

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm leading-tight line-clamp-2">
            {result.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{result.merchant}</p>

          {/* Price */}
          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-bold text-primary tabular-amounts">
              {result.price > 0 ? formatPrice(result.price, result.currency) : '—'}
            </span>
            {savings && savings > 0 && (
              <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
                {t.altSaveLabel} {formatPrice(savings, result.currency)}
              </span>
            )}
          </div>

          {/* Match Type + Availability */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {result.matchType && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${matchColor(result.matchType)}`}>
                {matchLabel(result.matchType, t)}
              </span>
            )}
            <span className={`text-[10px] font-medium flex items-center gap-0.5 ${avail.color}`}>
              <CheckCircle2 size={10} />
              {avail.label}
            </span>
          </div>
        </div>
      </div>

      {/* Explanation */}
      {result.explanation && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground italic">{result.explanation}</p>
        </div>
      )}

      {/* Footer: freshness + CTA */}
      <div className="px-4 pb-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock size={10} />
          {t.altCheckedAt} {freshnessLabel(result.retrievedAt, t)}
          {result.shippingCost === null && (
            <span className="ms-1 opacity-70">· {t.altShippingNotIncluded}</span>
          )}
        </div>

        <a
          href={result.url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => { if (!result.url) e.preventDefault(); }}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
            result.url
              ? 'bg-primary text-primary-foreground hover:opacity-90 active:scale-95'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          {t.altViewProduct}
          <ExternalLink size={12} />
        </a>
      </div>
    </motion.div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function ResultSection({
  title,
  icon: Icon,
  results,
  refPrice,
  t,
}: {
  title: string;
  icon: LucideIcon;
  results: ProductResult[];
  refPrice?: number;
  t: ReturnType<typeof useAppContext>['t'];
}) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-primary" />
        <h3 className="font-bold text-sm text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">({results.length})</span>
      </div>
      <div className="space-y-3">
        {results.map((result, i) => (
          <ProductCard key={`${result.url}-${i}`} result={result} refPrice={refPrice} t={t} />
        ))}
      </div>
    </div>
  );
}

// ─── Price Summary Card ───────────────────────────────────────────────────────

function PriceSummaryCard({
  summary,
  t,
}: {
  summary: NonNullable<AlternativesResponse['priceSummary']>;
  t: ReturnType<typeof useAppContext>['t'];
}) {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-xs text-muted-foreground">{t.altLowestPrice}</p>
        <p className="text-xl font-bold text-primary tabular-amounts">
          {formatPrice(summary.lowestVerifiedPrice, summary.currency)}
        </p>
      </div>
      {summary.savingsVsHighest > 0 && (
        <div className="text-end">
          <p className="text-xs text-success font-semibold">
            {t.altSaveLabel} {formatPrice(summary.savingsVsHighest, summary.currency)}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.savingsPercentage}% vs highest
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type PageState = 'idle' | 'loading' | 'success' | 'error';

export default function AlternativesPage() {
  const { t, getAiHeaders, isRtl } = useAppContext();

  const [query, setQuery] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('q') || '';
    } catch {
      return '';
    }
  });
  const [details, setDetails] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [brand, setBrand] = useState('');
  const [condition, setCondition] = useState('');
  const [color, setColor] = useState('');
  const [country, setCountry] = useState('EG');
  const [showFilters, setShowFilters] = useState(false);

  const [state, setState] = useState<PageState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [response, setResponse] = useState<AlternativesResponse | null>(null);

  const isSubmitting = useRef(false);

  const handleSearch = useCallback(async () => {
    if (isSubmitting.current) return;

    const q = query.trim();
    if (!q) {
      setErrorMsg(t.altEmptyQuery);
      setState('error');
      return;
    }

    isSubmitting.current = true;
    setState('loading');
    setErrorMsg('');
    setResponse(null);

    const budgetNum = maxBudget.trim() ? parseFloat(maxBudget.replace(/[^\d.]/g, '')) : undefined;
    const detailsFull = [
      details.trim(),
      brand.trim() ? `brand: ${brand.trim()}` : '',
      condition ? `condition: ${condition}` : '',
      color.trim() ? `color: ${color.trim()}` : '',
    ].filter(Boolean).join(', ');

    try {
      const res = await fetch('/api/ai/alternatives/search', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAiHeaders(),
        },
        body: JSON.stringify({
          query: q,
          details: detailsFull,
          maxBudget: budgetNum && !isNaN(budgetNum) && budgetNum > 0 ? budgetNum : undefined,
          currency: 'EGP',
          country,
        }),
      });

      if (res.status === 429) {
        setErrorMsg(t.altRateLimit);
        setState('error');
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setErrorMsg(body.error ?? t.altProviderError);
        setState('error');
        return;
      }

      const data = await res.json() as AlternativesResponse;
      setResponse(data);
      setState('success');
    } catch {
      setErrorMsg(t.altProviderError);
      setState('error');
    } finally {
      isSubmitting.current = false;
    }
  }, [query, details, maxBudget, brand, condition, color, country, t, getAiHeaders]);

  const handleRetry = () => {
    setState('idle');
    setErrorMsg('');
    void handleSearch();
  };

  const hasResults =
    response &&
    (response.bestMatches.length > 0 ||
      response.cheaperAlternatives.length > 0 ||
      response.otherOptions.length > 0);

  // Reference price for savings = highest price among best matches
  const refPrice = response?.bestMatches.length
    ? Math.max(...response.bestMatches.map((r) => r.price))
    : undefined;

  return (
    <div className="min-h-screen bg-background pb-24 pt-16">
      <div className="max-w-md mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-primary rounded-xl">
              <ShoppingBag size={22} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{t.altPageTitle}</h1>
              <p className="text-xs text-muted-foreground leading-relaxed">{t.altPageSubtitle}</p>
            </div>
          </div>
        </div>

        {/* Search Card */}
        <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm space-y-4 mb-6">

          {/* Product Query */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              {t.altProductLabel} <span className="text-destructive">*</span>
            </label>
            <input
              id="alt-product-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.altProductPlaceholder}
              maxLength={200}
              className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSearch(); }}
            />
          </div>

          {/* Details */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              {t.altDetailsLabel}
            </label>
            <textarea
              id="alt-product-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t.altDetailsPlaceholder}
              rows={2}
              maxLength={300}
              className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition resize-none"
            />
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              {t.altBudgetLabel}
            </label>
            <div className="relative">
              <Tag size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="alt-max-budget"
                type="number"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                placeholder={t.altBudgetPlaceholder}
                min={0}
                className="w-full bg-background border border-input rounded-xl ps-9 pe-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>
          </div>

          {/* More Filters Toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 transition"
          >
            <SlidersHorizontal size={13} />
            {showFilters ? t.altLessFilters : t.altMoreFilters}
            {showFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 pt-1">
                  {/* Brand */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      {t.altBrandLabel}
                    </label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder={t.altBrandPlaceholder}
                      className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    />
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      {t.altConditionLabel}
                    </label>
                    <div className="flex gap-2">
                      {(['', 'new', 'used'] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCondition(c)}
                          className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-all ${
                            condition === c
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-input hover:border-primary/50'
                          }`}
                        >
                          {c === '' ? t.altConditionAny : c === 'new' ? t.altConditionNew : t.altConditionUsed}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      {t.altColorLabel}
                    </label>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder={t.altColorPlaceholder}
                      className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    />
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      {t.altCountryLabel}
                    </label>
                    <div className="flex gap-2">
                      {(['EG', 'INTL'] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCountry(c === 'INTL' ? '' : 'EG')}
                          className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-all ${
                            (c === 'EG' && country === 'EG') || (c === 'INTL' && country !== 'EG')
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-input hover:border-primary/50'
                          }`}
                        >
                          {c === 'EG' ? t.altCountryEG : t.altCountryIntl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Button */}
          <button
            id="alt-search-btn"
            type="button"
            disabled={state === 'loading'}
            onClick={() => void handleSearch()}
            className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {state === 'loading' ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t.altSearchingMsg}
              </>
            ) : (
              <>
                <Search size={18} />
                {t.altSearchBtn}
              </>
            )}
          </button>
        </div>

        {/* Results Area */}
        <AnimatePresence mode="wait">

          {/* Loading State */}
          {state === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-12"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShoppingBag size={28} className="text-primary animate-ai-pulse" />
                </div>
                <Loader2 size={16} className="absolute -bottom-1 -end-1 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">{t.altSearchingMsg}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {country === 'EG' ? t.altCountryEG : t.altCountryIntl} · EGP
                </p>
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-destructive/10 border border-destructive/30 rounded-2xl p-5 flex flex-col items-center gap-3 text-center"
            >
              <AlertCircle size={32} className="text-destructive" />
              <p className="font-semibold text-foreground text-sm">{errorMsg || t.altProviderError}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-1.5 text-xs font-semibold text-destructive hover:opacity-80 transition"
              >
                <RefreshCw size={13} />
                {t.altRetry}
              </button>
            </motion.div>
          )}

          {/* Success — No Results */}
          {state === 'success' && !hasResults && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-12 text-center"
            >
              <PackageSearch size={48} className="text-muted-foreground opacity-60" />
              <p className="font-semibold text-foreground">
                {response?.coverageNote ?? t.altNoResults}
              </p>
              {response?.coverageNote && (
                <p className="text-xs text-muted-foreground">{t.altNoEgyptResults}</p>
              )}
              <button
                type="button"
                onClick={() => setState('idle')}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 transition mt-2"
              >
                <RefreshCw size={13} />
                {t.altRetry}
              </button>
            </motion.div>
          )}

          {/* Success — Results */}
          {state === 'success' && hasResults && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Meta row */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Zap size={12} className="text-primary" />
                  <span className="font-semibold text-foreground">{response?.intent.product}</span>
                </div>
                <div className="flex items-center gap-1">
                  {response?.fromCache && (
                    <span className="bg-muted px-2 py-0.5 rounded-full text-[10px] font-medium">
                      {t.altFromCache}
                    </span>
                  )}
                  <BadgeCheck size={12} className="text-success" />
                  {t.altCheckedAt} {response ? freshnessLabel(response.retrievedAt, t) : ''}
                </div>
              </div>

              {/* Coverage Note */}
              {response?.coverageNote && (
                <div className="flex items-start gap-2 bg-muted border border-border rounded-xl px-3 py-2.5">
                  <Info size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{response.coverageNote}</p>
                </div>
              )}

              {/* Price Summary */}
              {response?.priceSummary && (
                <PriceSummaryCard summary={response.priceSummary} t={t} />
              )}

              {/* Best Match Section */}
              <ResultSection
                title={t.altSectionBest}
                icon={Star}
                results={response?.bestMatches ?? []}
                refPrice={refPrice}
                t={t}
              />

              {/* Cheaper Alternatives */}
              <ResultSection
                title={t.altSectionCheaper}
                icon={Tag}
                results={response?.cheaperAlternatives ?? []}
                refPrice={refPrice}
                t={t}
              />

              {/* Other Options */}
              <ResultSection
                title={t.altSectionOther}
                icon={Sparkles}
                results={response?.otherOptions ?? []}
                refPrice={refPrice}
                t={t}
              />
            </motion.div>
          )}

          {/* Idle State — Inspirational tips */}
          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6 space-y-4"
            >
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: '🎧', label: 'سماعات سوني XM5' },
                  { icon: '📱', label: 'iPhone 15 Pro' },
                  { icon: '💻', label: 'Dell XPS 13' },
                ].map((tip) => (
                  <button
                    key={tip.label}
                    type="button"
                    onClick={() => {
                      setQuery(tip.label);
                    }}
                    className="bg-card border border-card-border rounded-xl p-3 text-center hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <span className="text-2xl block mb-1">{tip.icon}</span>
                    <span className="text-[11px] text-muted-foreground leading-tight">{tip.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {isRtl ? 'اضغط على مثال أو ابحث عن أي منتج' : 'Tap an example or search for any product'}
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
