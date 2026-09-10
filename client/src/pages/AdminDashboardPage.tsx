import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowLeft, ArrowUpRight, BarChart3, Check, ChevronRight,
  Download, Eye, FileCheck2, LayoutDashboard, Menu, Search, ShieldCheck, Sparkles, TrendingUp,
  UserRound, Users, X,
} from 'lucide-react';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import type { AdminOverview } from '../types/admin';
import { useAppContext } from '../contexts/AppContext';
import { CATEGORY_COLORS, Category, Transaction } from '../data/seedData';

type AdminView = 'overview' | 'transactions' | 'users' | 'ai';
type Range = 7 | 30 | 90;

function fmt(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function StatCard({ label, value, helper, trend, icon: Icon, color }: {
  label: string; value: string; helper: string; trend?: number; icon: typeof Activity; color: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-card-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18`, color }}><Icon size={18} /></div>
        {trend !== undefined && <span className={`text-[11px] font-bold flex items-center gap-0.5 ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
          {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(trend)}%
        </span>}
      </div>
      <p className="text-xs text-muted-foreground mt-4">{label}</p>
      <p className="text-2xl font-bold text-foreground tabular-amounts mt-0.5">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{helper}</p>
    </motion.div>
  );
}

function AdminSidebar({ view, setView, transactionCount }: { view: AdminView; setView: (view: AdminView) => void; transactionCount: number }) {
  const items: { id: AdminView; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'ai', label: 'AI Quality', icon: Sparkles },
  ];
  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col gap-2">
      <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground px-3 mb-2">Workspace</p>
      {items.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-left transition-colors ${view === id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-card hover:text-foreground'}`}>
        <Icon size={17} />{label}{id === 'transactions' && <span className="ml-auto text-[10px] opacity-70">{transactionCount}</span>}
      </button>)}
      <div className="mt-auto rounded-2xl bg-primary p-4 text-primary-foreground overflow-hidden relative">
        <ShieldCheck size={58} className="absolute -right-3 -bottom-3 opacity-10" />
        <p className="text-xs font-bold relative z-10">Production workspace</p>
        <p className="text-[10px] text-white/65 leading-relaxed mt-1 relative z-10">Live records, role-protected and persisted across sessions.</p>
      </div>
    </aside>
  );
}

function MobileAdminTabs({ view, setView }: { view: AdminView; setView: (view: AdminView) => void }) {
  const items: { id: AdminView; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard }, { id: 'transactions', label: 'Activity', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users }, { id: 'ai', label: 'AI Quality', icon: Sparkles },
  ];
  return <div className="lg:hidden flex gap-2 overflow-x-auto pb-1 scrollbar-none">{items.map(({ id, label, icon: Icon }) =>
    <button key={id} onClick={() => setView(id)} className={`flex-none flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${view === id ? 'bg-primary text-primary-foreground' : 'bg-card border border-card-border text-muted-foreground'}`}>
      <Icon size={14} />{label}
    </button>)}</div>;
}

function TransactionTable({ transactions, onReview }: { transactions: Transaction[]; onReview: (transaction: Transaction) => void }) {
  return <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
    <div className="hidden sm:grid grid-cols-[1.6fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 bg-muted/50 border-b border-border text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
      <span>Merchant</span><span>Category</span><span>Amount</span><span>Captured</span><span>Status</span>
    </div>
    <div className="divide-y divide-border">{transactions.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No transactions match your filters.</div> :
      transactions.map(tx => {
        const reviewed = tx.reviewStatus && tx.reviewStatus !== 'pending';
        return <div key={tx.id} className="grid sm:grid-cols-[1.6fr_1fr_1fr_1fr_auto] gap-2 sm:gap-3 items-center px-4 py-3.5">
          <div className="min-w-0"><p className="font-semibold text-sm text-foreground truncate">{tx.merchant}</p><p className="text-[11px] text-muted-foreground">{format(new Date(tx.date), 'MMM d, yyyy')} · #{tx.id.slice(0, 8)}</p></div>
          <span className="text-xs text-muted-foreground">{tx.category}</span><span className="text-sm font-bold tabular-amounts text-foreground">EGP {fmt(tx.amount)}</span>
          <span className="text-xs text-muted-foreground capitalize">{tx.captureChannel}</span>
          <div className="flex items-center justify-between sm:justify-end gap-2">
            {tx.isLowConfidence && !reviewed ? <button onClick={() => onReview(tx)} className="flex items-center gap-1 text-[11px] font-bold text-warning-foreground bg-warning/15 rounded-full px-2 py-1 hover:bg-warning/25"><AlertTriangle size={12} /> Review</button> :
              <span className={`flex items-center gap-1 text-[11px] font-bold ${tx.reviewStatus === 'rejected' ? 'text-destructive' : 'text-success'}`}><Check size={13} />{tx.reviewStatus === 'rejected' ? 'Rejected' : reviewed ? 'Reviewed' : 'Verified'}</span>}
            <span className="text-muted-foreground" aria-hidden="true"><ChevronRight size={16} /></span>
          </div>
        </div>;
      })}</div>
  </div>;
}

