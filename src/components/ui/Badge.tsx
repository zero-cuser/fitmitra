'use client';

import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'accent' | 'secondary' | 'muted';
  size?: 'sm' | 'md';
  dot?: boolean;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  color = 'primary',
  size = 'md',
  dot = false,
  icon,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-bold tracking-wide rounded-full border shrink-0';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5'
  }[size];

  const colorStyles = {
    primary: 'bg-primary/10 text-primary-bright border-primary/25',
    success: 'bg-success/10 text-success border-success/25',
    warning: 'bg-warning/10 text-warning border-warning/25',
    danger: 'bg-danger/10 text-danger border-danger/25',
    accent: 'bg-accent/10 text-accent border-accent/25',
    secondary: 'bg-secondary/10 text-secondary border-secondary/25',
    muted: 'bg-surface-elevated text-text-muted border-border-subtle'
  }[color];

  const dotColorStyles = {
    primary: 'bg-primary-bright',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    accent: 'bg-accent',
    secondary: 'bg-secondary',
    muted: 'bg-text-muted'
  }[color];

  return (
    <span className={`${baseStyles} ${sizeStyles} ${colorStyles} ${className}`} {...props}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColorStyles}`} />}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
