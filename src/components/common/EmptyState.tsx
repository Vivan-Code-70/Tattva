import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-8 text-center flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center shadow-2xs">
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-display">
          {title}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 px-4 py-2 rounded-xl bg-slate-900 dark:bg-amber-600 hover:bg-slate-800 dark:hover:bg-amber-500 text-white text-xs font-semibold transition whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

interface SkeletonListProps {
  rows?: number;
  className?: string;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({ rows = 3, className = '' }) => {
  return (
    <div className={`space-y-3 ${className}`} aria-busy="true" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800/70 animate-pulse border border-slate-200/70 dark:border-slate-800"
        />
      ))}
    </div>
  );
};
