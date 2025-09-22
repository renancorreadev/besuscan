import React from 'react';
import { Link } from 'react-router-dom';
import { Copy, Clock, Activity, Hash, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EventSummary, EventsResponse, formatHash, formatAddress, formatTimeAgo } from '@/services/api';

interface EventsTableProps {
  events: EventSummary[];
  loading: boolean;
  error: string | null;
  pagination?: EventsResponse['pagination'] | null;
  currentPage?: number;
  setCurrentPage?: (page: number) => void;
  itemsPerPage?: number;
  setItemsPerPage?: (items: number) => void;
}

const EventsTable: React.FC<EventsTableProps> = ({ 
  events, 
  loading, 
  error, 
  pagination,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getEventTypeColor = (eventName: string): string => {
    const name = eventName.toLowerCase();
    if (name.includes('transfer')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    if (name.includes('approval')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    if (name.includes('mint')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    if (name.includes('burn')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    if (name.includes('swap')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600 dark:text-purple-400" />
          <span className="text-gray-600 dark:text-gray-400">Loading events...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Events</h3>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Events Found</h3>
          <p className="text-gray-600 dark:text-gray-400">No events match your current filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table Header */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-t-xl border-b border-gray-200 dark:border-gray-700">
        <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Smart Contract Events</h2>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">Event</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">Contract</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">Method</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">Age</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">From</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">To</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, index) => (
              <tr 
                key={event.id || `${event.transaction_hash}-${event.log_index}`}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {/* Event Column */}
                <td className="py-4 px-4">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getEventTypeColor(event.event_name)}>
                        {event.event_name}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/event/${event.id || `${event.transaction_hash}-${event.log_index}`}`}
                        className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {formatHash(event.transaction_hash, 12)}
                      </Link>
                      <button
                        onClick={() => copyToClipboard(event.transaction_hash)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </td>

                {/* Contract Column */}
                <td className="py-4 px-4">
                  <div className="flex flex-col space-y-1">
                    {event.contract_name && (
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.contract_name}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/smart-contract/${event.contract_address}`}
                        className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {formatAddress(event.contract_address)}
                      </Link>
                      <button
                        onClick={() => copyToClipboard(event.contract_address)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </td>

                {/* Method Column */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-purple-100 dark:bg-purple-900/30">
                      <Hash className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {event.method || 'Event'}
                    </span>
                  </div>
                </td>

                {/* Age Column */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatTimeAgo(event.timestamp)}
                    </span>
                  </div>
                </td>

                {/* From Column */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/account/${event.from_address}`}
                      className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {formatAddress(event.from_address)}
                    </Link>
                    <button
                      onClick={() => copyToClipboard(event.from_address)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </td>

                {/* To Column */}
                <td className="py-4 px-4">
                  {event.to_address ? (
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/account/${event.to_address}`}
                        className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {formatAddress(event.to_address)}
                      </Link>
                      <button
                        onClick={() => copyToClipboard(event.to_address)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      —
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EventsTable; 