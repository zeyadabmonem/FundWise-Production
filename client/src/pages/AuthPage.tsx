import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAppContext } from '../contexts/AppContext';
import { Sparkles, ArrowRight } from 'lucide-react';
import { AIBadge } from '../components/CategoryBadge';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [, setLocation] = useLocation();
  const { login, register, error } = useAppContext();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName('');
    setEmail('');
    setPassword('');
  }, [isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const authenticatedUser = isLogin
      ? await login(email, password)
      : await register(name, email, password);
    setIsSubmitting(false);
    if (authenticatedUser) setLocation(authenticatedUser.role === 'admin' ? '/admin' : '/dashboard');
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background p-6">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg relative">
            <Sparkles size={28} />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">FundWise</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <p className="text-muted-foreground">Smart money management.</p>
            <AIBadge />
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-6 text-foreground">{isLogin ? 'Welcome back' : 'Create account'}</h2>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-transparent outline-none focus:border-primary text-foreground"
                  required
                />
              </div>
            )}
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-transparent outline-none focus:border-primary text-foreground"
                required
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-transparent outline-none focus:border-primary text-foreground"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2" role="alert">{error}</p>}

            <button 
              type="submit" 
              className="mt-2 w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              disabled={isSubmitting}
              {isSubmitting ? 'Working…' : isLogin ? 'Sign In' : 'Create Account'}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
