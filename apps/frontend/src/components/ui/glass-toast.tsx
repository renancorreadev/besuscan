import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, LucideIcon, Pickaxe } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GlassToastProps {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'block';
  duration?: number;
  onClose: (id: string) => void;
  className?: string;
}

const typeConfig = {
  success: {
    icon: CheckCircle,
    iconColor: 'text-emerald-300',
    iconBg: 'bg-emerald-500/20',
    borderColor: 'border-emerald-400/40',
    bgGradient: 'from-emerald-500/15 to-green-500/10',
    glowColor: 'shadow-emerald-500/30',
    textColor: 'text-emerald-50',
    descColor: 'text-emerald-100/90',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-red-300',
    iconBg: 'bg-red-500/20',
    borderColor: 'border-red-400/40',
    bgGradient: 'from-red-500/15 to-pink-500/10',
    glowColor: 'shadow-red-500/30',
    textColor: 'text-red-50',
    descColor: 'text-red-100/90',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-300',
    iconBg: 'bg-amber-500/20',
    borderColor: 'border-amber-400/40',
    bgGradient: 'from-amber-500/15 to-yellow-500/10',
    glowColor: 'shadow-amber-500/30',
    textColor: 'text-amber-50',
    descColor: 'text-amber-100/90',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-300',
    iconBg: 'bg-blue-500/20',
    borderColor: 'border-blue-400/40',
    bgGradient: 'from-blue-500/15 to-cyan-500/10',
    glowColor: 'shadow-blue-500/30',
    textColor: 'text-blue-50',
    descColor: 'text-blue-100/90',
  },
  block: {
    icon: Pickaxe,
    iconColor: 'text-purple-200',
    iconBg: 'bg-purple-500/25',
    borderColor: 'border-purple-400/50',
    bgGradient: 'from-purple-500/20 to-indigo-500/15',
    glowColor: 'shadow-purple-500/40',
    textColor: 'text-purple-50',
    descColor: 'text-purple-100/95',
  },
};

export const GlassToast: React.FC<GlassToastProps> = ({
  id,
  title,
  description,
  type = 'info',
  duration = 5000,
  onClose,
  className,
}) => {
  const config = typeConfig[type];
  const IconComponent = config.icon as LucideIcon;

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  return (
    <div
      className={cn(
        // Base glass effect with stronger background
        'relative overflow-hidden rounded-2xl border backdrop-blur-xl glass-toast',
        'bg-gradient-to-br',
        // Stronger background for better text visibility
        type === 'block' 
          ? 'bg-gray-900/80 dark:bg-gray-900/90' 
          : 'bg-gray-800/70 dark:bg-gray-900/80',
        config.bgGradient,
        config.borderColor,
        
        // Shadow and glow effects
        'shadow-2xl',
        config.glowColor,
        
        // Animation
        'animate-in slide-in-from-right-full duration-300',
        'hover:scale-[1.02] transition-all duration-200',
        
        // Size and spacing
        'min-w-[320px] max-w-[420px] p-4',
        
        // Special effects for block type
        type === 'block' && 'mining-glow shimmer-effect',
        
        className
      )}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent animate-pulse" />
      
      {/* Glass reflection effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-60" />
      
      {/* Special mining sparkles for block type */}
      {type === 'block' && (
        <>
          <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping shadow-lg" />
          <div className="absolute top-4 right-6 w-1 h-1 bg-purple-300 rounded-full animate-pulse shadow-md" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-3 left-3 w-1 h-1 bg-blue-300 rounded-full animate-ping shadow-md" style={{ animationDelay: '1s' }} />
          <div className="absolute top-6 left-6 w-0.5 h-0.5 bg-emerald-300 rounded-full animate-pulse shadow-sm" style={{ animationDelay: '1.5s' }} />
        </>
      )}
      
      {/* Content */}
      <div className="relative flex items-start gap-3">
        {/* Icon with enhanced visibility */}
        <div className={cn(
          'flex-shrink-0 p-2.5 rounded-full',
          'bg-gradient-to-br from-white/25 to-white/10',
          'border border-white/30',
          'shadow-lg backdrop-blur-sm',
          config.iconBg,
          config.glowColor,
          type === 'block' && 'animate-pulse'
        )}>
          {type === 'block' ? (
            <div className="relative">
              <Pickaxe className={cn('h-5 w-5', config.iconColor, 'drop-shadow-lg')} />
              <div className="absolute inset-0 animate-bounce" style={{ animationDuration: '2s' }}>
                <Pickaxe className="h-5 w-5 text-yellow-200/30" />
              </div>
            </div>
          ) : (
            <IconComponent className={cn('h-5 w-5', config.iconColor, 'drop-shadow-lg')} />
          )}
        </div>

        {/* Text content with better contrast */}
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            'font-bold text-base leading-tight drop-shadow-lg',
            config.textColor
          )}>
            {title}
          </h4>
          {description && (
            <p className={cn(
              'mt-1.5 text-sm leading-relaxed drop-shadow-md font-medium',
              config.descColor
            )}>
              {description}
            </p>
          )}
        </div>

        {/* Close button with better visibility */}
        <button
          onClick={() => onClose(id)}
          className={cn(
            'flex-shrink-0 p-2 rounded-full',
            'bg-white/15 hover:bg-white/25',
            'border border-white/25 hover:border-white/40',
            'transition-all duration-200',
            'hover:scale-110 active:scale-95',
            'backdrop-blur-sm shadow-lg'
          )}
        >
          <X className="h-4 w-4 text-white/90 hover:text-white drop-shadow-lg" />
        </button>
      </div>

      {/* Progress bar for timed toasts */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/15 overflow-hidden rounded-b-2xl">
          <div 
            className={cn(
              'h-full bg-gradient-to-r shadow-lg',
              config.bgGradient,
              type === 'block' && 'animate-pulse'
            )}
            style={{ 
              animation: `progress-bar ${duration}ms linear forwards`
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes progress-bar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

// Toast container component
export interface GlassToastContainerProps {
  toasts: GlassToastProps[];
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

export const GlassToastContainer: React.FC<GlassToastContainerProps> = ({
  toasts,
  onClose,
  position = 'top-right',
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className={cn(
      'fixed z-50 flex flex-col gap-3',
      positionClasses[position]
    )}>
      {toasts.map((toast) => (
        <GlassToast
          key={toast.id}
          {...toast}
          onClose={onClose}
        />
      ))}
    </div>
  );
};

// Hook for managing glass toasts
export const useGlassToast = () => {
  const [toasts, setToasts] = React.useState<GlassToastProps[]>([]);

  const addToast = React.useCallback((toast: Omit<GlassToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id, onClose: () => {} }]);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAll = React.useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    clearAll,
  };
}; 