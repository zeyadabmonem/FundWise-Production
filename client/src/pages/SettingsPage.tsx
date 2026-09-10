import { useAppContext } from '../contexts/AppContext';
import { User, Moon, Sun, MessageSquare, LogOut, Info, ShieldCheck, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { useState } from 'react';
import { ConfirmationCard, ExtractedData } from '../components/ConfirmationCard';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, logout, isDarkMode, toggleDarkMode, addTransaction } = useAppContext();
  const [, setLocation] = useLocation();

  const [showSmsConfirmation, setShowSmsConfirmation] = useState(false);
  
  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  const simulateSms = () => {
    toast("New transaction detected from SMS 📩", {
      action: {
        label: "Review →",
        onClick: () => setShowSmsConfirmation(true)
      },
      duration: 5000,
      className: "bg-card border-border text-foreground"
    });
  };

  const handleSmsConfirm = (data: ExtractedData) => {
    addTransaction({
      merchant: data.merchant,
      amount: Number(data.amount),
      category: data.category,
      date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
      notes: data.notes,
      captureChannel: 'sms'
    });
    toast.success("SMS Transaction saved");
  };

  if (!user) return null;

  return (
    <div className="pb-24 min-h-[100dvh] bg-background">
      <div className="max-w-md mx-auto w-full p-4 flex flex-col gap-6">
        
        <h1 className="text-2xl font-bold text-foreground mt-2">Settings</h1>

        <div className="bg-card border border-card-border rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold">
            {user.name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg text-foreground">{user.name}</span>
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </div>
        </div>

        <div className="bg-primary rounded-2xl p-4 shadow-sm text-primary-foreground relative overflow-hidden">
          <ShieldCheck size={72} className="absolute -right-3 -bottom-3 opacity-10" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold">Admin workspace</h3>
              {user.role === 'admin' && <span className="text-[10px] font-bold uppercase tracking-wider bg-white/15 rounded-full px-2 py-0.5">Admin</span>}
            </div>
            <p className="text-xs text-white/65 leading-relaxed max-w-xs">
              Monitor platform health, review AI captures, and explore product activity.
            </p>
            <button
              onClick={() => user.role === 'admin' && setLocation('/admin')}
              disabled={user.role !== 'admin'}
              className={`mt-3 flex items-center gap-1.5 text-sm font-semibold text-white transition-colors ${user.role === 'admin' ? 'hover:text-accent' : 'opacity-60 cursor-not-allowed'}`}
            >
              {user.role === 'admin' ? 'Open admin console' : 'Admin access required'} {user.role === 'admin' && <ArrowRight size={15} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-2">Preferences</h3>
          <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-card-border">
              <div className="flex items-center gap-3 text-foreground">
                {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                <span className="font-medium">Dark Mode</span>
              </div>
              <button 
                onClick={toggleDarkMode}
                className={`w-12 h-6 rounded-full transition-colors relative ${isDarkMode ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
              </button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-foreground">
                <div className="w-5 font-bold text-center">£</div>
                <span className="font-medium">Currency</span>
              </div>
              <span className="text-sm text-muted-foreground">EGP — Egyptian Pound</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-accent uppercase tracking-wider ml-2 flex items-center gap-1">
            <MessageSquare size={12} /> Demo Controls
          </h3>
          <div className="bg-card border-2 border-accent/20 rounded-2xl shadow-sm p-4 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              In the real mobile app, this works automatically in the background via your bank's SMS notifications. This is a simulated demo.
            </p>
            <button 
              onClick={simulateSms}
              className="bg-accent/10 text-accent font-semibold py-3 rounded-xl border border-accent/20 hover:bg-accent/20 transition-colors flex items-center justify-center gap-2"
            >
              Simulate Incoming SMS
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-2">About</h3>
          <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-card-border text-foreground">
              <div className="flex items-center gap-3">
                <Info size={20} />
                <span className="font-medium">Version</span>
              </div>
              <span className="text-sm text-muted-foreground">1.0.0 (Prototype)</span>
            </div>
            <button onClick={handleLogout} className="w-full p-4 flex items-center justify-between text-destructive hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <LogOut size={20} />
                <span className="font-medium">Sign Out</span>
              </div>
            </button>
          </div>
        </div>

      </div>

      <ConfirmationCard 
        isOpen={showSmsConfirmation}
        data={{ merchant: "Vodafone", amount: 350, category: "Bills & Utilities" }}
        onConfirm={handleSmsConfirm}
        onCancel={() => setShowSmsConfirmation(false)}
        source="sms"
      />
    </div>
  );
}
