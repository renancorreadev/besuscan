import React, { useState, useEffect, useRef } from 'react';
import { Clock, ExternalLink, Copy, Box, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  apiService, 
  BlockSummary, 
  formatHash, 
  formatTimestamp, 
  formatTimeAgo,
  formatGasUsed, 
  formatNumber 
} from '@/services/api';
import { useLatestBlock } from '@/stores/blockchainStore';

const LatestBlocks = () => {
  const [blocks, setBlocks] = useState<BlockSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { block: latestBlock } = useLatestBlock();

  // Carregar blocos mais recentes
  useEffect(() => {
    loadLatestBlocks();
  }, []);

  // Reagir ao último bloco da store para atualizar a lista
  useEffect(() => {
    if (latestBlock) {
      loadLatestBlocks(false); // Don't show loading on auto-refresh
    }
  }, [latestBlock?.number]);

  const loadLatestBlocks = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      const response = await apiService.getBlocks({ 
        limit: 6, 
        page: 1,
        order: 'desc' 
      });
      
      if (response.success) {
        setBlocks(response.data);
      } else {
        setError('Failed to load latest blocks');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error loading latest blocks:', err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
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

  const calculateGasPercentage = (gasUsed: number, gasLimit: number): number => {
    if (!gasUsed || !gasLimit || gasLimit === 0) return 0;
    return (gasUsed / gasLimit) * 100;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Box className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Blocks</h3>
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
                      <div className="w-20 h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      <div className="w-32 h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
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
              <Box className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Blocks</h3>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <button 
            onClick={() => loadLatestBlocks(true)}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!blocks || blocks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <Box className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Blocks</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">No blocks available</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center">
            <Box className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Blocks Found</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No blocks are available at the moment. This could be due to network issues or the blockchain being empty.
            </p>
            <button 
              onClick={() => loadLatestBlocks(true)}
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
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Box className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Blocks</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatNumber(blocks.length)} most recent blocks
              </p>
            </div>
          </div>
          <a 
            href="/blocks" 
            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            View all
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {blocks.map((block, index) => (
            <div 
              key={block.hash}
              className={cn(
                "group p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 transition-all duration-200 hover:shadow-md animate-fade-in",
                "hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent dark:hover:from-blue-900/20 dark:hover:to-transparent"
              )}
              style={{ 
                animationDelay: `${index * 0.1}s`,
                animationFillMode: 'both'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Block Number */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm group-hover:scale-105 transition-transform">
                      {block.number.toString().slice(-2)}
                    </div>
                  </div>

                  {/* Block Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => copyToClipboard(block.number.toString(), 'Block number')}
                        className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        #{formatNumber(block.number)}
                      </button>
                      <Copy className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(block.timestamp)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {formatNumber(block.tx_count)} txs
                      </span>
                    </div>

                    {/* Miner */}
                    <div className="mt-1">
                      <button
                        onClick={() => copyToClipboard(block.miner, 'Miner address')}
                        className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-mono"
                      >
                        Miner: {formatHash(block.miner, 8)}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Gas Usage */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatNumber(block.gas_used)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {calculateGasPercentage(block.gas_used, block.gas_limit).toFixed(1)}% used
                  </div>
                  
                  {/* Gas Usage Bar */}
                  <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(calculateGasPercentage(block.gas_used, block.gas_limit), 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <a 
            href="/blocks"
            className="flex items-center justify-center gap-2 w-full py-2 px-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
          >
            View all blocks
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default LatestBlocks;