function ActivityList({ activity }: { activity: AdminOverview['activity'] }) {
  const iconFor = (type: string) => type === 'review' ? FileCheck2 : type === 'user' ? UserRound : type === 'export' ? Download : type === 'transaction' ? FileCheck2 : Sparkles;
  const colorFor = (type: string) => type === 'review' ? '#16A34A' : type === 'user' ? '#8B5CF6' : type === 'export' ? '#F59E0B' : '#38BDF8';
  return <div className="bg-card border border-card-border rounded-2xl p-4 shadow-sm divide-y divide-border">
    {activity.length === 0 ? <p className="py-4 text-sm text-muted-foreground text-center">No activity recorded yet.</p> : activity.map(item => {
      const Icon = iconFor(item.type); const color = colorFor(item.type);
      return <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18`, color }}><Icon size={15} /></div>
        <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-foreground truncate">{item.title}</p><p className="text-[11px] text-muted-foreground truncate">{item.detail ?? '—'}</p></div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
      </div>;
    })}
  </div>;
}

function OverviewView({ data, range, setRange, onReview, onViewTransactions }: {
  data: AdminOverview; range: Range; setRange: (range: Range) => void; onReview: (transaction: Transaction) => void; onViewTransactions: () => void;
}) {
  const transactions = data.transactions.map(toLocalTransaction);
  const current = useMemo(() => transactions.filter(tx => new Date(tx.date) >= subDays(new Date(), range)), [transactions, range]);
  const categoryTotals = Object.entries(CATEGORY_COLORS).map(([category, color]) => ({ category, color, value: current.filter(tx => tx.category === category).reduce((sum, tx) => sum + tx.amount, 0) })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  const volumeData = useMemo(() => Array.from({ length: Math.min(range, 30) }, (_, index) => {
    const day = subDays(new Date(), Math.min(range, 30) - index - 1); const key = day.toISOString().split('T')[0];
    return { date: format(day, Math.min(range, 30) > 14 ? 'MMM d' : 'd MMM'), amount: transactions.filter(tx => tx.date.startsWith(key)).reduce((sum, tx) => sum + tx.amount, 0) };
  }), [transactions, range]);
  const { metrics } = data;
  return <div className="flex flex-col gap-5">
    <div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Platform pulse</p><h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Good morning, admin.</h1></div>
      <div className="flex bg-muted rounded-lg p-1">{([7, 30, 90] as Range[]).map(item => <button key={item} onClick={() => setRange(item)} className={`px-2.5 py-1.5 rounded-md text-xs font-semibold ${range === item ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>{item}d</button>)}</div>
    </div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <StatCard label="Gross volume" value={`EGP ${fmt(metrics.currentVolume)}`} helper={`Last ${range} days`} trend={metrics.volumeChangePct} icon={TrendingUp} color="#38BDF8" />
      <StatCard label="Active users" value={String(metrics.activeUsers)} helper={`of ${metrics.totalUsers} registered`} icon={Users} color="#16A34A" />
      <StatCard label="AI capture rate" value={`${metrics.aiCaptureRate}%`} helper={`${metrics.capturedTransactions} of ${metrics.currentTransactions} transactions`} icon={Sparkles} color="#8B5CF6" />
      <StatCard label="Needs review" value={String(metrics.needsReview)} helper="Low-confidence items" icon={AlertTriangle} color="#F59E0B" />
    </div>
    <div className="grid xl:grid-cols-[1.6fr_1fr] gap-5">
      <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm"><div className="flex items-start justify-between mb-4"><div><h2 className="font-bold text-foreground">Transaction volume</h2><p className="text-xs text-muted-foreground mt-1">Daily processed spend across the platform</p></div>
        <div className={`flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-1 ${metrics.volumeChangePct >= 0 ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'}`}>{metrics.volumeChangePct >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(metrics.volumeChangePct)}%</div></div>
        <div className="h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={volumeData} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}><defs><linearGradient id="adminVolume" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38BDF8" stopOpacity={0.35} /><stop offset="95%" stopColor="#38BDF8" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={24} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={42} /><Tooltip contentStyle={{ borderRadius: 10, border: 'none', fontSize: 12 }} formatter={(value: number) => [`EGP ${fmt(value)}`, 'Volume']} /><Area type="monotone" dataKey="amount" stroke="#38BDF8" strokeWidth={2.5} fill="url(#adminVolume)" /></AreaChart></ResponsiveContainer></div>
      </div>
      <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm"><div className="flex items-start justify-between mb-4"><div><h2 className="font-bold text-foreground">Category mix</h2><p className="text-xs text-muted-foreground mt-1">Where platform spend is going</p></div><BarChart3 size={18} className="text-muted-foreground" /></div>
        <div className="h-44"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryTotals.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}><XAxis type="number" hide /><YAxis type="category" dataKey="category" width={95} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 10, border: 'none', fontSize: 12 }} formatter={(value: number) => [`EGP ${fmt(value)}`, 'Spend']} /><Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={14}>{categoryTotals.slice(0, 6).map(item => <Cell key={item.category} fill={item.color} />)}</Bar></BarChart></ResponsiveContainer></div>
        <div className="flex items-center justify-between pt-3 border-t border-border text-xs"><span className="text-muted-foreground">Avg transaction</span><span className="font-bold text-foreground tabular-amounts">EGP {fmt(current.length ? metrics.currentVolume / current.length : 0)}</span></div>
      </div>
    </div>
    <div className="grid xl:grid-cols-[1.35fr_1fr] gap-5"><div><div className="flex items-center justify-between mb-3"><div><h2 className="font-bold text-foreground">Review queue</h2><p className="text-xs text-muted-foreground mt-1">AI transactions that need a human look</p></div><button className="text-xs font-semibold text-primary" onClick={onViewTransactions}>View all <ChevronRight size={13} className="inline" /></button></div>
      <TransactionTable transactions={transactions.filter(tx => tx.isLowConfidence && tx.reviewStatus === 'pending').slice(0, 4)} onReview={onReview} /></div>
      <div><div className="flex items-center justify-between mb-3"><div><h2 className="font-bold text-foreground">Live activity</h2><p className="text-xs text-muted-foreground mt-1">Latest platform events</p></div><Activity size={17} className="text-success" /></div><ActivityList activity={data.activity} /></div>
    </div>
    <div className="bg-card border border-card-border rounded-2xl p-4 shadow-sm"><div className="flex items-center justify-between mb-3"><div><h2 className="font-bold text-foreground">Saved exports</h2><p className="text-xs text-muted-foreground mt-1">Audit trail of administrator downloads</p></div><Download size={17} className="text-muted-foreground" /></div>
      {data.exports.length === 0 ? <p className="text-sm text-muted-foreground">No exports have been created.</p> : <div className="flex flex-wrap gap-2">{data.exports.slice(0, 5).map(item => <span key={item.id} className="text-xs bg-muted rounded-full px-3 py-1.5 text-muted-foreground">{item.format.toUpperCase()} · {item.rowCount} rows · {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>)}</div>}
    </div>
  </div>;
}

