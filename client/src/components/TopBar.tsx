import { useAppContext } from '../contexts/AppContext';
import { User, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'wouter';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
}

export function TopBar({ title, showBack }: TopBarProps = {}) {
  const { user } = useAppContext();
  const [location] = useLocation();

  // If used as standalone page header (with title/showBack) — always render
  if (title || showBack) {
    return (
      <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-card-border h-14 flex items-center px-4 pt-safe">
        <div className="max-w-md mx-auto w-full flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => window.history.back()}
              className="p-2 -ml-2 text-foreground hover:bg-muted rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          {title && (
            <span className="font-semibold text-foreground">{title}</span>
          )}
        </div>
      </div>
    );
  }

  // Global nav TopBar — hide on certain pages
  const hideTopBarOn = ['/', '/login', '/register'];
  if (hideTopBarOn.includes(location) || location.startsWith('/admin')) {
    return null;
  }

  return (
    <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-card-border h-14 flex items-center px-4 pt-safe">
      <div className="max-w-md mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <span className="font-semibold text-lg text-primary cursor-pointer tracking-tight">
              FundWise
            </span>
          </Link>
        </div>
        
        {user && (
          <Link href="/settings">
            <div className="flex items-center gap-2 bg-muted/50 py-1 px-2 pr-1 rounded-full border border-card-border cursor-pointer hover:bg-muted transition-colors">
              <span className="text-xs font-medium text-muted-foreground pl-1 hidden sm:block">
                {user.name.split(' ')[0]}
              </span>
              <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                <User size={14} />
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}

export default TopBar;
