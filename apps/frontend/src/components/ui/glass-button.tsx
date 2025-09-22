import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  loading?: boolean;
  children: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  children,
  className,
  disabled,
  ...props
}) => {
  const baseClasses = "group relative overflow-hidden font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100";
  
  const variantClasses = {
    primary: "bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-700/30 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 focus:ring-blue-500/50",
    secondary: "bg-white/15 dark:bg-gray-800/15 backdrop-blur-sm border border-white/25 dark:border-gray-600/25 text-gray-600 dark:text-gray-400 hover:bg-white/25 dark:hover:bg-gray-700/25 hover:border-gray-400/50 hover:text-gray-700 dark:hover:text-gray-300 focus:ring-gray-500/50",
    success: "bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-700/30 hover:border-green-500/50 hover:text-green-600 dark:hover:text-green-400 focus:ring-green-500/50",
    warning: "bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-700/30 hover:border-yellow-500/50 hover:text-yellow-600 dark:hover:text-yellow-400 focus:ring-yellow-500/50",
    danger: "bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-700/30 hover:border-red-500/50 hover:text-red-600 dark:hover:text-red-400 focus:ring-red-500/50"
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-4 py-2 text-sm rounded-xl",
    lg: "px-6 py-3 text-base rounded-xl"
  };

  const gradientClasses = {
    primary: "from-blue-500/10 to-indigo-500/10",
    secondary: "from-gray-500/10 to-gray-600/10",
    success: "from-green-500/10 to-emerald-500/10",
    warning: "from-yellow-500/10 to-orange-500/10",
    danger: "from-red-500/10 to-pink-500/10"
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {/* Gradient Background on Hover */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl",
        gradientClasses[variant]
      )}></div>
      
      {/* Content */}
      <div className="relative flex items-center justify-center gap-2">
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        ) : Icon ? (
          <Icon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
        ) : null}
        <span>{children}</span>
      </div>
    </button>
  );
};

export default GlassButton; 