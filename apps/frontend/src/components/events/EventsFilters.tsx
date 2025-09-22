import React, { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, Building, User, Hash, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';

export interface EventFilters {
  search?: string;
  contract_address?: string;
  event_name?: string;
  from_address?: string;
  to_address?: string;
  from_block?: string;
  to_block?: string;
  from_date?: string;
  to_date?: string;
  transaction_hash?: string;
}

interface EventsFiltersProps {
  onFiltersChange: (filters: EventFilters) => void;
  onApplyFilters?: () => void;
  loading?: boolean;
  totalCount?: number;
  currentFilters?: EventFilters;
}

const cleanFilters = (filters: EventFilters): EventFilters => {
  return Object.entries(filters).reduce((acc, [key, value]) => {
    if (value && value.trim() !== '') {
      acc[key as keyof EventFilters] = value.trim();
    }
    return acc;
  }, {} as EventFilters);
};

const EventsFilters: React.FC<EventsFiltersProps> = ({
  onFiltersChange,
  onApplyFilters,
  loading = false,
  totalCount = 0,
  currentFilters = {}
}) => {
  const [tempFilters, setTempFilters] = useState<EventFilters>(currentFilters);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [lastAppliedFilters, setLastAppliedFilters] = useState<string>('');
  
  const debouncedFilters = useDebounce(tempFilters, 1500);

  // Update tempFilters when currentFilters prop changes
  useEffect(() => {
    if (!hasUserInteracted) {
      setTempFilters(currentFilters);
      setLastAppliedFilters(JSON.stringify(cleanFilters(currentFilters)));
    }
  }, [currentFilters]);

  // Trigger API call when debounced filters change
  useEffect(() => {
    if (!hasUserInteracted) return;

    const cleanedFilters = cleanFilters(debouncedFilters);
    const currentFiltersString = JSON.stringify(cleanedFilters);
    
    // Only update if filters have actually changed
    if (currentFiltersString !== lastAppliedFilters) {
      setLastAppliedFilters(currentFiltersString);
      onFiltersChange(cleanedFilters);
    }
  }, [debouncedFilters, onFiltersChange, hasUserInteracted, lastAppliedFilters]);

  const handleInputChange = (field: keyof EventFilters, value: string) => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
    }
    setTempFilters(prev => ({
      ...prev,
      [field]: value || undefined
    }));
  };

  const handleApplyFilters = () => {
    const cleanedFilters = cleanFilters(tempFilters);
    const currentFiltersString = JSON.stringify(cleanedFilters);
    
    if (currentFiltersString !== lastAppliedFilters) {
      setLastAppliedFilters(currentFiltersString);
      onFiltersChange(cleanedFilters);
    }
    
    if (onApplyFilters) {
      onApplyFilters();
    }
  };

  const handleClearFilters = () => {
    setTempFilters({});
    setHasUserInteracted(true);
    setLastAppliedFilters('');
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(tempFilters).some(value => value && value.trim() !== '');

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Search</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Search (Event Name, Contract, Address, Hash)
            </Label>
            <div className="relative">
              <Input
                id="search"
                placeholder="Enter event name, contract address, transaction hash..."
                value={tempFilters.search || ''}
                onChange={(e) => handleInputChange('search', e.target.value)}
                className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 pr-8"
              />
              {tempFilters.search && (
                <button
                  onClick={() => handleInputChange('search', '')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="event_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Event Name
            </Label>
            <div className="relative">
              <Input
                id="event_name"
                placeholder="e.g. Transfer, Approval, Mint"
                value={tempFilters.event_name || ''}
                onChange={(e) => handleInputChange('event_name', e.target.value)}
                className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 pr-8"
              />
              {tempFilters.event_name && (
                <button
                  onClick={() => handleInputChange('event_name', '')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Address Filters */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-green-600 dark:text-green-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Addresses</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contract_address" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Contract Address
            </Label>
            <Input
              id="contract_address"
              placeholder="0x..."
              value={tempFilters.contract_address || ''}
              onChange={(e) => handleInputChange('contract_address', e.target.value)}
              className="w-full font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="from_address" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              From Address
            </Label>
            <Input
              id="from_address"
              placeholder="0x..."
              value={tempFilters.from_address || ''}
              onChange={(e) => handleInputChange('from_address', e.target.value)}
              className="w-full font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="to_address" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              To Address
            </Label>
            <Input
              id="to_address"
              placeholder="0x..."
              value={tempFilters.to_address || ''}
              onChange={(e) => handleInputChange('to_address', e.target.value)}
              className="w-full font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>
        </div>
      </div>

      {/* Block and Hash Filters */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Block & Transaction</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="from_block" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              From Block
            </Label>
            <Input
              id="from_block"
              type="number"
              placeholder="Block number"
              value={tempFilters.from_block || ''}
              onChange={(e) => handleInputChange('from_block', e.target.value)}
              className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
              min="0"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="to_block" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              To Block
            </Label>
            <Input
              id="to_block"
              type="number"
              placeholder="Block number"
              value={tempFilters.to_block || ''}
              onChange={(e) => handleInputChange('to_block', e.target.value)}
              className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
              min="0"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="transaction_hash" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Transaction Hash
            </Label>
            <Input
              id="transaction_hash"
              placeholder="0x..."
              value={tempFilters.transaction_hash || ''}
              onChange={(e) => handleInputChange('transaction_hash', e.target.value)}
              className="w-full font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>
        </div>
      </div>

      {/* Date Range */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Date Range</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="from_date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              From Date
            </Label>
            <Input
              id="from_date"
              type="datetime-local"
              value={tempFilters.from_date || ''}
              onChange={(e) => handleInputChange('from_date', e.target.value)}
              className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="to_date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              To Date
            </Label>
            <Input
              id="to_date"
              type="datetime-local"
              value={tempFilters.to_date || ''}
              onChange={(e) => handleInputChange('to_date', e.target.value)}
              className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button 
          onClick={handleApplyFilters}
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Apply Filters
            </>
          )}
        </Button>
        
        {hasActiveFilters && (
          <Button 
            onClick={handleClearFilters}
            variant="outline"
            disabled={loading}
            className="flex-1 sm:flex-none text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Results Summary */}
      {totalCount > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
          {hasActiveFilters ? `Found ${totalCount.toLocaleString()} events matching your criteria` : `Showing recent events (${totalCount.toLocaleString()} total)`}
        </div>
      )}
    </div>
  );
};

export default EventsFilters; 