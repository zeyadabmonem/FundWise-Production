import { format, isToday, isYesterday } from 'date-fns';
import { Transaction, CATEGORY_COLORS } from '../data/seedData';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { getCategoryLabel } from '../locales/translations';

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const { t, isRtl } = useAppContext();
  const dateObj = new Date(transaction.date);
  
  let dateStr = '';
  if (isToday(dateObj)) dateStr = t.today;
  else if (isYesterday(dateObj)) dateStr = t.yesterday;
  else dateStr = format(dateObj, isRtl ? 'd MMM' : 'MMM d');

  const color = CATEGORY_COLORS[transaction.category] || CATEGORY_COLORS.Other;
  const initial = transaction.merchant.charAt(0).toUpperCase();
  const categoryLabel = getCategoryLabel(transaction.category, t);

  return (
    <Link href={`/transaction/${transaction.id}`}>
      <div className="flex items-center justify-between p-3.5 bg-card hover:bg-muted/40 rounded-2xl border border-transparent hover:border-border/50 hover:shadow-sm transition-all cursor-pointer group active:scale-[0.98]">
        <div className="flex items-center gap-3.5">
          <div 
            className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-base shrink-0 shadow-sm"
            style={{ backgroundColor: `${color}26`, color: color }}
          >
            {initial}
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-sm text-foreground leading-none tracking-tight">{transaction.merchant}</span>
            <span className="text-[11px] font-semibold leading-none" style={{ color: color }}>{categoryLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col items-end gap-1">
            <span className="font-bold text-sm text-foreground tabular-amounts leading-none tracking-tight">
              {transaction.amount.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{isRtl ? 'ج.م' : 'EGP'}</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-medium leading-none">{dateStr}</span>
          </div>
          <ChevronRight
            size={16}
            className="text-muted-foreground/40 group-hover:text-foreground transition-colors"
            style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }}
          />
        </div>
      </div>
    </Link>
  );
}
