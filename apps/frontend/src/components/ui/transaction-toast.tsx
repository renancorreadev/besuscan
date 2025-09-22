import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, Clock, Zap, ExternalLink, Copy, Wallet, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TransactionToastProps {
  id: string;
  type: 'preparing' | 'wallet' | 'sent' | 'mining' | 'confirmed' | 'error' | 'success' | 'info';
  title: string;
  description?: string;
  functionName?: string;
  transactionHash?: string;
  walletAddress?: string;
  contractAddress?: string;
  duration?: number;
  onClose: (id: string) => void;
  onCopy?: (text: string) => void;
  className?: string;
}

const typeConfig = {
  preparing: {
    icon: Clock,
    iconColor: 'text-blue-300',
    iconBg: 'bg-blue-500/20',
    borderColor: 'border-blue-400/40',
    bgGradient: 'from-blue-500/15 to-cyan-500/10',
    glowColor: 'shadow-blue-500/30',
    textColor: 'text-blue-50',
    descColor: 'text-blue-100/90',
    animation: 'animate-pulse',
  },
  wallet: {
    icon: Wallet,
    iconColor: 'text-amber-300',
    iconBg: 'bg-amber-500/20',
    borderColor: 'border-amber-400/40',
    bgGradient: 'from-amber-500/15 to-yellow-500/10',
    glowColor: 'shadow-amber-500/30',
    textColor: 'text-amber-50',
    descColor: 'text-amber-100/90',
    animation: 'animate-bounce',
  },
  sent: {
    icon: ArrowRight,
    iconColor: 'text-cyan-300',
    iconBg: 'bg-cyan-500/20',
    borderColor: 'border-cyan-400/40',
    bgGradient: 'from-cyan-500/15 to-blue-500/10',
    glowColor: 'shadow-cyan-500/30',
    textColor: 'text-cyan-50',
    descColor: 'text-cyan-100/90',
    animation: 'animate-pulse',
  },
  mining: {
    icon: Zap,
    iconColor: 'text-orange-300',
    iconBg: 'bg-orange-500/20',
    borderColor: 'border-orange-400/40',
    bgGradient: 'from-orange-500/15 to-red-500/10',
    glowColor: 'shadow-orange-500/30',
    textColor: 'text-orange-50',
    descColor: 'text-orange-100/90',
    animation: 'animate-spin',
  },
  confirmed: {
    icon: CheckCircle,
    iconColor: 'text-emerald-300',
    iconBg: 'bg-emerald-500/20',
    borderColor: 'border-emerald-400/40',
    bgGradient: 'from-emerald-500/15 to-green-500/10',
    glowColor: 'shadow-emerald-500/30',
    textColor: 'text-emerald-50',
    descColor: 'text-emerald-100/90',
    animation: 'animate-bounce',
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
    animation: 'animate-pulse',
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-300',
    iconBg: 'bg-green-500/20',
    borderColor: 'border-green-400/40',
    bgGradient: 'from-green-500/15 to-emerald-500/10',
    glowColor: 'shadow-green-500/30',
    textColor: 'text-green-50',
    descColor: 'text-green-100/90',
    animation: 'animate-none',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-300',
    iconBg: 'bg-blue-500/20',
    borderColor: 'border-blue-400/40',
    bgGradient: 'from-blue-500/15 to-indigo-500/10',
    glowColor: 'shadow-blue-500/30',
    textColor: 'text-blue-50',
    descColor: 'text-blue-100/90',
    animation: 'animate-none',
  },
};

