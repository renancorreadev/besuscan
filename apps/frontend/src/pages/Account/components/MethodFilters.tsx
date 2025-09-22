import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Code,
  Search
} from 'lucide-react';
import { CollapseGlass } from '@/components/CollapseGlass';
import { MethodFilters as MethodFiltersType, PaginationState } from '../types';

interface MethodFiltersProps {
  filters: MethodFiltersType;
  setFilters: React.Dispatch<React.SetStateAction<MethodFiltersType>>;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  tempMethodName: string;
  setTempMethodName: React.Dispatch<React.SetStateAction<string>>;
  tempContractType: string;
  setTempContractType: React.Dispatch<React.SetStateAction<string>>;
}

export const MethodFilters: React.FC<MethodFiltersProps> = ({
  filters,
  setFilters,
  setPagination,
  tempMethodName,
  setTempMethodName,
  tempContractType,
  setTempContractType
}) => {
  const clearAllFilters = () => {
    setFilters({ sortBy: 'executions' });
    setTempMethodName('');
    setTempContractType('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = () => {
    return !!(filters.sortBy !== 'executions' || filters.sortDir !== 'desc' || tempMethodName || tempContractType);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.sortBy && filters.sortBy !== 'executions') count++;
    if (filters.sortDir && filters.sortDir !== 'desc') count++;
    if (tempMethodName) count++;
    if (tempContractType) count++;
    return count;
  };

  return (
    <CollapseGlass
      title="Method Filters"
      icon={<Code className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
      iconGradient="bg-gradient-to-br from-purple-500/10 to-pink-500/10"
      dividerColor="bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"
      hasActiveFilters={hasActiveFilters()}
      activeFiltersCount={getActiveFiltersCount()}
      onClearFilters={clearAllFilters}
    >
      <div className="glass-filters-grid">
        <div className="space-y-3">
          <label className="glass-filter-label">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Method Name</span>
            </div>
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
            <input
              type="text"
              placeholder="Search methods..."
              value={tempMethodName}
              onChange={(e) => setTempMethodName(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border-0 rounded-xl placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 hover:bg-white/80 dark:hover:bg-gray-600/80 shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="glass-filter-label">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Contract Address</span>
            </div>
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
            <input
              type="text"
              placeholder="Search contract address..."
              value={tempContractType}
              onChange={(e) => setTempContractType(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border-0 rounded-xl placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 hover:bg-white/80 dark:hover:bg-gray-600/80 shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="glass-filter-label">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-br from-green-500 to-teal-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Sort By</span>
            </div>
          </label>
          <div className="relative">
            <Select
              value={filters.sortBy || 'executions'}
              onValueChange={(value) => {
                setFilters(prev => ({ ...prev, sortBy: value as 'executions' | 'success_rate' | 'gas_used' | 'value_sent' | 'recent' }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger className="h-12 bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border-0 rounded-xl focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 hover:bg-white/80 dark:hover:bg-gray-600/80 shadow-sm">
                <SelectValue placeholder="Sort by executions" className="text-gray-700 dark:text-gray-200" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl bg-white/95 dark:bg-gray-800/95 border-0 rounded-xl shadow-xl">
                <SelectItem value="executions" className="rounded-lg text-gray-700 dark:text-gray-200">📈 Most Executions</SelectItem>
                <SelectItem value="success_rate" className="rounded-lg text-gray-700 dark:text-gray-200">✅ Success Rate</SelectItem>
                <SelectItem value="gas_used" className="rounded-lg text-gray-700 dark:text-gray-200">⛽ Gas Usage</SelectItem>
                <SelectItem value="value_sent" className="rounded-lg text-gray-700 dark:text-gray-200">💰 Value Sent</SelectItem>
                <SelectItem value="recent" className="rounded-lg text-gray-700 dark:text-gray-200">🕒 Most Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <label className="glass-filter-label">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Sort Direction</span>
            </div>
          </label>
          <div className="relative">
            <Select
              value={filters.sortDir || 'desc'}
              onValueChange={(value) => {
                setFilters(prev => ({ ...prev, sortDir: value as 'asc' | 'desc' }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
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
        </div>
      </div>
    </CollapseGlass>
  );
}; 