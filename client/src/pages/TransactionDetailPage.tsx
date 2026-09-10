import { useState, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useAppContext } from '../contexts/AppContext';
import { Category, CATEGORY_COLORS, AI_ALTERNATIVES } from '../data/seedData';
import { CategoryBadge, AIBadge } from '../components/CategoryBadge';
import { CaptureSourceIcon } from '../components/CaptureSourceIcon';
import { ArrowLeft, Trash2, Edit3, Save, X, Lightbulb } from 'lucide-react';
import { format } from 'date-fns';

export default function TransactionDetailPage() {
  const [, params] = useRoute('/transaction/:id');
  const [, setLocation] = useLocation();
  const { transactions, updateTransaction, deleteTransaction, setMerchantCategory } = useAppContext();
  
  const tx = transactions.find(t => t.id === params?.id);
  const [isEditing, setIsEditing] = useState(false);
  
  const [editData, setEditData] = useState({
    merchant: tx?.merchant || '',
    amount: tx?.amount || 0,
    category: tx?.category || 'Other' as Category,
    date: tx?.date ? tx.date.split('T')[0] : '',
    notes: tx?.notes || ''
  });

  const alternative = useMemo(() => {
    if (!tx) return null;
    return AI_ALTERNATIVES.find(alt => 
      tx.merchant.toLowerCase().includes(alt.product.toLowerCase())
    );
  }, [tx]);

  if (!tx) {
    return <div className="p-6 text-center text-foreground">Transaction not found.</div>;
  }

  const handleSave = () => {
    if (editData.category !== tx.category) {
      setMerchantCategory(editData.merchant, editData.category);
    }
    updateTransaction(tx.id, {
      merchant: editData.merchant,
      amount: Number(editData.amount),
      category: editData.category,
      date: new Date(editData.date).toISOString(),
      notes: editData.notes,
      isLowConfidence: false // clear warning if saved manually
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteTransaction(tx.id);
      setLocation('/transactions');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md px-4 h-14 flex items-center justify-between border-b border-border">
        <button onClick={() => setLocation('/transactions')} className="p-2 -ml-2 text-foreground hover:bg-muted rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <span className="font-semibold text-foreground">Details</span>
        <div className="w-10"></div>
      </div>

      <div className="max-w-md mx-auto w-full p-4 flex flex-col gap-6">
        <div className="bg-card border border-card-border rounded-3xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-4 right-4 text-muted-foreground flex items-center gap-1 text-xs font-medium">
            <CaptureSourceIcon source={tx.captureChannel} size={14} />
            <span className="capitalize">{tx.captureChannel}</span>
          </div>

          {!isEditing ? (
            <>
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
                <CaptureSourceIcon source={tx.captureChannel} size={28} />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1">{tx.merchant}</h2>
              <span className="text-4xl font-bold tabular-amounts text-foreground mb-4">
                EGP {tx.amount.toLocaleString()}
              </span>
              <div className="flex items-center gap-2 mb-2">
                <CategoryBadge category={tx.category} isLowConfidence={tx.isLowConfidence} />
              </div>
              <span className="text-sm text-muted-foreground">{format(new Date(tx.date), 'MMMM d, yyyy')}</span>
              {tx.notes && <p className="mt-4 text-sm text-foreground bg-muted/50 p-3 rounded-lg w-full text-left">{tx.notes}</p>}
            </>
          ) : (
            <div className="w-full flex flex-col gap-4 text-left">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Amount (EGP)</label>
                <input 
                  type="number"
                  value={editData.amount}
                  onChange={e => setEditData({...editData, amount: Number(e.target.value)})}
                  className="w-full text-3xl font-bold bg-transparent border-b border-border focus:border-primary outline-none py-1 tabular-amounts text-foreground"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Merchant</label>
                <input 
                  type="text"
                  value={editData.merchant}
                  onChange={e => setEditData({...editData, merchant: e.target.value})}
                  className="w-full text-lg font-medium bg-transparent border-b border-border focus:border-primary outline-none py-1 text-foreground"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <select 
                  value={editData.category}
                  onChange={e => setEditData({...editData, category: e.target.value as Category})}
                  className="w-full text-base bg-transparent border-b border-border focus:border-primary outline-none py-2 text-foreground"
                >
                  {Object.keys(CATEGORY_COLORS).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <input 
                  type="date"
                  value={editData.date}
                  onChange={e => setEditData({...editData, date: e.target.value})}
                  className="w-full text-base bg-transparent border-b border-border focus:border-primary outline-none py-2 text-foreground"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <textarea 
                  value={editData.notes}
                  onChange={e => setEditData({...editData, notes: e.target.value})}
                  className="w-full text-sm bg-muted/50 border border-border rounded-lg p-2 outline-none focus:border-primary text-foreground"
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        {alternative && !isEditing && (
          <div className="bg-card border-2 border-accent/20 rounded-2xl p-5 shadow-sm relative">
            <div className="absolute -top-3 left-4 bg-background px-2">
              <AIBadge />
            </div>
            <div className="flex items-start gap-3 mt-1">
              <div className="bg-accent/10 p-2 rounded-full text-accent mt-0.5">
                <Lightbulb size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Suggested Alternative</h4>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  You spent EGP {alternative.currentPrice} at {tx.merchant}. 
                  Switching to <strong className="text-foreground">{alternative.altProduct}</strong> could save you 
                  <strong className="text-success ml-1">EGP {alternative.currentPrice - alternative.altPrice}</strong> per purchase.
                </p>
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">Suggested · Example Data</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          {!isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(true)}
                className="flex-1 bg-card border border-border py-3 rounded-xl font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
              >
                <Edit3 size={18} /> Edit
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 bg-destructive/10 text-destructive border border-destructive/20 py-3 rounded-xl font-medium hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={18} /> Delete
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-card border border-border py-3 rounded-xl font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
              >
                <X size={18} /> Cancel
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 bg-success text-success-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Save size={18} /> Save Changes
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
