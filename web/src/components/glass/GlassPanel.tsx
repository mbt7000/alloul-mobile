/**
 * Glassmorphism Component Library
 * مكتبة مكونات تأثير الزجاج
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'sm' | 'lg' | 'xl';
  accent?: 'cyan' | 'purple' | 'emerald' | 'none';
  interactive?: boolean;
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ variant = 'default', accent = 'none', interactive = false, className, children, ...props }, ref) => {
    const baseClasses = 'glass backdrop-blur-md border border-white/10 rounded-lg';

    const variantClasses = {
      default: 'glass',
      sm: 'glass-sm',
      lg: 'glass-lg',
      xl: 'glass-xl',
    };

    const accentClasses = {
      none: '',
      cyan: 'glass-accent-cyan',
      purple: 'glass-accent-purple',
      emerald: 'glass-accent-emerald',
    };

    const interactiveClasses = interactive ? 'hover:shadow-lg hover:border-white/20 transition-all duration-300' : '';

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          accentClasses[accent],
          interactiveClasses,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassPanel.displayName = 'GlassPanel';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ variant = 'default', size = 'md', className, children, ...props }, ref) => {
    const baseClasses = 'glass-btn font-medium rounded-lg transition-all duration-300 focus:outline-none';

    const variantClasses = {
      default: 'glass-btn hover:shadow-md',
      primary: 'glass-btn-primary shadow-lg hover:shadow-xl',
      secondary: 'glass-btn border-cyan-400/30 hover:border-cyan-400/50',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GlassButton.displayName = 'GlassButton';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="glass-text block text-sm font-medium mb-2">{label}</label>}
        <input
          ref={ref}
          className={cn(
            'glass-input w-full',
            error && 'border-red-500/50 focus:border-red-400',
            className
          )}
          {...props}
        />
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  accent?: 'cyan' | 'purple' | 'emerald';
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ title, description, accent = 'cyan', className, children, ...props }, ref) => {
    const accentMap = {
      cyan: 'from-cyan-500/20 to-cyan-500/0',
      purple: 'from-purple-500/20 to-purple-500/0',
      emerald: 'from-emerald-500/20 to-emerald-500/0',
    };

    return (
      <GlassPanel
        ref={ref}
        variant="lg"
        interactive
        className={cn('p-6', `bg-gradient-to-br ${accentMap[accent]}`, className)}
        {...props}
      >
        {title && <h3 className="glass-text text-xl font-semibold mb-2">{title}</h3>}
        {description && <p className="glass-text-muted text-sm mb-4">{description}</p>}
        {children}
      </GlassPanel>
    );
  }
);

GlassCard.displayName = 'GlassCard';
