'use client';

import React from 'react';

export interface SectionHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  badge,
  action,
  icon,
  className = ''
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
      <div className="space-y-1">
        {badge && <div className="mb-2">{badge}</div>}
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-primary shrink-0">{icon}</span>}
          <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
            {title}
          </h2>
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-text-secondary max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="self-start sm:self-auto shrink-0">{action}</div>}
    </div>
  );
};
