import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAppContext } from '../contexts/AppContext';
import { Category, CATEGORY_COLORS } from '../data/seedData';
import { ArrowLeft, Check, PenLine, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCategoryLabel } from '../locales/translations';

export default function ManualEntryPage() {
  const [, setLocation] = useLocation();
  const { addTransaction, merchantOverrides, t, isRtl } = useAppContext();

  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState<Category>('Other');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // AI categorization state
  const [isCategorizingAI, setIsCategorizingAI] = useState(false);
  const [aiCategorized, setAiCategorized] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Read prefill from Voice / Receipt / QR pages ──────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem('manualPrefill');
    if (raw) {
      try {
        const prefill = JSON.parse(raw);
        if (prefill.merchant) setMerchant(prefill.merchant);
        if (prefill.amount)   setAmount(String(prefill.amount));
        if (prefill.notes)    setNotes(prefill.notes);
      } catch { /* ignore bad data */ }
      sessionStorage.removeItem('manualPrefill');
    }
  }, []);

  // Auto-categorize whenever merchant changes
  useEffect(() => {
    const trimmed = merchant.trim();
    if (!trimmed) {
      setAiCategorized(false);
      return;
    }

    // Check local memory override first
    const override = merchantOverrides[trimmed.toLowerCase()];
    if (override) {
      setCategory(override);
      setAiCategorized(false);
      return;
    }

    // Debounce AI call
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsCategorizingAI(true);
      setAiCategorized(false);
      try {
        const res = await fetch('/api/ai/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchant: trimmed }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.category && CATEGORY_COLORS[data.category as Category]) {
            setCategory(data.category as Category);
            setAiCategorized(true);
          }
        }
      } catch {
        // silently fall back
      } finally {
        setIsCategorizingAI(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [merchant, merchantOverrides]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    addTransaction({
      merchant: merchant || (isRtl ? 'مصروف عام' : 'General Expense'),
      amount: Number(amount),
      category,
      date: new Date(date).toISOString(),
      notes,
      captureChannel: 'manual',
    });

    setIsSuccess(true);
    setTimeout(() => setLocation('/transactions'), 1000);
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md px-4 h-14 flex items-center justify-between border-b border-border">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="p-2 -ml-2 text-foreground hover:bg-muted rounded-full transition-colors"
          style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }}
        >
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-foreground flex items-center gap-2">
          <PenLine size={16} className="text-accent" /> {t.manualTitle}
        </span>
        <div className="w-10" />
      </div>

      <div className="flex-1 max-w-md mx-auto w-full p-6 relative">
        {/* Success overlay */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-background z-20 flex flex-col items-center justify-center gap-4"
            >
              <div className="w-20 h-20 bg-[#16A34A] text-white rounded-full flex items-center justify-center shadow-lg">
                <Check size={40} />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {isRtl ? 'تم تسجيل المصروف! 👏' : 'Added!'}
              </h2>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Amount */}
          <div className="flex flex-col items-center gap-2 mb-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t.manualAmountLabel}
            </label>
            <div className="flex items-center text-4xl font-extrabold text-foreground">
              <span className="text-muted-foreground mx-2 text-2xl mt-1">
                {isRtl ? 'ج.م' : 'EGP'}
              </span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-36 bg-transparent outline-none text-center tabular-amounts border-b-2 border-transparent focus:border-primary placeholder:text-muted"
                autoFocus
                required
                min="0.01"
                step="0.01"
              />
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm flex flex-col gap-5">
            {/* Merchant */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">{t.manualMerchantLabel}</label>
              <input
                type="text"
                value={merchant}
                onChange={e => setMerchant(e.target.value)}
                placeholder={t.manualMerchantPlaceholder}
                className="w-full text-sm bg-transparent border-b border-border focus:border-primary outline-none py-2 text-foreground"
              />
            </div>

            {/* Category with AI indicator */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">{t.manualCategoryLabel}</label>
                <AnimatePresence>
                  {isCategorizingAI && (
                    <motion.div
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1 text-[10px] font-bold text-accent uppercase tracking-wider"
                    >
                      <Sparkles size={10} className="text-accent" />
                      {isRtl ? 'الذكاء الاصطناعي بيقترح...' : 'AI thinking…'}
                    </motion.div>
                  )}
                  {aiCategorized && !isCategorizingAI && (
                    <motion.div
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase tracking-wider"
                    >
                      <Sparkles size={10} className="text-emerald-500" />
                      {isRtl ? 'اقتراح الذكاء الاصطناعي ✨' : 'AI suggested'}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <select
                value={category}
                onChange={e => { setCategory(e.target.value as Category); setAiCategorized(false); }}
                className="w-full text-sm bg-transparent border-b border-border focus:border-primary outline-none py-2 text-foreground"
              >
                {Object.keys(CATEGORY_COLORS).map(cat => (
                  <option key={cat} value={cat}>
                    {getCategoryLabel(cat, t)}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">{t.manualDateLabel}</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full text-sm bg-transparent border-b border-border focus:border-primary outline-none py-2 text-foreground"
                required
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">{t.manualNotesLabel}</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t.manualNotesPlaceholder}
                className="w-full text-xs bg-muted/30 border border-border rounded-xl p-3 outline-none focus:border-primary text-foreground resize-none"
                rows={2}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold shadow-md hover:opacity-90 transition-opacity mt-1"
          >
            {t.manualSaveBtn}
          </button>
        </form>
      </div>
    </div>
  );
}
