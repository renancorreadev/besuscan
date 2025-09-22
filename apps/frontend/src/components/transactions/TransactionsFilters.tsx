import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Filter, Search, Calendar, DollarSign, Activity, Zap, X, Hash, User, Clock, Fuel } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';

export interface TransactionFilters {
  search?: string;
  from?: string;
  to?: string;
  status?: 'success' | 'failed' | 'pending';
  min_value?: string;
  max_value?: string;
  min_gas?: string;
  max_gas?: string;
  min_gas_used?: string;
  max_gas_used?: string;
  tx_type?: number;
  from_date?: string;
  to_date?: string;
  from_block?: string;
  to_block?: string;
  contract_creation?: boolean;
  has_data?: boolean;
}

export interface TransactionsFiltersProps {
  excludeVoteProgram: boolean;
  setExcludeVoteProgram: (value: boolean) => void;
  onFiltersChange: (filters: TransactionFilters) => void;
  loading: boolean;
  totalCount: number;
  currentFilters?: TransactionFilters;
}

const TransactionsFilters: React.FC<TransactionsFiltersProps> = ({
  excludeVoteProgram,
  setExcludeVoteProgram,
  onFiltersChange,
  loading = false,
  totalCount = 0,
  currentFilters
}) => {
  const [filters, setFilters] = useState<TransactionFilters>(currentFilters || {});
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  // Use debounce hook with 1.5 second delay
  const debouncedFilters = useDebounce(filters, 1500);

  // Use useEffect to update local filters when currentFilters changes
  useEffect(() => {
    if (currentFilters) {
      setFilters(currentFilters);
    }
  }, [currentFilters]);

  // Trigger API call when debounced filters change
  useEffect(() => {
    onFiltersChange(debouncedFilters);
  }, [debouncedFilters, onFiltersChange]);

  // Update filters - no need to trigger API call directly
  const updateFilters = useCallback((newFilters: Partial<TransactionFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    
    // Remove empty values
    Object.keys(updatedFilters).forEach(key => {
      const value = updatedFilters[key as keyof TransactionFilters];
      if (value === '' || value === undefined || value === null) {
        delete updatedFilters[key as keyof TransactionFilters];
      }
    });

    setFilters(updatedFilters);
    
    // Update active filters list for display
    const active = Object.keys(updatedFilters).filter(key => {
      const value = updatedFilters[key as keyof TransactionFilters];
      return value !== '' && value !== undefined && value !== null;
    });
    setActiveFilters(active);
  }, [filters]);

  // Quick filter handlers
  const handleHighValueFilter = () => {
    const isActive = filters.min_value === '1000000000000000000'; // 1 ETH in Wei
    updateFilters({
      min_value: isActive ? undefined : '1000000000000000000'
    });
  };

  const handleFailedTransactionsFilter = () => {
    const isActive = filters.status === 'failed';
    updateFilters({
      status: isActive ? undefined : 'failed'
    });
  };

  const handleContractCreationFilter = () => {
    const isActive = filters.contract_creation === true;
    updateFilters({
      contract_creation: isActive ? undefined : true
    });
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({});
    setActiveFilters([]);
    onFiltersChange({});
  };

  // Apply filters immediately (bypass debounce)
  const applyFilters = () => {
    onFiltersChange(filters);
  };

  // Remove specific filter
  const removeFilter = (filterKey: string) => {
    const newFilters = { ...filters };
    delete newFilters[filterKey as keyof TransactionFilters];
    setFilters(newFilters);
    setActiveFilters(activeFilters.filter(key => key !== filterKey));
    onFiltersChange(newFilters);
  };

  // Format filter display names
  const getFilterDisplayName = (key: string, value: any): string => {
    switch (key) {
      case 'search': return `Search: ${value}`;
      case 'from': return `From: ${value.slice(0, 10)}...`;
      case 'to': return `To: ${value.slice(0, 10)}...`;
      case 'status': return `Status: ${value}`;
      case 'min_value': return `Min Value: ${parseFloat(value) / 1e18} ETH`;
      case 'max_value': return `Max Value: ${parseFloat(value) / 1e18} ETH`;
      case 'tx_type': return `Type: ${value === 0 ? 'Legacy' : value === 1 ? 'EIP-2930' : 'EIP-1559'}`;
      case 'from_date': return `From: ${value}`;
      case 'to_date': return `To: ${value}`;
      case 'from_block': return `Block ≥ ${value}`;
      case 'to_block': return `Block ≤ ${value}`;
      case 'contract_creation': return 'Contract Creation';
      case 'has_data': return 'Has Input Data';
      default: return `${key}: ${value}`;
    }
  };

  const handleFilterChange = (key: keyof TransactionFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <div className="space-y-6">
      {/* Quick Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Filters:</span>
        </div>
        
        <Badge 
          variant={excludeVoteProgram ? "default" : "outline"}
          className={`cursor-pointer transition-all duration-200 text-gray-900 dark:text-white ${
            excludeVoteProgram 
              ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700' 
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
          }`}
          onClick={() => setExcludeVoteProgram(!excludeVoteProgram)}
        >
          <Activity className="h-3 w-3 mr-1" />
          Exclude Vote Program
        </Badge>
        
        <Badge 
          variant={filters.min_value === '1000000000000000000' ? "default" : "outline"}
          className={`cursor-pointer transition-all duration-200 text-gray-900 dark:text-white ${
            filters.min_value === '1000000000000000000'
              ? 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700'
              : 'border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
          }`}
          onClick={handleHighValueFilter}
        >
          <DollarSign className="h-3 w-3 mr-1" />
          High Value (&gt;1 ETH)
        </Badge>
        
        <Badge 
          variant={filters.status === 'failed' ? "default" : "outline"}
          className={`cursor-pointer transition-all duration-200 text-gray-900 dark:text-white ${
            filters.status === 'failed'
              ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'
              : 'border-gray-300 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
          }`}
          onClick={handleFailedTransactionsFilter}
        >
          <Zap className="h-3 w-3 mr-1" />
          Failed Transactions
        </Badge>

        <Badge 
          variant={filters.contract_creation === true ? "default" : "outline"}
          className={`cursor-pointer transition-all duration-200 text-gray-900 dark:text-white ${
            filters.contract_creation === true
              ? 'bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700'
              : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'
          }`}
          onClick={handleContractCreationFilter}
        >
          <Hash className="h-3 w-3 mr-1" />
          Contract Creation
        </Badge>
      </div>

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Filters:</span>
          {activeFilters.map((filterKey) => (
            <Badge
              key={filterKey}
              variant="secondary"
              className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700"
              onClick={() => removeFilter(filterKey)}
            >
              {getFilterDisplayName(filterKey, filters[filterKey as keyof TransactionFilters])}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}

      {/* Advanced Filters */}
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-6">
          {/* Row 1: Search and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search by Hash/Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input 
                  placeholder="Hash, address, or block..." 
                  className="pl-10 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>

                         {/* Transaction Status */}
             <div className="space-y-2">
               <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
               <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value as any)}>
                 <SelectTrigger className="border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                   <SelectValue placeholder="All statuses" />
                 </SelectTrigger>
                 <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                   <SelectItem value="all" className="text-gray-900 dark:text-white">All Statuses</SelectItem>
                   <SelectItem value="success" className="text-gray-900 dark:text-white">Success</SelectItem>
                   <SelectItem value="failed" className="text-gray-900 dark:text-white">Failed</SelectItem>
                   <SelectItem value="pending" className="text-gray-900 dark:text-white">Pending</SelectItem>
                 </SelectContent>
               </Select>
             </div>

                         {/* Transaction Type */}
             <div className="space-y-2">
               <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
               <Select value={filters.tx_type?.toString() || 'all'} onValueChange={(value) => handleFilterChange('tx_type', value === 'all' ? undefined : parseInt(value) as any)}>
                 <SelectTrigger className="border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                   <SelectValue placeholder="All types" />
                 </SelectTrigger>
                 <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                   <SelectItem value="all" className="text-gray-900 dark:text-white">All Types</SelectItem>
                   <SelectItem value="0" className="text-gray-900 dark:text-white">Legacy (Type 0)</SelectItem>
                   <SelectItem value="1" className="text-gray-900 dark:text-white">EIP-2930 (Type 1)</SelectItem>
                   <SelectItem value="2" className="text-gray-900 dark:text-white">EIP-1559 (Type 2)</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          </div>

          {/* Row 2: Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* From Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">From Address</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input 
                  placeholder="0x..." 
                  className="pl-10 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  value={filters.from || ''}
                  onChange={(e) => handleFilterChange('from', e.target.value)}
                />
              </div>
            </div>

            {/* To Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">To Address</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input 
                  placeholder="0x..." 
                  className="pl-10 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  value={filters.to || ''}
                  onChange={(e) => handleFilterChange('to', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Row 3: Value Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Min Value (ETH)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input 
                  placeholder="0.0" 
                  type="number"
                  step="0.001"
                  className="pl-10 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  value={filters.min_value ? (parseFloat(filters.min_value) / 1e18).toString() : ''}
                  onChange={(e) => handleFilterChange('min_value', e.target.value ? (parseFloat(e.target.value) * 1e18).toString() : undefined)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max Value (ETH)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input 
                  placeholder="0.0" 
                  type="number"
                  step="0.001"
                  className="pl-10 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  value={filters.max_value ? (parseFloat(filters.max_value) / 1e18).toString() : ''}
                  onChange={(e) => handleFilterChange('max_value', e.target.value ? (parseFloat(e.target.value) * 1e18).toString() : undefined)}
                />
              </div>
            </div>
          </div>

          {/* Row 4: Gas Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Min Gas Used</label>
              <div className="relative">
                <Fuel className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input 
                  placeholder="21000" 
                  type="number"
                  className="pl-10 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  value={filters.min_gas_used || ''}
                  onChange={(e) => handleFilterChange('min_gas_used', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max Gas Used</label>
              <div className="relative">
                <Fuel className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input 
                  placeholder="1000000" 
                  type="number"
                  className="pl-10 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  value={filters.max_gas_used || ''}
                  onChange={(e) => handleFilterChange('max_gas_used', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Row 5: Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">From Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input 
                  type="date"
                  className="pl-10 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={filters.from_date || ''}
                  onChange={(e) => handleFilterChange('from_date', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">To Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input 
                  type="date"
                  className="pl-10 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={filters.to_date || ''}
                  onChange={(e) => handleFilterChange('to_date', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Row 6: Block Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">From Block</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input 
                  placeholder="Block number" 
                  type="number"
                  className="pl-10 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  value={filters.from_block || ''}
                  onChange={(e) => handleFilterChange('from_block', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">To Block</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input 
                  placeholder="Block number" 
                  type="number"
                  className="pl-10 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  value={filters.to_block || ''}
                  onChange={(e) => handleFilterChange('to_block', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Searching...
              </span>
            ) : (
              <span className="font-medium text-gray-900 dark:text-white">{totalCount.toLocaleString()}</span>
            )}
            {!loading && ' transactions match your filters'}
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
              onClick={resetFilters}
              disabled={activeFilters.length === 0}
            >
              Reset Filters
            </Button>
            <Button 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
              onClick={applyFilters}
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Apply Now'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TransactionsFilters;