function TransactionsView({ transactions, onReview }: { transactions: Transaction[]; onReview: (transaction: Transaction) => void }) {
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState<'all' | 'flagged' | 'verified'>('all');
  const filtered = transactions.filter(tx => `${tx.merchant} ${tx.category} ${tx.captureChannel}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || (filter === 'flagged' ? tx.isLowConfidence && tx.reviewStatus === 'pending' : !tx.isLowConfidence || tx.reviewStatus !== 'pending')));
  return <div className="flex flex-col gap-5"><div><p className="text-sm text-muted-foreground">Operations</p><h1 className="text-2xl sm:text-3xl font-bold text-foreground">Transactions</h1></div>
    <div className="flex flex-col sm:flex-row gap-2"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search merchant, category, capture…" className="w-full bg-card border border-card-border rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary text-foreground" /></div>
      <div className="flex bg-muted p-1 rounded-xl">{(['all', 'flagged', 'verified'] as const).map(item => <button key={item} onClick={() => setFilter(item)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${filter === item ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>{item}</button>)}</div></div>
    <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Showing <strong className="text-foreground">{filtered.length}</strong> of {transactions.length}</span><span className="flex items-center gap-1"><ShieldCheck size={13} className="text-success" /> Server audit trail active</span></div><TransactionTable transactions={filtered} onReview={onReview} />
  </div>;
}

function UsersView({ data }: { data: AdminOverview }) {
  const [search, setSearch] = useState(''); const visible = data.users.filter(user => `${user.name} ${user.email} ${user.plan}`.toLowerCase().includes(search.toLowerCase()));
  const { metrics } = data;
  return <div className="flex flex-col gap-5"><div><p className="text-sm text-muted-foreground">People</p><h1 className="text-2xl sm:text-3xl font-bold text-foreground">Users</h1></div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3"><StatCard label="Total users" value={String(metrics.totalUsers)} helper="All persistent registrations" icon={Users} color="#38BDF8" /><StatCard label="Active today" value={String(metrics.activeUsers)} helper="Seen in the last 24 hours" icon={Activity} color="#16A34A" /><StatCard label="Premium users" value={String(metrics.premiumUsers)} helper="Current Premium plan" icon={ShieldCheck} color="#8B5CF6" /><StatCard label="At risk" value={String(metrics.atRiskUsers)} helper="No activity in 7 days" icon={AlertTriangle} color="#F59E0B" /></div>
    <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" className="w-full bg-card border border-card-border rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary text-foreground" /></div>
    <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden"><div className="hidden md:grid grid-cols-[1.5fr_1.5fr_0.7fr_0.8fr_auto] gap-3 px-4 py-3 bg-muted/50 border-b border-border text-[10px] uppercase tracking-wider font-bold text-muted-foreground"><span>User</span><span>Email</span><span>Plan</span><span>Status</span><span>Role</span></div>
      <div className="divide-y divide-border">{visible.map(user => <div key={user.id} className="grid md:grid-cols-[1.5fr_1.5fr_0.7fr_0.8fr_auto] gap-2 md:gap-3 items-center px-4 py-3.5"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">{user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div><span className="font-semibold text-sm text-foreground">{user.name}</span></div><span className="text-xs text-muted-foreground truncate">{user.email}</span><span className="text-xs font-semibold text-foreground">{user.plan}</span><span className={`text-[11px] font-semibold ${user.status === 'Active' ? 'text-success' : 'text-warning-foreground'}`}>{user.status}</span><span className="text-[11px] font-bold text-primary capitalize">{user.role}</span></div>)}</div>
    </div>
  </div>;
}

function AIQualityView({ transactions }: { transactions: Transaction[] }) {
  const channelStats = ['voice', 'receipt', 'sms', 'qr', 'manual'].map(channel => { const items = transactions.filter(tx => tx.captureChannel === channel); const flagged = items.filter(tx => tx.isLowConfidence && tx.reviewStatus === 'pending').length; return { channel, count: items.length, flagged, accuracy: items.length ? Math.round(((items.length - flagged) / items.length) * 100) : 0 }; });
  const captured = transactions.filter(tx => tx.captureChannel !== 'manual').length; const reviewed = transactions.filter(tx => tx.reviewStatus !== 'pending').length; const pending = transactions.filter(tx => tx.isLowConfidence && tx.reviewStatus === 'pending').length;
  return <div className="flex flex-col gap-5"><div><p className="text-sm text-muted-foreground">Model observability</p><h1 className="text-2xl sm:text-3xl font-bold text-foreground">AI Quality Center</h1></div>
    <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0B1F3A, #12375b)' }}><Sparkles size={100} className="absolute -right-4 -top-5 opacity-10" /><div className="relative z-10"><div className="flex items-center gap-2 text-[#38BDF8] text-xs font-bold uppercase tracking-wider"><Activity size={14} /> Live record quality</div><h2 className="text-2xl font-bold mt-3">Capture pipeline observability</h2><p className="text-sm text-white/65 mt-1 max-w-lg">Quality signals are calculated from the persistent transaction and review records.</p><div className="grid grid-cols-3 gap-3 mt-6 max-w-md"><div><p className="text-2xl font-bold">{transactions.length ? Math.round((captured / transactions.length) * 100) : 0}%</p><p className="text-[11px] text-white/55">AI capture rate</p></div><div><p className="text-2xl font-bold">{pending}</p><p className="text-[11px] text-white/55">Needs review</p></div><div><p className="text-2xl font-bold">{reviewed}</p><p className="text-[11px] text-white/55">Reviewed records</p></div></div></div></div>
    <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden"><div className="p-5 border-b border-border"><h2 className="font-bold text-foreground">Capture performance</h2><p className="text-xs text-muted-foreground mt-1">Confidence signals from persistent transaction history</p></div><div className="divide-y divide-border">{channelStats.map(stat => <div key={stat.channel} className="p-4 flex items-center gap-4"><div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center"><Sparkles size={17} /></div><div className="w-20 capitalize font-semibold text-sm text-foreground">{stat.channel}</div><div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-success rounded-full" style={{ width: `${stat.accuracy}%` }} /></div><div className="w-14 text-right"><p className="text-sm font-bold text-foreground">{stat.accuracy}%</p><p className="text-[10px] text-muted-foreground">{stat.count} events</p></div></div>)}</div></div>
  </div>;
}

function toLocalTransaction(transaction: AdminOverview['transactions'][number]): Transaction {
  return { id: transaction.id, userId: transaction.userId, merchant: transaction.merchant, amount: transaction.amount, category: transaction.category as Category, date: transaction.date, notes: transaction.notes ?? undefined, captureChannel: transaction.captureChannel as Transaction['captureChannel'], isLowConfidence: transaction.isLowConfidence, reviewStatus: transaction.reviewStatus, reviewedAt: transaction.reviewedAt, reviewedBy: transaction.reviewedBy, createdAt: transaction.createdAt, updatedAt: transaction.updatedAt };
}

export default function AdminDashboardPage() {
  const { user } = useAppContext(); const [, setLocation] = useLocation(); const [view, setView] = useState<AdminView>('overview'); const [range, setRange] = useState<Range>(30);
  const [data, setData] = useState<AdminOverview | null>(null); const [reviewing, setReviewing] = useState<Transaction | null>(null); const [sidebarOpen, setSidebarOpen] = useState(false); const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!user) setLocation('/login'); else if (user.role !== 'admin') setLocation('/dashboard'); }, [user, setLocation]);
  const loadOverview = async () => { try { setError(null); const response = await fetch(`/api/admin/overview?range=${range}`, { credentials: 'include' }); if (!response.ok) throw new Error(response.status === 403 ? 'Administrator role required' : 'Unable to load admin data'); setData(await response.json() as AdminOverview); } catch (loadError: unknown) { setError(loadError instanceof Error ? loadError.message : 'Unable to load admin data'); } };
  useEffect(() => { if (user?.role === 'admin') void loadOverview(); }, [user?.role, range]);

  const exportTransactions = async () => {
    if (!data) return;
    try {
      const saved = await fetch('/api/admin/exports', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format: 'csv' }) });
      if (!saved.ok) throw new Error('Unable to save export');
      const header = 'id,merchant,amount,category,date,captureChannel,lowConfidence,reviewStatus';
      const rows = data.transactions.map(tx => [tx.id, `"${tx.merchant.replaceAll('"', '""')}"`, tx.amount, `"${tx.category}"`, tx.date, tx.captureChannel, tx.isLowConfidence, tx.reviewStatus].join(','));
      const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `fundwise-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`; anchor.click(); URL.revokeObjectURL(url);
      await loadOverview();
    } catch (exportError: unknown) { setError(exportError instanceof Error ? exportError.message : 'Unable to export transactions'); }
  };
  const confirmReview = async (decision: 'approved' | 'rejected') => { if (!reviewing) return; try { const response = await fetch(`/api/admin/reviews/${encodeURIComponent(reviewing.id)}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }) }); if (!response.ok) throw new Error('Unable to save review decision'); setReviewing(null); await loadOverview(); } catch (reviewError: unknown) { setError(reviewError instanceof Error ? reviewError.message : 'Unable to save review decision'); } };
  if (!user || user.role !== 'admin') return null;
  if (!data) return <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6"><div className="text-center"><ShieldCheck className="mx-auto text-primary mb-3" size={32} /><p className="font-semibold text-foreground">{error ?? 'Loading live admin data…'}</p>{error && <button onClick={() => void loadOverview()} className="mt-4 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-semibold">Try again</button>}</div></div>;

  const transactions = data.transactions.map(toLocalTransaction);
  return <div className="min-h-[100dvh] bg-background"><header className="sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-card-border"><div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between"><div className="flex items-center gap-3"><button onClick={() => setSidebarOpen(open => !open)} className="lg:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted"><Menu size={20} /></button><Link href="/dashboard" className="font-bold text-lg text-primary tracking-tight">FundWise<span className="text-accent">AI</span></Link><span className="hidden sm:inline-block h-5 w-px bg-border" /><span className="hidden sm:inline text-xs font-semibold text-muted-foreground">Admin workspace</span></div><div className="flex items-center gap-3"><span className="hidden sm:inline-flex items-center gap-1.5 bg-success/10 text-success rounded-full px-2.5 py-1 text-[11px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />Live records</span><button onClick={() => setLocation('/settings')} className="flex items-center gap-2 bg-muted/60 rounded-full pl-2 pr-1 py-1 hover:bg-muted"><span className="text-xs font-medium text-muted-foreground hidden sm:block">{user.name.split(' ')[0]}</span><span className="w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">{user.name.charAt(0)}</span></button></div></div></header>
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 flex gap-7"><AdminSidebar view={view} setView={setView} transactionCount={transactions.length} /><AnimatePresence>{sidebarOpen && <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="lg:hidden fixed inset-0 top-16 z-20 bg-background/95 backdrop-blur-sm p-4"><div className="flex items-center justify-between mb-4"><p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Admin navigation</p><button onClick={() => setSidebarOpen(false)} className="p-2"><X size={18} /></button></div><div className="flex flex-col gap-2">{(['overview', 'transactions', 'users', 'ai'] as AdminView[]).map(id => <button key={id} onClick={() => { setView(id); setSidebarOpen(false); }} className={`text-left rounded-xl px-4 py-3 text-sm font-semibold capitalize ${view === id ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'}`}>{id === 'ai' ? 'AI Quality' : id}</button>)}</div></motion.div>}</AnimatePresence>
      <main className="flex-1 min-w-0 max-w-6xl">{error && <div className="mb-4 flex items-center justify-between rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-sm"><span>{error}</span><button onClick={() => setError(null)}><X size={16} /></button></div>}<div className="lg:hidden mb-5"><MobileAdminTabs view={view} setView={setView} /></div>{view === 'overview' && <OverviewView data={data} range={range} setRange={setRange} onReview={setReviewing} onViewTransactions={() => setView('transactions')} />}{view === 'transactions' && <TransactionsView transactions={transactions} onReview={setReviewing} />}{view === 'users' && <UsersView data={data} />}{view === 'ai' && <AIQualityView transactions={transactions} />}</main></div>
    <div className="fixed bottom-5 right-5 z-10 flex gap-2"><Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 bg-card border border-card-border shadow-lg rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft size={14} /> Personal app</Link><button onClick={() => void exportTransactions()} className="flex items-center gap-1.5 bg-primary text-primary-foreground shadow-lg rounded-full px-3 py-2 text-xs font-semibold hover:opacity-90"><Download size={14} /> Export CSV</button></div>
    <AnimatePresence>{reviewing && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setReviewing(null)}><motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-md bg-card rounded-3xl border border-card-border shadow-2xl p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-warning-foreground">Review required</p><h2 className="text-xl font-bold text-foreground mt-1">Check transaction</h2></div><button onClick={() => setReviewing(null)} className="p-2 rounded-full bg-muted text-muted-foreground"><X size={17} /></button></div><div className="mt-5 rounded-2xl bg-muted/60 p-4"><div className="flex items-center justify-between"><span className="font-semibold text-foreground">{reviewing.merchant}</span><span className="text-xl font-bold text-foreground tabular-amounts">EGP {fmt(reviewing.amount)}</span></div><div className="flex items-center justify-between mt-3 text-xs text-muted-foreground"><span>{reviewing.category}</span><span className="capitalize">{reviewing.captureChannel} capture</span></div></div><p className="text-sm text-muted-foreground leading-relaxed mt-4">This item was marked low confidence by the capture pipeline. Save a decision to update the shared review queue.</p><div className="flex gap-2 mt-5"><button onClick={() => setReviewing(null)} className="flex-1 py-3 rounded-xl bg-muted text-foreground font-semibold text-sm">Keep pending</button><button onClick={() => void confirmReview('approved')} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"><Check size={16} /> Approve</button><button onClick={() => void confirmReview('rejected')} className="flex-1 py-3 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm">Reject</button></div></motion.div></motion.div>}</AnimatePresence>
  </div>;
}