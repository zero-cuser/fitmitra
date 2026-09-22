'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'well' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  glow?: 'none' | 'primary' | 'success' | 'accent';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  glow = 'none',
  className = '',
  ...props
}) => {
  const baseStyles = 'relative transition-all overflow-hidden';

  const variantStyles = {
    default: 'bg-surface border border-border-subtle rounded-2xl sm:rounded-3xl shadow-lg',
    elevated: 'bg-surface-elevated border border-border-strong rounded-2xl sm:rounded-3xl shadow-xl',
    well: 'bg-background/75 border border-border-subtle rounded-xl sm:rounded-2xl',
    interactive:
      'bg-surface border border-border-subtle hover:border-primary/50 hover:bg-surface-hover rounded-2xl sm:rounded-3xl cursor-pointer hover:shadow-lg transition-all active:scale-[0.99]'
  }[variant];

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  }[padding];

  const glowStyles = {
    none: '',
    primary: 'glow-primary',
    success: 'glow-success',
    accent: 'glow-accent'
  }[glow];

  return (
    <div className={`${baseStyles} ${variantStyles} ${paddingStyles} ${glowStyles} ${className}`} {...props}>
      {children}
    </div>
  );
};
