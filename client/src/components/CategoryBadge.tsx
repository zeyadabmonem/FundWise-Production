import { CATEGORY_COLORS, Category } from '../data/seedData';
import { Sparkles, AlertTriangle } from 'lucide-react';

interface CategoryBadgeProps {
  category: Category;
  isLowConfidence?: boolean;
}

export function CategoryBadge({ category, isLowConfidence }: CategoryBadgeProps) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;

  if (isLowConfidence) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-warning text-warning bg-warning/10 text-xs font-medium">
        <AlertTriangle size={12} />
        <span>Needs Review</span>
      </div>
    );
  }

  return (
    <div 
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}15`, color: color, border: `1px solid ${color}30` }}
    >
      {category}
    </div>
  );
}

export function AIBadge({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-accent/30 bg-accent/10 text-[10px] font-bold text-accent uppercase tracking-wider ${className}`}>
      <Sparkles size={10} className="text-accent" />
      AI
    </div>
  );
}
