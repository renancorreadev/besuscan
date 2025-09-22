import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

interface CollapseGlassProps {
  title: string;
  icon: React.ReactNode;
  iconGradient: string;
  dividerColor: string;
  hasActiveFilters: boolean;
  activeFiltersCount: number;
  onClearFilters: () => void;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export const CollapseGlass: React.FC<CollapseGlassProps> = ({
  title,
  icon,
  iconGradient,
  dividerColor,
  hasActiveFilters,
  activeFiltersCount,
  onClearFilters,
  children,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="relative">
      {/* Header with Collapse Toggle */}
      <div className="px-6 py-4 bg-gradient-to-r from-white/90 via-white/95 to-white/90 dark:from-gray-800/90 dark:via-gray-800/95 dark:to-gray-800/90 backdrop-blur-xl border-b border-gray-200/30 dark:border-gray-700/30">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${iconGradient} backdrop-blur-sm border border-blue-200/20 dark:border-blue-700/20`}>
              {icon}
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {title}
              </h3>
              {hasActiveFilters && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {activeFiltersCount} active filters
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={onClearFilters}
                className="group px-3 py-2 bg-red-50/60 dark:bg-red-900/20 backdrop-blur-md rounded-xl hover:bg-red-100/80 dark:hover:bg-red-900/40 transition-all duration-300 border border-red-200/30 dark:border-red-700/30"
              >
                <X className="h-4 w-4 mr-2 text-red-600 dark:text-red-400 group-hover:rotate-90 transition-transform duration-300" />
                <span className="text-red-700 dark:text-red-300 text-sm font-medium">Clear</span>
              </Button>
            )}
            
            <Button
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="group px-4 py-2.5 bg-white/60 dark:bg-gray-700/60 backdrop-blur-md rounded-xl hover:bg-white/80 dark:hover:bg-gray-600/80 transition-all duration-300 border border-gray-200/30 dark:border-gray-600/30"
            >
              <span className="text-gray-700 dark:text-gray-200 font-medium mr-2">
                {isExpanded ? 'Hide Filters' : 'Show Filters'}
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-300 group-hover:scale-110 transition-transform duration-300" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-300 group-hover:scale-110 transition-transform duration-300" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Animated Divider */}
      <div className={`h-0.5 ${dividerColor} transition-all duration-500 ${isExpanded ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}></div>

      {/* Collapsible Filters Content */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 py-6 bg-gradient-to-br from-white/80 via-white/90 to-gray-50/80 dark:from-gray-800/80 dark:via-gray-800/90 dark:to-gray-900/80 backdrop-blur-xl border-b border-gray-200/20 dark:border-gray-700/20">
          {children}
        </div>
      </div>
    </div>
  );
}; 