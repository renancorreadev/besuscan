import React, { useState, useEffect } from 'react';
import { Clock, ExternalLink, Copy, Zap, ArrowRight, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  apiService, 
  EventSummary, 
  formatHash, 
  formatTimestamp, 
  formatTimeAgo,
  formatNumber 
} from '@/services/api';
import { useLatestBlock } from '@/stores/blockchainStore';

const LatestEvents = () => {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { block: latestBlock } = useLatestBlock();

  // Carregar eventos mais recentes
  useEffect(() => {
    loadLatestEvents();
  }, []);

  // Reagir ao último bloco da store para atualizar a lista
  useEffect(() => {
    if (latestBlock) {
      loadLatestEvents();
    }
  }, [latestBlock?.number]);

  const loadLatestEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getEvents({ 
        limit: 6, 
        page: 1,
        order: 'desc' 
      });
      
      if (response.success) {
        setEvents(response.data);
      } else {
        setError('Failed to load latest events');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error loading latest events:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard`,
      duration: 2000,
    });
  };

  const getEventTypeColor = (eventName: string): string => {
    switch (eventName.toLowerCase()) {
      case 'transfer':
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700';
      case 'approval':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700';
      case 'mint':
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700';
      case 'burn':
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700';
      case 'swap':
        return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getEventIcon = (eventName: string) => {
    switch (eventName.toLowerCase()) {
      case 'transfer':
        return <ArrowRight className="h-4 w-4" />;
      case 'approval':
        return <Tag className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Events</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-lg"></div>
                    <div className="space-y-2">
                      <div className="w-32 h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      <div className="w-24 h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    </div>
                  </div>
                  <div className="w-16 h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <Zap className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Events</h3>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <button 
            onClick={loadLatestEvents}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <Zap className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Events</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">No events available</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center">
            <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Events Found</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No smart contract events have been emitted recently. This could be due to low contract activity.
            </p>
            <button 
              onClick={loadLatestEvents}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Events</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatNumber(events.length)} most recent events
              </p>
            </div>
          </div>
          <a 
            href="/events" 
            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            View all
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {events.map((event, index) => (
            <div 
              key={event.id}
              className={cn(
                "group p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-600 transition-all duration-200 hover:shadow-md animate-fade-in",
                "hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-transparent dark:hover:from-orange-900/20 dark:hover:to-transparent"
              )}
              style={{ 
                animationDelay: `${index * 0.1}s`,
                animationFillMode: 'both'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Event Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                      {getEventIcon(event.event_name)}
                    </div>
                  </div>

                  {/* Event Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {event.event_name}
                      </span>
                      <Badge className={`text-xs px-2 py-0.5 ${getEventTypeColor(event.event_name)}`}>
                        {event.event_name}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(event.timestamp)}
                      </span>
                      <span>Block #{formatNumber(event.block_number)}</span>
                    </div>

                    {/* Transaction Hash */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Tx:</span>
                      <button
                        onClick={() => copyToClipboard(event.transaction_hash, 'Transaction hash')}
                        className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-mono"
                      >
                        {formatHash(event.transaction_hash, 8)}
                      </button>
                      <Copy className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
                    </div>
                  </div>
                </div>

                {/* Contract Info */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {event.contract_name || 'Contract'}
                  </div>
                  <button
                    onClick={() => copyToClipboard(event.contract_address, 'Contract address')}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-mono"
                  >
                    {formatHash(event.contract_address, 8)}
                  </button>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Method: {event.method || 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <a 
            href="/events"
            className="flex items-center justify-center gap-2 w-full py-2 px-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
          >
            View all events
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default LatestEvents; 