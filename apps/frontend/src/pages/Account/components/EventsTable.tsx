import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Loader2 } from 'lucide-react';
import { AccountEvent } from '../types';
import { formatAddress, formatTimeAgo, formatNumber, copyToClipboard, getInvolvementBadgeClass } from './utils';

interface EventsTableProps {
  events: AccountEvent[];
  loading: boolean;
}

export const EventsTable: React.FC<EventsTableProps> = ({
  events,
  loading
}) => {
  return (
    <div className="glass-table-container">
      <table className="glass-table">
        <thead className="glass-table-header">
          <tr>
            <th>Event</th>
            <th>Contract</th>
            <th>Transaction</th>
            <th>Involvement</th>
            <th>Block</th>
            <th>Data</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody className="glass-table-body">
          {loading ? (
            <tr className="glass-table-row">
              <td colSpan={7} className="glass-table-cell text-center py-8">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-gray-500 dark:text-gray-400">Loading events...</span>
                </div>
              </td>
            </tr>
          ) : events.length === 0 ? (
            <tr className="glass-table-row">
              <td colSpan={7} className="glass-table-cell text-center py-8 text-gray-500 dark:text-gray-400">
                No events found
              </td>
            </tr>
          ) : (
            events.map((event) => (
              <tr key={event.id} className="glass-table-row">
                <td className="glass-table-cell">
                  <div className="space-y-1">
                    <div className="font-medium text-purple-600 dark:text-purple-400">
                      {event.event_name}
                    </div>
                    <div className="text-xs font-mono text-gray-500 dark:text-gray-400">
                      {event.event_signature.slice(0, 10)}...
                    </div>
                  </div>
                </td>
                <td className="glass-table-cell">
                  <div className="space-y-1">
                    {event.contract_name && (
                      <div className="font-medium">{event.contract_name}</div>
                    )}
                    <div className="address-display text-xs">
                      {formatAddress(event.contract_address)}
                    </div>
                  </div>
                </td>
                <td className="glass-table-cell">
                  <div className="address-display">
                    <span>{formatAddress(event.transaction_hash)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(event.transaction_hash)}
                      className="glass-action-button h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
                <td className="glass-table-cell">
                  <span className={`glass-badge ${getInvolvementBadgeClass(event.involvement_type)}`}>
                    {event.involvement_type}
                  </span>
                </td>
                <td className="glass-table-cell">
                  <div className="font-mono text-sm">
                    #{formatNumber(event.block_number)}
                  </div>
                </td>
                <td className="glass-table-cell">
                  {event.decoded_data ? (
                    <div className="max-w-48 overflow-hidden">
                      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded text-wrap">
                        {JSON.stringify(event.decoded_data, null, 2).slice(0, 100)}
                        {JSON.stringify(event.decoded_data, null, 2).length > 100 && '...'}
                      </pre>
                    </div>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 text-xs">No decoded data</span>
                  )}
                </td>
                <td className="glass-table-cell">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formatTimeAgo(event.timestamp)}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}; 