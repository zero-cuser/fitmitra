'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold tracking-wide transition-all rounded-xl cursor-pointer select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

  const sizeStyles = {
    sm: 'py-1.5 px-3 text-xs gap-1.5',
    md: 'py-2.5 px-4 text-xs sm:text-sm gap-2',
    lg: 'py-3.5 px-6 text-sm sm:text-base gap-2.5 rounded-2xl'
  }[size];

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-primary to-primary-bright text-white shadow-lg shadow-primary/25 hover:from-primary-bright hover:to-primary hover:shadow-primary/40',
    secondary:
      'bg-surface-elevated hover:bg-surface-hover text-text-primary border border-border-subtle hover:border-border-strong',
    ghost:
      'bg-transparent hover:bg-surface-hover text-text-secondary hover:text-text-primary',
    outline:
      'bg-transparent hover:bg-surface-hover text-text-primary border border-border-strong hover:border-primary/50',
    success:
      'bg-gradient-to-r from-success to-emerald-400 text-slate-950 shadow-lg shadow-success/25 hover:from-emerald-400 hover:to-success hover:shadow-success/40',
    danger:
      'bg-danger/15 hover:bg-danger/25 text-danger border border-danger/30 hover:border-danger/50'
  }[variant];

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${widthStyle} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children && <span>{children}</span>}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
