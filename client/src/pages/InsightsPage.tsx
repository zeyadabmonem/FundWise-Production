import { useMemo, useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { subDays, format } from 'date-fns';
import { AIBadge } from '../components/CategoryBadge';
import { CATEGORY_COLORS, AI_ALTERNATIVES, Category } from '../data/seedData';
import {
  TrendingUp, TrendingDown, Target, Plus, Trash2,
  Zap, BarChart2, Calendar, ShoppingBag, Sparkles,
  ChevronRight, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────── TYPES ─────────────────────────── */

interface Goal {
  id: string;
  name: string;
  emoji: string;
  target: number;
  saved: number;
  monthly: number;
  color: string;
}

const GOAL_PRESETS: Omit<Goal, 'id' | 'saved' | 'monthly'>[] = [
  { name: 'Vacation', emoji: '✈️', target: 30_000, color: '#38BDF8' },
  { name: 'Emergency Fund', emoji: '🛡️', target: 50_000, color: '#16A34A' },
  { name: 'New iPhone', emoji: '📱', target: 25_000, color: '#8B5CF6' },
  { name: 'New Car', emoji: '🚗', target: 200_000, color: '#F97316' },
  { name: 'Custom', emoji: '🎯', target: 10_000, color: '#EC4899' },
];

const DEFAULT_GOALS: Goal[] = [
  { id: 'g1', name: 'Vacation', emoji: '✈️', target: 30_000, saved: 5_200, monthly: 2_000, color: '#38BDF8' },
  { id: 'g2', name: 'Emergency Fund', emoji: '🛡️', target: 50_000, saved: 8_000, monthly: 2_500, color: '#16A34A' },
];

/* ─────────────────────────── HELPERS ───────────────────────── */

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function pct(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

function useGoals(): [Goal[], (g: Goal[]) => void] {
  const [goals, setGoalsState] = useState<Goal[]>(() => {
    try {
      const stored = localStorage.getItem('fw_goals');
      return stored ? JSON.parse(stored) : DEFAULT_GOALS;
    } catch { return DEFAULT_GOALS; }
  });
  const setGoals = useCallback((g: Goal[]) => {
    setGoalsState(g);
    localStorage.setItem('fw_goals', JSON.stringify(g));
  }, []);
  return [goals, setGoals];
}

/* ─────────────────────────── RING ──────────────────────────── */

function ProgressRing({ value, max, color, size = 72, stroke = 7 }: {
  value: number; max: number; color: string; size?: number; stroke?: number;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(1, value / Math.max(1, max));
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="currentColor" strokeWidth={stroke} className="text-border" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - circ * filled }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INSIGHTS TAB
═══════════════════════════════════════════════════════════════ */

function InsightsTab() {
  const { transactions } = useAppContext();
  const [period, setPeriod] = useState<30 | 90>(30);

  /* ── Data derivations ── */
  const { periodTx, thisPeriodTx, prevPeriodTx, categoryTotals, totalSpend } = useMemo(() => {
    const half = period / 2;
    const cutoff = subDays(new Date(), period);
    const halfCutoff = subDays(new Date(), half);
    const prevCutoff = subDays(new Date(), period);

    const periodTx = transactions.filter(t => new Date(t.date) >= cutoff);
    const thisPeriodTx = transactions.filter(t => new Date(t.date) >= halfCutoff);
    const prevPeriodTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= prevCutoff && d < halfCutoff;
    });

    const categoryTotals: Record<string, number> = {};
    for (const cat of Object.keys(CATEGORY_COLORS)) {
      categoryTotals[cat] = periodTx
        .filter(t => t.category === cat)
        .reduce((s, t) => s + t.amount, 0);
    }
    const totalSpend = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    return { periodTx, thisPeriodTx, prevPeriodTx, categoryTotals, totalSpend };
  }, [transactions, period]);

  /* ── Health Score ── */
  const { healthScore, healthLabel, healthColor, breakdown } = useMemo(() => {
    const catCount = Object.values(categoryTotals).filter(v => v > 0).length;
    const channelCount = new Set(periodTx.map(t => t.captureChannel)).size;
    const thisTotal = thisPeriodTx.reduce((s, t) => s + t.amount, 0);
    const prevTotal = prevPeriodTx.reduce((s, t) => s + t.amount, 0);
    const trendOk = prevTotal > 0 && thisTotal <= prevTotal;

    const spendingCtrl = Math.min(40, Math.max(10, 40 - Math.floor(totalSpend / 800)));
    const diversity = Math.min(20, catCount * 4);
    const engagement = Math.min(15, channelCount * 4);
    const trendPts = trendOk ? 15 : prevTotal === 0 ? 8 : 0;
    const txCount = Math.min(10, Math.floor(periodTx.length / 3));
    const score = spendingCtrl + diversity + engagement + trendPts + txCount;

    const label = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Fair' : 'Needs Work';
    const color = score >= 80 ? '#16A34A' : score >= 65 ? '#10B981' : score >= 45 ? '#F59E0B' : '#EF4444';

    return {
      healthScore: score,
      healthLabel: label,
      healthColor: color,
      breakdown: [
        { label: 'Spending Control', value: spendingCtrl, max: 40 },
        { label: 'Category Diversity', value: diversity, max: 20 },
        { label: 'App Engagement', value: engagement, max: 15 },
        { label: 'Spending Trend', value: trendPts, max: 15 },
      ],
    };
  }, [categoryTotals, periodTx, thisPeriodTx, prevPeriodTx, totalSpend]);

  /* ── Category sorted ── */
  const sortedCategories = useMemo(() =>
    Object.entries(categoryTotals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]),
    [categoryTotals]
  );

  /* ── Trends ── */
  const trends = useMemo(() => {
    const result: { cat: string; thisAmt: number; prevAmt: number; pct: number }[] = [];
    for (const cat of Object.keys(CATEGORY_COLORS)) {
      const thisAmt = thisPeriodTx.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0);
      const prevAmt = prevPeriodTx.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0);
      if (thisAmt === 0 && prevAmt === 0) continue;
      const pctChange = prevAmt === 0 ? (thisAmt > 0 ? 100 : 0) : Math.round(((thisAmt - prevAmt) / prevAmt) * 100);
      result.push({ cat, thisAmt, prevAmt, pct: pctChange });
    }
    return result.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 4);
  }, [thisPeriodTx, prevPeriodTx]);

  /* ── AI Insight chips ── */
  const insights = useMemo(() => {
    const items: { icon: React.ReactNode; text: string }[] = [];

    if (sortedCategories[0]) {
      items.push({
        icon: <ShoppingBag size={13} />,
        text: `Top category: ${sortedCategories[0][0]} — EGP ${fmt(sortedCategories[0][1])}`,
      });
    }
    const avgDaily = Math.round(totalSpend / period);
    items.push({ icon: <Calendar size={13} />, text: `Avg daily spend: EGP ${fmt(avgDaily)}` });
    items.push({ icon: <BarChart2 size={13} />, text: `${periodTx.length} transactions logged` });

    const channelMap: Record<string, number> = {};
    periodTx.forEach(t => { channelMap[t.captureChannel] = (channelMap[t.captureChannel] || 0) + 1; });
    const topCh = Object.entries(channelMap).sort((a, b) => b[1] - a[1])[0];
    if (topCh) items.push({ icon: <Zap size={13} />, text: `Most-used capture: ${topCh[0]}` });

    const biggest = [...periodTx].sort((a, b) => b.amount - a.amount)[0];
    if (biggest) items.push({ icon: <Sparkles size={13} />, text: `Biggest spend: EGP ${fmt(biggest.amount)} at ${biggest.merchant}` });

    return items;
  }, [sortedCategories, periodTx, totalSpend, period]);

  /* ── Forecast chart data ── */
  const chartData = useMemo(() => {
    const days = period;
    const data: { date: string; amount: number; avg: number }[] = [];
    const totals: number[] = [];
    for (let i = days; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const ds = day.toISOString().split('T')[0];
      const amt = transactions.filter(t => t.date.startsWith(ds)).reduce((s, t) => s + t.amount, 0);
      totals.push(amt);
      data.push({ date: format(day, 'MMM d'), amount: amt, avg: 0 });
    }
    const runAvg = totals.reduce((s, v) => s + v, 0) / totals.length;
    return data.map(d => ({ ...d, avg: Math.round(runAvg) }));
  }, [transactions, period]);

  const [showAllCats, setShowAllCats] = useState(false);
  const visibleCats = showAllCats ? sortedCategories : sortedCategories.slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      {/* Period toggle */}
      <div className="flex gap-2">
        {([30, 90] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              period === p
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-card'
            }`}
          >
            {p}d
          </button>
        ))}
      </div>

      {/* AI Insight chips — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {insights.map((ins, i) => (
          <div
            key={i}
            className="flex-none flex items-center gap-1.5 bg-card border border-card-border text-muted-foreground rounded-full px-3 py-1.5 text-[11px] font-medium whitespace-nowrap shadow-sm"
          >
            <span className="text-accent">{ins.icon}</span>
            {ins.text}
          </div>
        ))}
      </div>

      {/* Health Score */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-card-border rounded-3xl p-5 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-bold text-foreground">Financial Health</h3>
          <AIBadge />
        </div>
        <div className="flex items-center gap-5">
          {/* Ring */}
          <div className="relative flex-none">
            <ProgressRing value={healthScore} max={100} color={healthColor} size={88} stroke={8} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-foreground tabular-amounts">{healthScore}</span>
            </div>
          </div>
          {/* Breakdown */}
          <div className="flex-1 flex flex-col gap-2">
            <p className="font-semibold text-sm" style={{ color: healthColor }}>{healthLabel}</p>
            {breakdown.map(b => (
              <div key={b.label} className="flex flex-col gap-0.5">
                <div className="flex justify-between">
                  <span className="text-[10px] text-muted-foreground">{b.label}</span>
                  <span className="text-[10px] font-semibold text-foreground tabular-amounts">{b.value}/{b.max}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: healthColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct(b.value, b.max)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Daily Spend Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-card-border rounded-3xl p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground">Daily Spending</h3>
          <span className="text-xs text-muted-foreground font-medium">Last {period}d</span>
        </div>
        <div className="flex items-end gap-3 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-foreground tabular-amounts">EGP {fmt(totalSpend)}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-xs text-muted-foreground">Daily avg</p>
            <p className="text-lg font-semibold text-muted-foreground tabular-amounts">
              EGP {fmt(Math.round(totalSpend / period))}
            </p>
          </div>
        </div>
        <div className="h-44 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 4, left: 0, bottom: 0 }} barSize={period === 30 ? 6 : 3}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} minTickGap={period === 30 ? 20 : 40} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.12)', fontSize: 12 }}
                formatter={(v: number) => [`EGP ${fmt(v)}`, 'Spend']}
                labelStyle={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}
              />
              <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === chartData.length - 1 ? '#38BDF8' : '#0B1F3A'} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Category Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card border border-card-border rounded-3xl p-5 shadow-sm"
      >
        <h3 className="font-bold text-foreground mb-4">Category Breakdown</h3>
        {sortedCategories.length === 0 ? (
          <p className="text-muted-foreground text-sm">No spending in this period.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleCats.map(([cat, amount], i) => (
              <motion.div
                key={cat}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex flex-col gap-1"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">{cat}</span>
                  <span className="text-sm font-semibold tabular-amounts text-foreground">
                    EGP {fmt(amount)}
                    <span className="text-muted-foreground font-normal ml-1 text-xs">({pct(amount, totalSpend)}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[cat as Category] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct(amount, totalSpend)}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut', delay: 0.05 * i }}
                  />
                </div>
              </motion.div>
            ))}
            {sortedCategories.length > 5 && (
              <button
                onClick={() => setShowAllCats(s => !s)}
                className="text-xs font-medium text-primary flex items-center gap-1 mt-1"
              >
                {showAllCats ? 'Show less' : `Show ${sortedCategories.length - 5} more`}
                <ChevronRight size={12} className={`transition-transform ${showAllCats ? 'rotate-90' : ''}`} />
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Spending Trends */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3"
      >
        <h3 className="font-bold text-foreground ml-1">Spending Trends
          <span className="text-xs font-normal text-muted-foreground ml-2">vs previous {period / 2}d</span>
        </h3>
        {trends.length === 0 ? (
          <p className="text-muted-foreground text-sm px-1">Not enough data yet.</p>
        ) : (
          trends.map((t, i) => (
            <motion.div
              key={t.cat}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              className="bg-card border border-card-border rounded-2xl p-4 shadow-sm flex items-center gap-3"
            >
              <div
                className={`p-2 rounded-full flex-none ${t.pct > 0 ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}
              >
                {t.pct > 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{t.cat}</p>
                <p className="text-xs text-muted-foreground truncate">
                  EGP {fmt(t.thisAmt)} vs EGP {fmt(t.prevAmt)} prior period
                </p>
              </div>
              <span
                className={`text-sm font-bold tabular-amounts flex-none ${t.pct > 0 ? 'text-destructive' : 'text-success'}`}
              >
                {t.pct > 0 ? '+' : ''}{t.pct}%
              </span>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GOAL SIMULATOR TAB
═══════════════════════════════════════════════════════════════ */

function GoalSimulatorTab() {
  const { transactions } = useAppContext();
  const [goals, setGoals] = useGoals();
  const [activeGoalId, setActiveGoalId] = useState<string>(goals[0]?.id ?? '');
  const [showPresets, setShowPresets] = useState(false);
  const [activeScenarios, setActiveScenarios] = useState<Set<string>>(new Set());
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  /* ── Compute scenarios from real transactions ── */
  const scenarios = useMemo(() => {
    const last30 = transactions.filter(t => new Date(t.date) >= subDays(new Date(), 30));

    const foodSpend = last30.filter(t => t.category === 'Food & Drink').reduce((s, t) => s + t.amount, 0);
    const entSpend = last30.filter(t => t.category === 'Entertainment').reduce((s, t) => s + t.amount, 0);
    const shoppingSpend = last30.filter(t => t.category === 'Shopping').reduce((s, t) => s + t.amount, 0);

    const altSaving = AI_ALTERNATIVES
      .filter(alt => last30.some(t => t.merchant.toLowerCase().includes(alt.product.toLowerCase())))
      .reduce((sum, alt) => sum + Math.max(0, alt.currentPrice - alt.altPrice), 0);

    return [
      {
        id: 'food',
        label: 'Reduce Food & Drink by 20%',
        detail: foodSpend > 0 ? `Based on EGP ${fmt(foodSpend)} spent` : 'Estimated',
        saving: Math.round(foodSpend * 0.2) || 400,
        icon: '🍽️',
      },
      {
        id: 'alts',
        label: 'Switch to cheaper alternatives',
        detail: `${AI_ALTERNATIVES.filter(a => last30.some(t => t.merchant.toLowerCase().includes(a.product.toLowerCase()))).length} matches in your history`,
        saving: altSaving || 320,
        icon: '🔄',
      },
      {
        id: 'ent',
        label: 'Cut entertainment by 30%',
        detail: entSpend > 0 ? `Based on EGP ${fmt(entSpend)} spent` : 'Estimated',
        saving: Math.round(entSpend * 0.3) || 90,
        icon: '🎬',
      },
      {
        id: 'shopping',
        label: 'Reduce shopping by 25%',
        detail: shoppingSpend > 0 ? `Based on EGP ${fmt(shoppingSpend)} spent` : 'Estimated',
        saving: Math.round(shoppingSpend * 0.25) || 250,
        icon: '🛍️',
      },
    ];
  }, [transactions]);

  const extraSavings = scenarios
    .filter(s => activeScenarios.has(s.id))
    .reduce((sum, s) => sum + s.saving, 0);

  const activeGoal = goals.find(g => g.id === activeGoalId) ?? goals[0];
  const baseMonthlySavings = activeGoal?.monthly ?? 0;
  const totalMonthly = baseMonthlySavings + extraSavings;
  const remaining = activeGoal ? Math.max(0, activeGoal.target - activeGoal.saved) : 0;
  const baseMonths = baseMonthlySavings > 0 ? Math.ceil(remaining / baseMonthlySavings) : Infinity;
  const newMonths = totalMonthly > 0 ? Math.ceil(remaining / totalMonthly) : Infinity;
  const monthsSaved = isFinite(baseMonths) && isFinite(newMonths) ? Math.max(0, baseMonths - newMonths) : 0;

  const toggleScenario = (id: string) => {
    setActiveScenarios(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateGoal = (id: string, patch: Partial<Goal>) => {
    setGoals(goals.map(g => g.id === id ? { ...g, ...patch } : g));
  };

  const removeGoal = (id: string) => {
    const next = goals.filter(g => g.id !== id);
    setGoals(next);
    if (activeGoalId === id) setActiveGoalId(next[0]?.id ?? '');
  };

  const addGoal = (preset: Omit<Goal, 'id' | 'saved' | 'monthly'>) => {
    const newGoal: Goal = {
      ...preset,
      id: Math.random().toString(36).slice(2, 9),
      saved: 0,
      monthly: 2000,
    };
    const next = [...goals, newGoal];
    setGoals(next);
    setActiveGoalId(newGoal.id);
    setShowPresets(false);
  };

  return (
    <div className="flex flex-col gap-5">

      {/* ── My Goals ── */}
      <div>
        <div className="flex items-center justify-between mb-3 ml-1">
          <h3 className="font-bold text-foreground">My Goals</h3>
          <button
            onClick={() => setShowPresets(s => !s)}
            className="flex items-center gap-1 text-sm font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full"
          >
            <Plus size={14} /> Add Goal
          </button>
        </div>

        {/* Preset picker */}
        <AnimatePresence>
          {showPresets && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="bg-muted/60 border border-border rounded-2xl p-3 flex flex-col gap-2">
                <p className="text-xs font-semibold text-muted-foreground px-1 mb-1">Choose a preset</p>
                {GOAL_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => addGoal(preset)}
                    className="flex items-center gap-3 bg-card border border-card-border rounded-xl p-3 text-left hover:border-primary/40 transition-colors"
                  >
                    <span className="text-xl">{preset.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground">{preset.name}</p>
                      <p className="text-xs text-muted-foreground">Target: EGP {fmt(preset.target)}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Goal cards */}
        {goals.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-6 text-center text-muted-foreground text-sm">
            No goals yet. Tap "Add Goal" to get started.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {goals.map(goal => {
              const gRemaining = Math.max(0, goal.target - goal.saved);
              const gMonths = goal.monthly > 0 ? Math.ceil(gRemaining / goal.monthly) : null;
              const isActive = goal.id === activeGoalId;
              const isEditing = editingGoalId === goal.id;

              return (
                <motion.div
                  key={goal.id}
                  layout
                  onClick={() => !isEditing && setActiveGoalId(goal.id)}
                  className={`bg-card border-2 rounded-3xl p-4 shadow-sm cursor-pointer transition-all ${
                    isActive ? 'border-primary/60 shadow-primary/10 shadow-md' : 'border-card-border'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Progress ring */}
                    <div className="relative flex-none">
                      <ProgressRing
                        value={goal.saved} max={goal.target}
                        color={goal.color} size={64} stroke={6}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg">{goal.emoji}</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-foreground truncate">{goal.name}</p>
                        <div className="flex gap-1 flex-none">
                          <button
                            onClick={e => { e.stopPropagation(); setEditingGoalId(isEditing ? null : goal.id); }}
                            className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground font-medium"
                          >
                            {isEditing ? 'Done' : 'Edit'}
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); removeGoal(goal.id); }}
                            className="p-1 text-muted-foreground hover:text-destructive rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mt-0.5">
                        EGP {fmt(goal.saved)} saved of EGP {fmt(goal.target)} · {pct(goal.saved, goal.target)}%
                      </p>
                      {gMonths !== null && (
                        <p className="text-xs mt-1 font-semibold" style={{ color: goal.color }}>
                          {gMonths <= 0 ? '🎉 Goal reached!' : `~${gMonths} months at current rate`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Editable fields */}
                  <AnimatePresence>
                    {isEditing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Goal Name</label>
                            <input
                              value={goal.name}
                              onChange={e => updateGoal(goal.id, { name: e.target.value })}
                              className="text-sm font-semibold bg-muted/40 border border-border rounded-lg px-2 py-1.5 outline-none focus:border-primary text-foreground w-full"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Emoji</label>
                            <input
                              value={goal.emoji}
                              onChange={e => updateGoal(goal.id, { emoji: e.target.value })}
                              className="text-sm bg-muted/40 border border-border rounded-lg px-2 py-1.5 outline-none focus:border-primary text-foreground w-full"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Target (EGP)</label>
                            <input
                              type="number" value={goal.target}
                              onChange={e => updateGoal(goal.id, { target: Number(e.target.value) })}
                              className="text-sm tabular-amounts bg-muted/40 border border-border rounded-lg px-2 py-1.5 outline-none focus:border-primary text-foreground w-full"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Already Saved (EGP)</label>
                            <input
                              type="number" value={goal.saved}
                              onChange={e => updateGoal(goal.id, { saved: Number(e.target.value) })}
                              className="text-sm tabular-amounts bg-muted/40 border border-border rounded-lg px-2 py-1.5 outline-none focus:border-primary text-foreground w-full"
                            />
                          </div>
                          <div className="flex flex-col gap-1 col-span-2">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Monthly Contribution (EGP)</label>
                            <input
                              type="number" value={goal.monthly}
                              onChange={e => updateGoal(goal.id, { monthly: Number(e.target.value) })}
                              className="text-sm tabular-amounts bg-muted/40 border border-border rounded-lg px-2 py-1.5 outline-none focus:border-primary text-foreground w-full"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── AI Scenarios ── */}
      {activeGoal && (
        <div>
          <div className="flex items-center gap-2 mb-3 ml-1">
            <h3 className="font-bold text-foreground">AI Scenarios</h3>
            <AIBadge />
          </div>
          <p className="text-xs text-muted-foreground ml-1 mb-3">
            Based on your real spending — toggle to see impact on <strong>{activeGoal.name}</strong>
          </p>
          <div className="flex flex-col gap-2.5">
            {scenarios.map(s => {
              const on = activeScenarios.has(s.id);
              return (
                <motion.label
                  key={s.id}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 border-2 rounded-2xl p-4 cursor-pointer transition-all ${
                    on ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-none transition-all ${
                    on ? 'bg-primary border-primary' : 'border-border'
                  }`}>
                    {on && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={on}
                    onChange={() => toggleScenario(s.id)}
                  />
                  <span className="text-lg flex-none">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.detail}</p>
                  </div>
                  <span className="text-xs font-bold text-success flex-none tabular-amounts">+EGP {fmt(s.saving)}/mo</span>
                </motion.label>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Result card ── */}
      {activeGoal && (
        <motion.div
          layout
          className="relative overflow-hidden rounded-3xl shadow-lg"
          style={{ background: `linear-gradient(135deg, #0B1F3A 0%, #0f2d50 100%)` }}
        >
          {/* Decorative rings */}
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full border border-white/10" />
          <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full border border-white/8" />

          <div className="relative z-10 p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-2xl">{activeGoal.emoji}</span>
              <span className="text-white/70 text-sm font-medium">{activeGoal.name}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <p className="text-white/60 text-xs mb-1">Without changes</p>
                <p className="text-2xl font-bold text-white tabular-amounts">
                  {isFinite(baseMonths) ? `${baseMonths} mo` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[#38BDF8] text-xs font-semibold mb-1">With AI scenarios</p>
                <p className="text-2xl font-bold text-white tabular-amounts">
                  {isFinite(newMonths) ? `${newMonths} mo` : '—'}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-5">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white/60">Progress: EGP {fmt(activeGoal.saved)}</span>
                <span className="text-white/60">EGP {fmt(activeGoal.target)}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: activeGoal.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct(activeGoal.saved, activeGoal.target)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Savings callout */}
            <AnimatePresence>
              {extraSavings > 0 && isFinite(monthsSaved) && monthsSaved > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="bg-white/10 border border-white/20 rounded-2xl p-3 flex items-center gap-3 backdrop-blur-sm"
                >
                  <Sparkles size={18} className="text-[#38BDF8] flex-none" />
                  <p className="text-sm text-white">
                    You reach your goal <strong className="text-[#38BDF8]">{monthsSaved} month{monthsSaved !== 1 ? 's' : ''} earlier</strong> and save{' '}
                    <strong className="text-[#38BDF8]">EGP {fmt(extraSavings)}/mo</strong> more
                  </p>
                </motion.div>
              )}
              {extraSavings > 0 && (!isFinite(monthsSaved) || monthsSaved === 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 border border-white/20 rounded-2xl p-3 flex items-center gap-3"
                >
                  <Sparkles size={18} className="text-[#38BDF8] flex-none" />
                  <p className="text-sm text-white">
                    Extra <strong className="text-[#38BDF8]">EGP {fmt(extraSavings)}/mo</strong> from these scenarios
                  </p>
                </motion.div>
              )}
              {extraSavings === 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-white/40 text-xs text-center"
                >
                  Toggle scenarios above to see your accelerated timeline
                </motion.p>
              )}
            </AnimatePresence>

            {/* Monthly breakdown */}
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-xs text-white/60">
              <span>Base savings: EGP {fmt(baseMonthlySavings)}/mo</span>
              {extraSavings > 0 && (
                <span className="text-[#38BDF8] font-semibold">Total: EGP {fmt(totalMonthly)}/mo</span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE ROOT
═══════════════════════════════════════════════════════════════ */

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<'insights' | 'goals'>('insights');

  return (
    <div className="pb-28 min-h-[100dvh] bg-background">
      {/* Sticky tab bar */}
      <div className="sticky top-14 z-20 bg-background/90 backdrop-blur px-4 pt-2 pb-3 border-b border-border/50">
        <div className="flex bg-muted rounded-xl p-1">
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'insights' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Insights <AIBadge className="ml-1" />
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'goals' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Goal Simulator <Target size={13} className="inline ml-1 mb-0.5" />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto w-full px-4 pt-4">
        <AnimatePresence mode="wait">
          {activeTab === 'insights' ? (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <InsightsTab />
            </motion.div>
          ) : (
            <motion.div
              key="goals"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <GoalSimulatorTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
