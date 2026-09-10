import { useAppContext } from '../contexts/AppContext';
import { User, ArrowLeft, Languages } from 'lucide-react';
import { Link, useLocation } from 'wouter';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
}

export function TopBar({ title, showBack }: TopBarProps = {}) {
  const { user, language, toggleLanguage, isRtl } = useAppContext();
  const [location] = useLocation();

  // If used as standalone page header (with title/showBack) — always render
  if (title || showBack) {
    return (
      <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-card-border h-14 flex items-center px-4 pt-safe">
        <div className="max-w-md mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBack && (
              <button
                type="button"
                onClick={() => window.history.back()}
                className="p-2 -ml-2 text-foreground hover:bg-muted rounded-full transition-colors"
                style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }}
              >
                <ArrowLeft size={20} />
              </button>
            )}
            {title && (
              <span className="font-semibold text-foreground">{title}</span>
            )}
          </div>

          {/* Quick Language Toggle */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted border border-card-border text-foreground transition-colors"
          >
            <Languages size={13} className="text-accent" />
            <span>{language === 'ar' ? 'English' : 'عربي 🇪🇬'}</span>
          </button>
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
            <span className="font-bold text-lg text-primary cursor-pointer tracking-tight">
              FundWise
            </span>
          </Link>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Quick Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted border border-card-border text-foreground transition-colors"
            title="تبديل اللغة / Switch Language"
          >
            <Languages size={13} className="text-accent" />
            <span>{language === 'ar' ? 'English' : 'عربي 🇪🇬'}</span>
          </button>

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
    </div>
  );
}

export default TopBar;
