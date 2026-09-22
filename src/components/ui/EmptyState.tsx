'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <Sparkles className="w-8 h-8 text-primary" />,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-surface/50 border border-border-subtle space-y-4 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-border-strong flex items-center justify-center text-text-secondary shadow-inner">
        {icon}
      </div>

      <div className="max-w-md space-y-1">
        <h3 className="text-base font-bold text-text-primary tracking-tight">{title}</h3>
        {description && (
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
