import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, AlertTriangle, MessageSquare } from 'lucide-react';
import { Category, CATEGORY_COLORS } from '../data/seedData';
import { useAppContext } from '../contexts/AppContext';

export interface ExtractedData {
  merchant: string;
  amount: number | string;
  category: Category;
  date?: string;
  notes?: string;
  confidence?: 'high' | 'medium' | 'low';
}

interface ConfirmationCardProps {
  isOpen: boolean;
  data: ExtractedData | null;
  onConfirm: (data: ExtractedData) => void;
  onCancel: () => void;
  source: 'voice' | 'receipt' | 'qr' | 'sms';
}

export function ConfirmationCard({ isOpen, data, onConfirm, onCancel, source }: ConfirmationCardProps) {
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const { merchantOverrides } = useAppContext();

  // Reset edited data when opening with new data
  if (data && !editedData && !isConfirming) {
    // Apply memory category override if exists
    let appliedCategory = data.category;
    if (merchantOverrides[data.merchant.toLowerCase()]) {
      appliedCategory = merchantOverrides[data.merchant.toLowerCase()];
    }
    setEditedData({ ...data, category: appliedCategory, date: data.date || new Date().toISOString().split('T')[0] });
  }

  if (!isOpen || !editedData) return null;

  const isSms = source === 'sms';
  // Use genuine confidence from backend AI extraction (fixed from random mock)
  const confidence = isSms ? 'high' : (data?.confidence || editedData?.confidence || 'high');

  const handleSave = () => {
    setIsConfirming(true);
    setTimeout(() => {
      onConfirm(editedData);
      setIsConfirming(false);
      setEditedData(null);
    }, 800);
  };

  const handleClose = () => {
    setEditedData(null);
    onCancel();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        />
        <motion.div 
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative z-10 w-full max-w-md mx-auto bg-card rounded-t-2xl shadow-xl border-t border-card-border overflow-hidden pb-safe"
        >
          {isConfirming ? (
            <div className="p-12 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center animate-pulse">
                <Check size={32} />
              </div>
              <p className="font-semibold text-lg text-foreground">Saved Successfully</p>
            </div>
          ) : (
            <div className="p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                {isSms ? (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <MessageSquare size={14} /> SMS Detected
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent/15 border border-accent/30 text-xs font-bold text-accent uppercase tracking-wider">
                    <Sparkles size={14} /> AI Extracted
                  </div>
                )}
                
                {confidence === 'high' ? (
                  <div className="flex items-center gap-1 text-xs font-medium text-success">
                    <Check size={14} /> Confident
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs font-medium text-warning">
                    <AlertTriangle size={14} /> Please review
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Amount (EGP)</label>
                  <input 
                    type="number"
                    value={editedData.amount}
                    onChange={e => setEditedData({...editedData, amount: e.target.value})}
                    className="w-full text-3xl font-semibold bg-transparent border-b border-border focus:border-primary outline-none py-1 tabular-amounts text-foreground"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Merchant</label>
                  <input 
                    type="text"
                    value={editedData.merchant}
                    onChange={e => setEditedData({...editedData, merchant: e.target.value})}
                    className="w-full text-lg font-medium bg-transparent border-b border-border focus:border-primary outline-none py-1 text-foreground"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <select 
                    value={editedData.category}
                    onChange={e => setEditedData({...editedData, category: e.target.value as Category})}
                    className="w-full text-base font-medium bg-transparent border-b border-border focus:border-primary outline-none py-2 text-foreground"
                  >
                    {Object.keys(CATEGORY_COLORS).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Date</label>
                  <input 
                    type="date"
                    value={editedData.date}
                    onChange={e => setEditedData({...editedData, date: e.target.value})}
                    className="w-full text-base font-medium bg-transparent border-b border-border focus:border-primary outline-none py-2 text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button 
                  onClick={handleClose}
                  className="py-3 rounded-lg border border-border font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="py-3 rounded-lg bg-success text-success-foreground font-semibold flex items-center justify-center gap-2 shadow-md hover:opacity-90 transition-opacity"
                >
                  Confirm & Save
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
