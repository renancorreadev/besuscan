import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Filter,
  Search,
  Calendar
} from 'lucide-react';
import { CollapseGlass } from '@/components/CollapseGlass';
import { TransactionFilters as TransactionFiltersType, PaginationState } from '../types';

interface TransactionFiltersProps {
  filters: TransactionFiltersType;
  setFilters: React.Dispatch<React.SetStateAction<TransactionFiltersType>>;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  tempTransactionMethod: string;
  setTempTransactionMethod: React.Dispatch<React.SetStateAction<string>>;
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filters,
  setFilters,
  setPagination,
  tempTransactionMethod,
  setTempTransactionMethod
}) => {
  const clearAllFilters = () => {
    setFilters({});
    setTempTransactionMethod('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = () => {
    return !!(filters.contract_type || filters.status || filters.method || filters.dateFrom || filters.dateTo || tempTransactionMethod);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.contract_type) count++;
    if (filters.status) count++;
    if (filters.method) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (tempTransactionMethod) count++;
    return count;
  };

  return (
    <CollapseGlass
      title="Transaction Filters"
      icon={<Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      iconGradient="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-indigo-500/10"
      dividerColor="bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"
      hasActiveFilters={hasActiveFilters()}
      activeFiltersCount={getActiveFiltersCount()}
      onClearFilters={clearAllFilters}
    >
      <div className="glass-filters-grid">
        <div className="space-y-3">
          <label className="glass-filter-label">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Contract Type</span>
            </div>
          </label>
          <div className="relative">
            <Select
              value={filters.contract_type || 'all'}
              onValueChange={(value) => {
                setFilters(prev => ({ ...prev, contract_type: value === 'all' ? undefined : value }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger className="h-12 bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border-0 rounded-xl focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 hover:bg-white/80 dark:hover:bg-gray-600/80 shadow-sm">
                <SelectValue placeholder="All Types" className="text-gray-700 dark:text-gray-200" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl bg-white/95 dark:bg-gray-800/95 border-0 rounded-xl shadow-xl">
                <SelectItem value="all" className="rounded-lg text-gray-700 dark:text-gray-200">All Types</SelectItem>
                <SelectItem value="ERC20" className="rounded-lg text-gray-700 dark:text-gray-200">🪙 ERC-20 Token</SelectItem>
                <SelectItem value="ERC721" className="rounded-lg text-gray-700 dark:text-gray-200">🖼️ ERC-721 NFT</SelectItem>
                <SelectItem value="ERC1155" className="rounded-lg text-gray-700 dark:text-gray-200">🎨 ERC-1155 Multi-Token</SelectItem>
                <SelectItem value="Custom" className="rounded-lg text-gray-700 dark:text-gray-200">📄 Custom Contract</SelectItem>
                {/* <SelectItem value="Proxy" className="rounded-lg text-gray-700 dark:text-gray-200">🔗 Proxy Contract</SelectItem>
                <SelectItem value="DeFi" className="rounded-lg text-gray-700 dark:text-gray-200">💰 DeFi Protocol</SelectItem>
                <SelectItem value="DEX" className="rounded-lg text-gray-700 dark:text-gray-200">🔄 DEX</SelectItem> */}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <label className="glass-filter-label">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-br from-green-500 to-blue-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Status</span>
            </div>
          </label>
          <div className="relative">
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => {
                setFilters(prev => ({ ...prev, status: value === 'all' ? undefined : value }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger className="h-12 bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border-0 rounded-xl focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 hover:bg-white/80 dark:hover:bg-gray-600/80 shadow-sm">
                <SelectValue placeholder="All Status" className="text-gray-700 dark:text-gray-200" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl bg-white/95 dark:bg-gray-800/95 border-0 rounded-xl shadow-xl">
                <SelectItem value="all" className="rounded-lg text-gray-700 dark:text-gray-200">All Status</SelectItem>
                <SelectItem value="success" className="rounded-lg text-gray-700 dark:text-gray-200">✅ Success</SelectItem>
                <SelectItem value="failed" className="rounded-lg text-gray-700 dark:text-gray-200">❌ Failed</SelectItem>
                <SelectItem value="pending" className="rounded-lg text-gray-700 dark:text-gray-200">⏳ Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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
              value={tempTransactionMethod}
              onChange={(e) => setTempTransactionMethod(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border-0 rounded-xl placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 hover:bg-white/80 dark:hover:bg-gray-600/80 shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="glass-filter-label">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-br from-green-500 to-blue-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Date From</span>
            </div>
          </label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full h-12 pl-12 pr-4 bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border-0 rounded-xl text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="glass-filter-label">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-br from-pink-500 to-red-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Date To</span>
            </div>
          </label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, dateTo: e.target.value || undefined }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full h-12 pl-12 pr-4 bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border-0 rounded-xl text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-pink-500/30 transition-all duration-300 shadow-sm"
            />
          </div>
        </div>
      </div>
    </CollapseGlass>
  );
}; 