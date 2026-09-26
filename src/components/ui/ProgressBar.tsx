'use client';

import React from 'react';

export interface ProgressBarProps {
  value: number; // 0 - 100
  variant?: 'primary' | 'success' | 'warning' | 'accent' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showPercent?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  variant = 'primary',
  size = 'md',
  label,
  showPercent = false,
  className = ''
}) => {
  const clampedValue = Math.min(Math.max(Math.round(value), 0), 100);

  const heightStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  }[size];

  const fillStyles = {
    primary: 'bg-gradient-to-r from-primary to-primary-bright shadow-sm shadow-primary/50',
    secondary: 'bg-gradient-to-r from-secondary to-purple-400 shadow-sm shadow-secondary/50',
    success: 'bg-gradient-to-r from-success to-emerald-400 shadow-sm shadow-success/50',
    warning: 'bg-gradient-to-r from-warning to-orange-400 shadow-sm shadow-warning/50',
    accent: 'bg-gradient-to-r from-accent to-blue-400 shadow-sm shadow-accent/50'
  }[variant];

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center text-xs font-semibold">
          {label && <span className="text-text-secondary">{label}</span>}
          {showPercent && (
            <span className="font-mono text-text-primary font-bold">{clampedValue}%</span>
          )}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`w-full bg-surface-elevated rounded-full overflow-hidden border border-border-subtle p-0.5 ${heightStyles}`}
      >
        <div
          style={{ width: `${clampedValue}%` }}
          className={`h-full rounded-full transition-all duration-500 ease-out ${fillStyles}`}
        />
      </div>
    </div>
  );
};
