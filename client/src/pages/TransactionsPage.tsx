import { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { TransactionRow } from '../components/TransactionRow';
import { Search } from 'lucide-react';
import { Category } from '../data/seedData';

const FILTERS: (Category | 'All')[] = [
  'All', 'Food & Drink', 'Groceries', 'Transport', 'Bills & Utilities', 'Shopping', 'Entertainment', 'Health', 'Education', 'Other'
];

export default function TransactionsPage() {
  const { transactions } = useAppContext();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Category | 'All'>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = tx.merchant.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'All' || tx.category === filter;
      return matchesSearch && matchesFilter;
    });
  }, [transactions, search, filter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="pb-24 min-h-[100dvh] bg-background flex flex-col">
      <div className="sticky top-14 z-20 bg-background/90 backdrop-blur px-4 pt-4 pb-2 flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-card-border rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto w-full px-4 mt-2">
        {isRefreshing && (
          <div className="flex justify-center py-4 text-muted-foreground text-sm animate-pulse">
            Refreshing...
          </div>
        )}
        
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No transactions found.
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm" onTouchStart={(e) => {
             // simplified pull to refresh mock
             if(window.scrollY === 0) {
                 handleRefresh();
             }
          }}>
            {filteredTransactions.map(tx => (
              <TransactionRow key={tx.id} transaction={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
