'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  error?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  error,
  onRetry,
  className = ''
}) => {
  return (
    <div
      role="alert"
      className={`p-6 rounded-2xl bg-danger/10 border border-danger/25 text-center flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-danger/20 border border-danger/30 flex items-center justify-center text-danger">
        <AlertCircle className="w-6 h-6" />
      </div>

      <div className="max-w-md space-y-1">
        <h4 className="text-sm font-bold text-white tracking-tight">{title}</h4>
        {error && <p className="text-xs text-danger/90 leading-relaxed">{error}</p>}
      </div>

      {onRetry && (
        <Button
          variant="danger"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
