import React, { useState, useEffect } from 'react';
import { Zap, Database, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import cacheService from '@/services/cache-service';

interface CacheIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const CacheIndicator: React.FC<CacheIndicatorProps> = ({ 
  className, 
  showDetails = false 
}) => {
  const [stats, setStats] = useState({ size: 0, hitRate: 0 });
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      const cacheStats = cacheService.getStats();
      setStats(cacheStats);
      setIsActive(cacheStats.size > 0);
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!showDetails) {
    return (
      <div className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200",
        isActive 
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
        className
      )}>
        <Zap className={cn(
          "h-3 w-3",
          isActive && "animate-pulse"
        )} />
        <span>Cache {isActive ? 'Active' : 'Inactive'}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm",
      className
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
          <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Cache Performance
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Database className="h-3 w-3" />
            <span>Cached Items</span>
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {stats.size}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <TrendingUp className="h-3 w-3" />
            <span>Hit Rate</span>
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {stats.hitRate.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isActive ? "bg-green-500 animate-pulse" : "bg-gray-400"
          )} />
          <span>
            {isActive ? 'Cache is actively serving requests' : 'Cache is inactive'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CacheIndicator; 