export const TransactionToast: React.FC<TransactionToastProps> = ({
  id,
  type,
  title,
  description,
  functionName,
  transactionHash,
  walletAddress,
  contractAddress,
  duration = 0,
  onClose,
  onCopy,
  className,
}) => {
  const [progress, setProgress] = useState(100);
  const config = typeConfig[type];
  const IconComponent = config.icon;

  useEffect(() => {
    if (duration > 0) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (duration / 100));
          if (newProgress <= 0) {
            clearInterval(interval);
            onClose(id);
            return 0;
          }
          return newProgress;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [id, duration, onClose]);

  const handleCopyHash = () => {
    if (transactionHash && onCopy) {
      onCopy(transactionHash);
    }
  };

  const handleCopyAddress = (address: string) => {
    if (onCopy) {
      onCopy(address);
    }
  };

  const formatHash = (hash: string, length = 8) => {
    return `${hash.slice(0, length)}...${hash.slice(-4)}`;
  };

  return (
    <div
      className={cn(
        // Base glass effect with stronger background
        'relative overflow-hidden rounded-2xl border backdrop-blur-xl transaction-toast',
        'bg-gradient-to-br bg-gray-900/85 dark:bg-gray-900/90',
        config.bgGradient,
        config.borderColor,
        
        // Shadow and glow effects
        'shadow-2xl',
        config.glowColor,
        
        // Animation
        'animate-in slide-in-from-right-full duration-500',
        'hover:scale-[1.02] transition-all duration-300',
        
        // Size and spacing
        'min-w-[380px] max-w-[480px] p-5',
        
        // Special effects based on type
        (type === 'mining' || type === 'preparing') && 'mining-glow shimmer-effect',
        type === 'confirmed' && 'success-celebration',
        
        className
      )}
      style={{
        background: 'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(15,23,42,0.9) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
      
      {/* Glass reflection effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent opacity-70" />
      
      {/* Special mining sparkles for mining type */}
      {type === 'mining' && (
        <>
          <div className="absolute top-3 right-3 w-2 h-2 bg-yellow-300 rounded-full animate-ping shadow-lg" />
          <div className="absolute top-5 right-8 w-1.5 h-1.5 bg-orange-300 rounded-full animate-pulse shadow-md" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-4 left-4 w-1 h-1 bg-red-300 rounded-full animate-ping shadow-md" style={{ animationDelay: '1s' }} />
          <div className="absolute top-8 left-8 w-0.5 h-0.5 bg-yellow-200 rounded-full animate-pulse shadow-sm" style={{ animationDelay: '1.5s' }} />
        </>
      )}
      
      {/* Success confetti */}
      {type === 'confirmed' && (
        <>
          <div className="absolute top-2 right-4 w-2 h-2 bg-emerald-300 rounded-full animate-bounce shadow-lg" />
          <div className="absolute top-6 right-2 w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse shadow-md" style={{ animationDelay: '0.3s' }} />
          <div className="absolute bottom-5 left-2 w-1 h-1 bg-lime-300 rounded-full animate-bounce shadow-md" style={{ animationDelay: '0.6s' }} />
          <div className="absolute top-4 left-5 w-0.5 h-0.5 bg-emerald-200 rounded-full animate-pulse shadow-sm" style={{ animationDelay: '0.9s' }} />
        </>
      )}
      
      {/* Content */}
      <div className="relative">
        {/* Header with icon and title */}
        <div className="flex items-start gap-4 mb-3">
          {/* Icon with enhanced visibility */}
          <div className={cn(
            'flex-shrink-0 p-3 rounded-full',
            'bg-gradient-to-br from-white/30 to-white/10',
            'border border-white/40',
            'shadow-xl backdrop-blur-sm',
            config.iconBg,
            config.glowColor,
            config.animation
          )}>
            <IconComponent className={cn('h-6 w-6', config.iconColor, 'drop-shadow-lg')} />
          </div>

          {/* Title and close button */}
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              'font-bold text-lg leading-tight drop-shadow-lg mb-1',
              config.textColor
            )}>
              {title}
            </h4>
            {description && (
              <p className={cn(
                'text-sm leading-relaxed drop-shadow-md font-medium',
                config.descColor
              )}>
                {description}
              </p>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={() => onClose(id)}
            className={cn(
              'flex-shrink-0 p-2 rounded-full',
              'bg-white/20 hover:bg-white/30',
              'border border-white/30 hover:border-white/50',
              'transition-all duration-200',
              'hover:scale-110 active:scale-95',
              'backdrop-blur-sm shadow-lg'
            )}
          >
            <X className="h-4 w-4 text-white/90 hover:text-white drop-shadow-lg" />
          </button>
        </div>

        {/* Transaction details */}
        {(functionName || transactionHash || walletAddress || contractAddress) && (
          <div className="space-y-2 mb-3">
            {functionName && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white/70 font-medium">Função:</span>
                <span className={cn('font-mono font-semibold', config.textColor)}>
                  {functionName}
                </span>
              </div>
            )}
            
            {transactionHash && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white/70 font-medium">Hash:</span>
                <span className={cn('font-mono font-semibold', config.textColor)}>
                  {formatHash(transactionHash, 10)}
                </span>
                <button
                  onClick={handleCopyHash}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Copiar hash da transação"
                >
                  <Copy className="h-3 w-3 text-white/80" />
                </button>
                <a
                  href={`/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Ver transação"
                >
                  <ExternalLink className="h-3 w-3 text-white/80" />
                </a>
              </div>
            )}
            
            {walletAddress && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white/70 font-medium">Carteira:</span>
                <span className={cn('font-mono font-semibold', config.textColor)}>
                  {formatHash(walletAddress, 6)}
                </span>
                <button
                  onClick={() => handleCopyAddress(walletAddress)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Copiar endereço da carteira"
                >
                  <Copy className="h-3 w-3 text-white/80" />
                </button>
              </div>
            )}
            
            {contractAddress && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white/70 font-medium">Contrato:</span>
                <span className={cn('font-mono font-semibold', config.textColor)}>
                  {formatHash(contractAddress, 6)}
                </span>
                <button
                  onClick={() => handleCopyAddress(contractAddress)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Copiar endereço do contrato"
                >
                  <Copy className="h-3 w-3 text-white/80" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Progress bar for timed toasts */}
        {duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-white/15 overflow-hidden rounded-b-2xl">
            <div 
              className={cn(
                'h-full bg-gradient-to-r shadow-lg transition-all duration-100',
                config.bgGradient,
                type === 'mining' && 'animate-pulse'
              )}
              style={{ 
                width: `${progress}%`
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Container for transaction toasts
export interface TransactionToastContainerProps {
  toasts: TransactionToastProps[];
  onClose: (id: string) => void;
  onCopy?: (text: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
};

export const TransactionToastContainer: React.FC<TransactionToastContainerProps> = ({
  toasts,
  onClose,
  onCopy,
  position = 'top-right',
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className={cn(
      'fixed z-[100] flex flex-col gap-4',
      positionClasses[position]
    )}>
      {toasts.map((toast) => (
        <TransactionToast
          key={toast.id}
          {...toast}
          onClose={onClose}
          onCopy={onCopy}
        />
      ))}
    </div>
  );
};

// Hook for managing transaction toasts
export const useTransactionToast = () => {
  const [toasts, setToasts] = React.useState<TransactionToastProps[]>([]);

  const addToast = React.useCallback((toast: Omit<TransactionToastProps, 'id' | 'onClose' | 'onCopy'>) => {
    const id = `tx-toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { ...toast, id, onClose: () => {}, onCopy: () => {} }]);
    return id;
  }, []);

  const updateToast = React.useCallback((id: string, updates: Partial<TransactionToastProps>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
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
    updateToast,
    removeToast,
    clearAll,
  };
}; 