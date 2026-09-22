'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  'aria-label': ariaLabel,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none shrink-0';

  const sizeStyles = {
    sm: 'w-8 h-8 rounded-lg text-xs',
    md: 'w-10 h-10 rounded-xl text-sm',
    lg: 'w-12 h-12 rounded-2xl text-base'
  }[size];

  const variantStyles = {
    primary:
      'bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary-bright',
    secondary:
      'bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-strong',
    ghost:
      'bg-transparent hover:bg-surface-hover text-text-secondary hover:text-text-primary',
    outline:
      'bg-transparent hover:bg-surface-hover text-text-primary border border-border-strong hover:border-primary/50',
    danger:
      'bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30 hover:border-danger/50'
  }[variant];

  return (
    <button
      aria-label={ariaLabel}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-current" /> : children}
    </button>
  );
};
