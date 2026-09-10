import { useLocation, Link } from 'wouter';
import { Home, Plus, List, Sparkles, ShoppingBag, Mic, Camera, QrCode, PenLine } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppContext } from '../contexts/AppContext';

export function BottomNav() {
  const { t } = useAppContext();
  const [location] = useLocation();
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // 5-tab layout: Home | Expenses | [+FAB] | Deals(AI Alternatives) | Insights
  // Settings moved to TopBar
  const navItems = [
    { icon: Home, label: t.navHome, path: '/dashboard' },
    { icon: List, label: t.navTransactions, path: '/transactions' },
    { isAdd: true },
    { icon: ShoppingBag, label: t.navDeals, path: '/alternatives' },
    { icon: Sparkles, label: t.navInsights, path: '/insights' },
  ];

  const addOptions = [
    { icon: Mic, label: t.actionVoice, path: '/voice', color: 'bg-primary' },
    { icon: Camera, label: t.actionReceipt, path: '/receipt', color: 'bg-primary' },
    { icon: QrCode, label: t.actionQr, path: '/qr', color: 'bg-primary' },
    { icon: PenLine, label: t.actionManual, path: '/manual', color: 'bg-primary' },
  ];

  // Hide nav on certain screens
  const hideNavOn = ['/', '/login', '/register', '/voice', '/receipt', '/qr', '/manual', '/admin'];
  if (hideNavOn.includes(location) || location.startsWith('/transaction/')) {
    return null;
  }

  return (
    <>
      {/* Floating Add Menu */}
      <AnimatePresence>
        {isAddMenuOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
              onClick={() => setIsAddMenuOpen(false)}
            />
            <div className="relative z-10 w-full max-w-md mx-auto mb-24 px-6">
              <motion.div 
                initial={{ y: 50, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 50, opacity: 0, scale: 0.9 }}
                className="grid grid-cols-2 gap-4"
              >
                {addOptions.map((opt) => (
                  <Link key={opt.path} href={opt.path} onClick={() => setIsAddMenuOpen(false)}>
                    <div className="bg-card border border-card-border rounded-xl p-4 flex flex-col items-center justify-center gap-3 hover-elevate transition-all shadow-sm cursor-pointer group">
                      <div className={`${opt.color} text-primary-foreground p-3 rounded-full group-hover:scale-110 transition-transform`}>
                        <opt.icon size={24} />
                      </div>
                      <span className="font-semibold text-sm text-foreground">{opt.label}</span>
                    </div>
                  </Link>
                ))}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-card-border pb-safe">
        <div className="max-w-md mx-auto flex items-center justify-between px-1 h-16 relative">
          {navItems.map((item, idx) => {
            if (item.isAdd) {
              return (
                <div key="add" className="flex-1 flex justify-center relative -top-5">
                  <button
                    type="button"
                    onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform ${isAddMenuOpen ? 'bg-muted text-foreground rotate-45' : 'bg-primary text-primary-foreground hover:scale-105'}`}
                  >
                    <Plus size={28} />
                  </button>
                </div>
              );
            }

            const isActive = location === item.path || (item.path !== '/dashboard' && location.startsWith(item.path!));
            const Icon = item.icon!;

            return (
              <Link key={idx} href={item.path!} className="flex-1">
                <div className="flex flex-col items-center justify-center h-full gap-1 cursor-pointer">
                  <Icon 
                    size={21}
                    className={isActive ? 'text-primary' : 'text-muted-foreground'}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className={`text-[10px] ${isActive ? 'text-primary font-bold' : 'text-muted-foreground font-medium'}`}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default BottomNav;
