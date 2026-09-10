import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAppContext } from '../contexts/AppContext';
import { Category, CATEGORY_COLORS } from '../data/seedData';
import { ArrowLeft, Check, PenLine, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ManualEntryPage() {
  const [, setLocation] = useLocation();
  const { addTransaction, merchantOverrides } = useAppContext();

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
        // silently fall back — user can pick manually
      } finally {
        setIsCategorizingAI(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchant]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    addTransaction({
      merchant: merchant || 'Unknown',
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
          onClick={() => window.history.back()}
          className="p-2 -ml-2 text-foreground hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="font-semibold text-foreground flex items-center gap-2">
          <PenLine size={16} /> Manual Entry
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
              <h2 className="text-2xl font-bold text-foreground">Added!</h2>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Amount */}
          <div className="flex flex-col items-center gap-2 mb-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Amount
            </label>
            <div className="flex items-center text-4xl font-bold text-foreground">
              <span className="text-muted-foreground mr-2 text-2xl mt-1">EGP</span>
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
              <label className="text-xs font-medium text-muted-foreground">Merchant</label>
              <input
                type="text"
                value={merchant}
                onChange={e => setMerchant(e.target.value)}
                placeholder="Where did you spend?"
                className="w-full text-base bg-transparent border-b border-border focus:border-primary outline-none py-2 text-foreground"
              />
            </div>

            {/* Category with AI indicator */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <AnimatePresence>
                  {isCategorizingAI && (
                    <motion.div
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1 text-[10px] font-semibold text-accent uppercase tracking-wider"
                    >
                      <Sparkles size={10} className="text-accent" />
                      AI thinking…
                    </motion.div>
                  )}
                  {aiCategorized && !isCategorizingAI && (
                    <motion.div
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1 text-[10px] font-semibold text-accent uppercase tracking-wider"
                    >
                      <Sparkles size={10} className="text-accent" />
                      AI suggested
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <select
                value={category}
                onChange={e => { setCategory(e.target.value as Category); setAiCategorized(false); }}
                className="w-full text-base bg-transparent border-b border-border focus:border-primary outline-none py-2 text-foreground"
              >
                {Object.keys(CATEGORY_COLORS).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full text-base bg-transparent border-b border-border focus:border-primary outline-none py-2 text-foreground"
                required
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add a note…"
                className="w-full text-sm bg-muted/30 border border-border rounded-lg p-3 outline-none focus:border-primary text-foreground resize-none"
                rows={2}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-semibold shadow-md hover:opacity-90 transition-opacity mt-2"
          >
            Add Transaction
          </button>
        </form>
      </div>
    </div>
  );
}
