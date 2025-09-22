import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DollarSign
} from 'lucide-react';
import { CollapseGlass } from '@/components/CollapseGlass';
import { TokenFilters as TokenFiltersType, PaginationState } from '../types';

interface TokenFiltersProps {
  filters: TokenFiltersType;
  setFilters: React.Dispatch<React.SetStateAction<TokenFiltersType>>;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  tempTokenSymbol: string;
  setTempTokenSymbol: React.Dispatch<React.SetStateAction<string>>;
  tempTokenName: string;
  setTempTokenName: React.Dispatch<React.SetStateAction<string>>;
  tempTokenMinBalance: string;
  setTempTokenMinBalance: React.Dispatch<React.SetStateAction<string>>;
}

export const TokenFilters: React.FC<TokenFiltersProps> = ({
  filters,
  setFilters,
  setPagination,
  tempTokenSymbol,
  setTempTokenSymbol,
  tempTokenName,
  setTempTokenName,
  tempTokenMinBalance,
  setTempTokenMinBalance
}) => {
  const clearAllFilters = () => {
    setFilters({});
    setTempTokenSymbol('');
    setTempTokenName('');
    setTempTokenMinBalance('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = () => {
    return !!(filters.hasValue !== undefined || filters.sortBy !== 'balance' || filters.sortDir !== 'desc' || tempTokenSymbol || tempTokenName || tempTokenMinBalance);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.hasValue !== undefined) count++;
    if (filters.sortBy && filters.sortBy !== 'balance') count++;
    if (filters.sortDir && filters.sortDir !== 'desc') count++;
    if (tempTokenSymbol) count++;
    if (tempTokenName) count++;
    if (tempTokenMinBalance) count++;
    return count;
  };

  return (
    <CollapseGlass
      title="Token Display Options"
      icon={<DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />}
      iconGradient="bg-gradient-to-br from-green-500/10 to-emerald-500/10"
      dividerColor="bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"
      hasActiveFilters={hasActiveFilters()}
      activeFiltersCount={getActiveFiltersCount()}
      onClearFilters={clearAllFilters}
    >
      <div className="glass-filters-grid">
        <div className="space-y-3">
          <label className="glass-filter-label">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-br from-green-500 to-teal-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Display Filter</span>
            </div>
          </label>
          <Select
            value={filters.hasValue === true ? 'true' : filters.hasValue === false ? 'false' : 'all'}
            onValueChange={(value) => setFilters(prev => ({
              ...prev,
              hasValue: value === 'true' ? true : value === 'false' ? false : undefined
            }))}
          >
            <SelectTrigger className="glass-select-trigger h-12 bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border border-gray-200/40 dark:border-gray-600/40 rounded-xl focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50 transition-all duration-300 hover:bg-white/80 dark:hover:bg-gray-600/80 shadow-sm">
              <SelectValue placeholder="All Tokens" className="text-gray-700 dark:text-gray-200" />
            </SelectTrigger>
            <SelectContent className="glass-select-content backdrop-blur-xl bg-white/95 dark:bg-gray-700/95 border border-gray-200/50 dark:border-gray-600/50 rounded-xl shadow-xl">
              <SelectItem value="all" className="glass-select-item rounded-lg text-gray-700 dark:text-gray-200">All Tokens</SelectItem>
              <SelectItem value="true" className="glass-select-item rounded-lg text-gray-700 dark:text-gray-200">💰 With USD Value</SelectItem>
              <SelectItem value="false" className="glass-select-item rounded-lg text-gray-700 dark:text-gray-200">🔍 No USD Value</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <label className="glass-filter-label">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Sort By</span>
            </div>
          </label>
          <Select
            value={filters.sortBy || 'balance'}
            onValueChange={(value) => setFilters(prev => ({
              ...prev,
              sortBy: value as 'balance' | 'value_usd' | 'symbol' | 'name'
            }))}
          >
            <SelectTrigger className="h-12 bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border-0 rounded-xl focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 hover:bg-white/80 dark:hover:bg-gray-600/80 shadow-sm">
              <SelectValue placeholder="Sort by balance" className="text-gray-700 dark:text-gray-200" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-white/95 dark:bg-gray-800/95 border-0 rounded-xl shadow-xl">
              <SelectItem value="balance" className="rounded-lg text-gray-700 dark:text-gray-200">💰 Balance</SelectItem>
              <SelectItem value="value_usd" className="rounded-lg text-gray-700 dark:text-gray-200">💵 USD Value</SelectItem>
              <SelectItem value="symbol" className="rounded-lg text-gray-700 dark:text-gray-200">🏷️ Symbol</SelectItem>
              <SelectItem value="name" className="rounded-lg text-gray-700 dark:text-gray-200">📝 Name</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <label className="glass-filter-label">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Sort Direction</span>
            </div>
          </label>
          <Select
            value={filters.sortDir || 'desc'}
            onValueChange={(value) => setFilters(prev => ({
              ...prev,
              sortDir: value as 'asc' | 'desc'
            }))}
          >
            <SelectTrigger className="h-12 bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border-0 rounded-xl focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 hover:bg-white/80 dark:hover:bg-gray-600/80 shadow-sm">
              <SelectValue placeholder="Sort direction" className="text-gray-700 dark:text-gray-200" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-white/95 dark:bg-gray-800/95 border-0 rounded-xl shadow-xl">
              <SelectItem value="desc" className="rounded-lg text-gray-700 dark:text-gray-200">📉 Descending</SelectItem>
              <SelectItem value="asc" className="rounded-lg text-gray-700 dark:text-gray-200">📈 Ascending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <label className="glass-filter-label">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Info</span>
            </div>
          </label>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 Token filtering is performed client-side since the API returns all tokens. 
              Use the display options above to customize the view.
            </p>
          </div>
        </div>
      </div>
    </CollapseGlass>
  );
}; 