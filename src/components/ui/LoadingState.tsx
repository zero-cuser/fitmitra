'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Loading...',
  description,
  className = ''
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-8 text-center space-y-3 ${className}`}
    >
      <div className="relative">
        <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <div className="absolute -inset-2 rounded-full bg-primary/20 blur-lg opacity-40 pointer-events-none" />
      </div>
      <div>
        <p className="text-sm font-bold text-text-primary tracking-tight">{title}</p>
        {description && <p className="text-xs text-text-muted mt-1">{description}</p>}
      </div>
    </div>
  );
};
