import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Sparkles } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

export default function SplashPage() {
  const [, setLocation] = useLocation();
  const { user } = useAppContext();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) {
        setLocation('/dashboard');
      } else {
        setLocation('/login');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [user, setLocation]);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-primary text-primary-foreground">
      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-700">
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl relative">
          <Sparkles className="text-primary w-10 h-10" strokeWidth={2.5} />
          <div className="absolute -top-2 -right-2 bg-accent text-primary font-bold text-[10px] px-1.5 py-0.5 rounded shadow-sm border border-white">
            AI
          </div>
        </div>
        <div className="text-center mt-2">
          <h1 className="text-3xl font-bold tracking-tight mb-1">FundWise</h1>
          <p className="text-primary-foreground/70 text-sm font-medium">Your AI-powered spending copilot</p>
        </div>
      </div>
    </div>
  );
}
