import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Zap,
  Search,
  Calendar
} from 'lucide-react';
import { CollapseGlass } from '@/components/CollapseGlass';
import { EventFilters as EventFiltersType, PaginationState } from '../types';

interface EventFiltersProps {
  filters: EventFiltersType;
  setFilters: React.Dispatch<React.SetStateAction<EventFiltersType>>;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  tempEventName: string;
  setTempEventName: React.Dispatch<React.SetStateAction<string>>;
  tempContractAddress: string;
  setTempContractAddress: React.Dispatch<React.SetStateAction<string>>;
}

export const EventFilters: React.FC<EventFiltersProps> = ({
  filters,
  setFilters,
  setPagination,
  tempEventName,
  setTempEventName,
  tempContractAddress,
  setTempContractAddress
}) => {
  const clearAllFilters = () => {
    setFilters({});
    setTempEventName('');
    setTempContractAddress('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = () => {
    return !!(filters.involvementType || filters.dateFrom || filters.dateTo || filters.sortBy !== 'timestamp' || filters.sortDir !== 'desc' || tempEventName || tempContractAddress);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.involvementType) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.sortBy && filters.sortBy !== 'timestamp') count++;
    if (filters.sortDir && filters.sortDir !== 'desc') count++;
    if (tempEventName) count++;
    if (tempContractAddress) count++;
    return count;
  };

  return (
    <CollapseGlass
      title="Event Filters"
      icon={<Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />}
      iconGradient="bg-gradient-to-br from-yellow-500/10 to-orange-500/10"
      dividerColor="bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent"
      hasActiveFilters={hasActiveFilters()}
      activeFiltersCount={getActiveFiltersCount()}
      onClearFilters={clearAllFilters}
    >
      <div className="glass-filters-grid">
        <div className="space-y-3">
          <label className="glass-filter-label">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Event Name</span>
            </div>
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
            <input
              type="text"
              placeholder="Search events..."
              value={tempEventName}
              onChange={(e) => setTempEventName(e.target.value)}
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
              value={tempContractAddress}
              onChange={(e) => setTempContractAddress(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border-0 rounded-xl placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 hover:bg-white/80 dark:hover:bg-gray-600/80 shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="glass-filter-label">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-br from-green-500 to-teal-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Involvement Type</span>
            </div>
          </label>
          <div className="relative">
            <Select
              value={filters.involvementType || 'all'}
              onValueChange={(value) => {
                setFilters(prev => ({ ...prev, involvementType: value === 'all' ? undefined : value }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger className="h-12 bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border-0 rounded-xl focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 hover:bg-white/80 dark:hover:bg-gray-600/80 shadow-sm">
                <SelectValue placeholder="All Types" className="text-gray-700 dark:text-gray-200" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl bg-white/95 dark:bg-gray-800/95 border-0 rounded-xl shadow-xl">
                <SelectItem value="all" className="rounded-lg text-gray-700 dark:text-gray-200">All Types</SelectItem>
                <SelectItem value="emitter" className="rounded-lg text-gray-700 dark:text-gray-200">📤 Emitter</SelectItem>
                <SelectItem value="participant" className="rounded-lg text-gray-700 dark:text-gray-200">👥 Participant</SelectItem>
                <SelectItem value="recipient" className="rounded-lg text-gray-700 dark:text-gray-200">📥 Recipient</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <label className="glass-filter-label">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Date From</span>
            </div>
          </label>
          <div className="relative group">
            <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
            <input
              value={filters.dateFrom || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
              className="w-full h-12 pl-12 pr-4 bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border-0 rounded-xl text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300 hover:bg-white/80 dark:hover:bg-gray-600/80 shadow-sm"
              type="date"
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
          <div className="relative group">
            <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
            <input
              value={filters.dateTo || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value || undefined }))}
              className="w-full h-12 pl-12 pr-4 bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border-0 rounded-xl text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-pink-500/30 transition-all duration-300 hover:bg-white/80 dark:hover:bg-gray-600/80 shadow-sm"
              type="date"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="glass-filter-label">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Sort By</span>
            </div>
          </label>
          <div className="relative">
            <Select
              value={filters.sortBy || 'timestamp'}
              onValueChange={(value) => {
                setFilters(prev => ({ ...prev, sortBy: value as 'timestamp' | 'event_name' | 'contract_address' }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger className="h-12 bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border-0 rounded-xl focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 hover:bg-white/80 dark:hover:bg-gray-600/80 shadow-sm">
                <SelectValue placeholder="Sort by timestamp" className="text-gray-700 dark:text-gray-200" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl bg-white/95 dark:bg-gray-800/95 border-0 rounded-xl shadow-xl">
                <SelectItem value="timestamp" className="rounded-lg text-gray-700 dark:text-gray-200">🕒 Timestamp</SelectItem>
                <SelectItem value="event_name" className="rounded-lg text-gray-700 dark:text-gray-200">📝 Event Name</SelectItem>
                <SelectItem value="contract_address" className="rounded-lg text-gray-700 dark:text-gray-200">🏗️ Contract Address</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <label className="glass-filter-label">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-full shadow-sm"></div>
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