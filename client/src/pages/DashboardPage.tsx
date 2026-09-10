import { useMemo } from 'react';
import { Link } from 'wouter';
import { useAppContext } from '../contexts/AppContext';
import { TransactionRow } from '../components/TransactionRow';
import { Category, CATEGORY_COLORS } from '../data/seedData';
import { ChevronRight, TrendingUp, Zap, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIBadge } from '../components/CategoryBadge';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

const categoryContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const categoryItemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 }
};

export default function DashboardPage() {
  const { transactions, user } = useAppContext();

  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [transactions]);

  const previousMonthTransactions = useMemo(() => {
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });
  }, [transactions]);

  const totalSpend = currentMonthTransactions.reduce((acc, curr) => acc + curr.amount, 0);
  const prevMonthSpend = previousMonthTransactions.reduce((acc, curr) => acc + curr.amount, 0);

  const momChangePct = useMemo(() => {
    if (prevMonthSpend === 0) return totalSpend > 0 ? 100 : 0;
    return Math.round(((totalSpend - prevMonthSpend) / prevMonthSpend) * 100);
  }, [totalSpend, prevMonthSpend]);

  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    currentMonthTransactions.forEach(t => {
      breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
    });
    
    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // top 6
  }, [currentMonthTransactions]);

  const maxCategoryAmount = categoryBreakdown.length > 0 ? Math.max(...categoryBreakdown.map(c => c.value)) : 0;
  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const currentDay = today.getDate();
  const monthProgress = Math.min(100, (currentDay / daysInMonth) * 100);
  const avgPerDay = currentDay > 0 ? totalSpend / currentDay : 0;

  const dynamicInsights = useMemo(() => {
    const list = [];
    if (topCategory && totalSpend > 0) {
      const pct = Math.round((topCategory.value / totalSpend) * 100);
      list.push({
        id: 1,
        icon: TrendingUp,
        text: `${topCategory.name} is your top spend (${pct}% of total)`
      });
    }
    const transportSpend = categoryBreakdown.find(c => c.name === 'Transport')?.value || 0;
    if (transportSpend > 200) {
      list.push({
        id: 2,
        icon: Zap,
        text: 'Save EGP 240 by switching some rides to Metro'
      });
    } else {
      list.push({
        id: 2,
        icon: Zap,
        text: 'Daily average is EGP ' + Math.round(avgPerDay)
      });
    }
    if (momChangePct <= 0) {
      list.push({
        id: 3,
        icon: Check,
        text: `Spending is down ${Math.abs(momChangePct)}% vs last month`
      });
    } else {
      list.push({
        id: 3,
        icon: TrendingUp,
        text: `Spending up +${momChangePct}% vs last month`
      });
    }
    return list;
  }, [topCategory, totalSpend, categoryBreakdown, avgPerDay, momChangePct]);

  const recentTransactions = transactions.slice(0, 5);

  if (transactions.length === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center bg-background">
        <h2 className="text-2xl font-bold mb-2 text-foreground">Welcome to FundWise</h2>
        <p className="text-muted-foreground mb-8">Start tracking your expenses using AI.</p>
        <Link href="/manual">
          <button className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity">
            Add your first expense
          </button>
        </Link>
      </div>
    );
  }

  const firstName = user?.name ? user.name.split(' ')[0] : 'Youssef';

  return (
    <div className="pb-28 min-h-[100dvh] bg-background selection:bg-accent/20">
      <div className="max-w-md mx-auto w-full pt-4 px-4 flex flex-col gap-6">
        
        {/* Hero Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="w-full bg-gradient-to-br from-[#0B1F3A] to-[#0f2d52] rounded-[24px] p-6 shadow-lg text-white flex flex-col gap-6 relative overflow-hidden"
        >
          {/* Top row */}
          <div className="flex items-center justify-between relative z-10">
            <span className="font-medium text-white/90">Good morning, {firstName}</span>
            <AIBadge />
          </div>

          {/* Main Stats */}
          <div className="flex flex-col gap-1 relative z-10 mt-2">
            <div className="text-[10px] uppercase tracking-widest text-white/60 font-semibold mb-1">Total Spend</div>
            <div className="text-4xl font-bold tabular-nums tracking-tight">EGP {totalSpend.toLocaleString()}</div>
            <div className="text-xs text-white/60 mt-1.5 font-medium">
              {today.toLocaleString('default', { month: 'long', year: 'numeric' })} · {currentMonthTransactions.length} transactions
            </div>
          </div>

          {/* Progress */}
          <div className="flex flex-col gap-2.5 relative z-10 mt-3">
            <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${monthProgress}%` }}
                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                className="h-full bg-white/90 rounded-full" 
              />
            </div>
            <div className="text-xs text-white/60 font-medium">
              EGP {Math.round(avgPerDay).toLocaleString()} avg/day · {currentDay} days tracked
            </div>
          </div>

          {/* Bottom Row Stats */}
          <div className="grid grid-cols-3 gap-2.5 pt-3 relative z-10">
            <div className="bg-white/10 rounded-2xl p-3 flex flex-col justify-center items-center gap-2 text-center backdrop-blur-sm border border-white/5">
              <span className="text-[10px] text-white/60 uppercase tracking-widest font-semibold">Top Category</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: topCategory ? CATEGORY_COLORS[topCategory.name as Category] : '#fff' }} />
                <span className="text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis max-w-[65px]">{topCategory?.name || 'N/A'}</span>
              </div>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 flex flex-col justify-center items-center gap-2 text-center backdrop-blur-sm border border-white/5">
              <span className="text-[10px] text-white/60 uppercase tracking-widest font-semibold">Transactions</span>
              <span className="text-xs font-semibold">{currentMonthTransactions.length}</span>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 flex flex-col justify-center items-center gap-2 text-center backdrop-blur-sm border border-white/5">
              <span className="text-[10px] text-white/60 uppercase tracking-widest font-semibold">vs Last Month</span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                momChangePct <= 0 ? 'text-emerald-300 bg-emerald-400/10' : 'text-amber-300 bg-amber-400/10'
              }`}>
                {momChangePct > 0 ? `+${momChangePct}%` : `${momChangePct}%`}
              </span>
            </div>
          </div>
        </motion.div>

        {/* AI Insight Strip */}
        <div className="-mx-4 px-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <AnimatePresence>
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="flex gap-3 w-max pb-1"
            >
              {dynamicInsights.map(insight => (
                <motion.div 
                  key={insight.id}
                  variants={itemVariants} 
                  className="flex-shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-[14px] bg-accent/10 border border-accent/20 shadow-sm"
                >
                  <insight.icon size={16} className="text-accent" />
                  <span className="text-sm font-medium text-foreground">{insight.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Category Breakdown */}
        {categoryBreakdown.length > 0 && (
          <div className="flex flex-col mt-2">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="font-semibold text-foreground tracking-tight">Spending by Category</h3>
              <Link href="/transactions">
                <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-0.5">
                  View All <ChevronRight size={14} className="opacity-70" />
                </span>
              </Link>
            </div>
            
            <motion.div 
              variants={categoryContainerVariants}
              initial="hidden"
              animate="show"
              className="flex flex-col bg-card rounded-3xl p-5 shadow-sm border border-card-border"
            >
              {categoryBreakdown.map((entry, idx) => {
                const color = CATEGORY_COLORS[entry.name as Category] || CATEGORY_COLORS.Other;
                const width = maxCategoryAmount > 0 ? (entry.value / maxCategoryAmount) * 100 : 0;
                const percentage = totalSpend > 0 ? Math.round((entry.value / totalSpend) * 100) : 0;

                return (
                  <motion.div key={entry.name} variants={categoryItemVariants} className="flex flex-col py-3.5 border-b border-border/40 last:border-0 last:pb-0 first:pt-0 gap-2.5 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                        <span className="font-medium text-sm text-foreground">{entry.name}</span>
                      </div>
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-semibold text-sm tabular-nums tracking-tight">EGP {entry.value.toLocaleString()}</span>
                        <span className="text-[11px] font-medium text-muted-foreground w-8 text-right bg-muted px-1.5 py-0.5 rounded-md">{percentage}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 0.8, delay: 0.1 + (idx * 0.05), ease: "easeOut" }}
                        className="h-full rounded-full" 
                        style={{ backgroundColor: color }} 
                      />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="flex flex-col mt-4">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-semibold text-foreground tracking-tight">Recent Activity</h3>
            <Link href="/transactions">
              <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-0.5">
                See all <ChevronRight size={14} className="opacity-70" />
              </span>
            </Link>
          </div>
          <div className="flex flex-col gap-1.5">
            {recentTransactions.map((tx) => (
              <TransactionRow key={tx.id} transaction={tx} />
            ))}
          </div>
          
          <Link href="/transactions" className="mt-5">
            <button className="w-full py-3.5 rounded-[14px] border border-primary/20 dark:border-white/10 bg-primary/5 dark:bg-white/5 text-primary dark:text-white font-semibold hover:bg-primary/10 dark:hover:bg-white/10 transition-colors">
              See all transactions →
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
}
