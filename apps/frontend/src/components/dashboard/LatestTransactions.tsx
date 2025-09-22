import React, { useState, useEffect } from 'react';
import { Clock, ExternalLink, Copy, Activity, ArrowRight, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  apiService, 
  TransactionSummary, 
  formatHash, 
  formatTimestamp, 
  formatTimeAgo,
  formatEther,
  formatNumber 
} from '@/services/api';
import { useLatestBlock } from '@/stores/blockchainStore';

const LatestTransactions = () => {
  const [transactions, setTransactions] = useState<TransactionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { block: latestBlock } = useLatestBlock();

  // Carregar transações mais recentes
  useEffect(() => {
    loadLatestTransactions();
  }, []);

  // Reagir ao último bloco da store para atualizar a lista
  useEffect(() => {
    if (latestBlock) {
      loadLatestTransactions();
    }
  }, [latestBlock?.number]);

  const loadLatestTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getTransactions({ 
        limit: 6, 
        page: 1,
        order: 'desc' 
      });
      
      if (response.success) {
        setTransactions(response.data);
      } else {
        setError('Failed to load latest transactions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error loading latest transactions:', err);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getTransactionType = (tx: TransactionSummary): string => {
    if ((tx.to === null || tx.to === undefined) && (tx.to_address === null || tx.to_address === undefined)) {
      return 'Contract Creation';
    }
    if (tx.method && tx.method !== 'transfer') {
      return 'Contract Call';
    }
    if (tx.contract_address) {
      return 'Contract Call';
    }
    return 'Transfer';
  };

  const getTransactionTypeColor = (type: string): string => {
    switch (type) {
      case 'Contract Creation':
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700';
      case 'Contract Call':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Transactions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 dark:bg-gray-600 rounded-lg"></div>
                    <div className="space-y-2">
                      <div className="w-24 sm:w-32 h-3 sm:h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      <div className="w-20 sm:w-24 h-2 sm:h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    </div>
                  </div>
                  <div className="w-12 sm:w-16 h-3 sm:h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
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
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <Activity className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Transactions</h3>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <button 
            onClick={loadLatestTransactions}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <Activity className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Transactions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">No transactions available</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Transactions Found</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No transactions are available at the moment. This could be due to network issues or no recent activity.
            </p>
            <button 
              onClick={loadLatestTransactions}
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
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Transactions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatNumber(transactions.length)} most recent transactions
              </p>
            </div>
          </div>
          <a 
            href="/transactions" 
            className="hidden sm:flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            View all
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="space-y-3 sm:space-y-4">
          {transactions.map((tx, index) => (
            <div 
              key={tx.hash}
              className={cn(
                "group p-3 sm:p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-600 transition-all duration-200 hover:shadow-md animate-fade-in",
                "hover:bg-gradient-to-r hover:from-green-50/50 hover:to-transparent dark:hover:from-green-900/20 dark:hover:to-transparent"
              )}
              style={{ 
                animationDelay: `${index * 0.1}s`,
                animationFillMode: 'both'
              }}
            >
              {/* Mobile Layout */}
              <div className="block sm:hidden">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                      <Activity className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => copyToClipboard(tx.hash, 'Transaction hash')}
                        className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-mono block truncate"
                      >
                        {formatHash(tx.hash, 10)}
                      </button>
                      {getStatusIcon(tx.status)}
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimeAgo(tx.mined_at || tx.timestamp)}
                      </span>
                    </div>
                    {tx.value && (
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {formatEther(tx.value)} ETH
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      #{formatNumber(tx.block_number)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatNumber(tx.gas_used || tx.gas)} gas
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className={`text-xs px-2 py-0.5 ${getTransactionTypeColor(getTransactionType(tx))}`}>
                    {getTransactionType(tx)}
                  </Badge>
                  <Badge className={`text-xs px-2 py-0.5 ${getStatusColor(tx.status)}`}>
                    {tx.status}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500 dark:text-gray-400 min-w-0 flex-shrink-0">From:</span>
                    <button
                      onClick={() => copyToClipboard(tx.from || tx.from_address || '', 'From address')}
                      className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-mono truncate"
                    >
                      {formatHash(tx.from || tx.from_address || '', 6)}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500 dark:text-gray-400 min-w-0 flex-shrink-0">To:</span>
                    {(tx.to || tx.to_address) ? (
                      <button
                        onClick={() => copyToClipboard(tx.to || tx.to_address || '', 'To address')}
                        className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-mono truncate"
                      >
                        {formatHash(tx.to || tx.to_address || '', 6)}
                      </button>
                    ) : (
                      <span className="text-orange-600 dark:text-orange-400">Contract Creation</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Transaction Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                      <Activity className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Transaction Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => copyToClipboard(tx.hash, 'Transaction hash')}
                        className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-mono"
                      >
                        {formatHash(tx.hash, 12)}
                      </button>
                      <Copy className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
                      {getStatusIcon(tx.status)}
                    </div>
                    
                                         <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-1">
                       <span className="flex items-center gap-1">
                         <Clock className="h-3 w-3" />
                         {formatTimeAgo(tx.mined_at || tx.timestamp)}
                       </span>
                      <Badge className={`text-xs px-2 py-0.5 ${getTransactionTypeColor(getTransactionType(tx))}`}>
                        {getTransactionType(tx)}
                      </Badge>
                      {tx.value && (
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {formatEther(tx.value)} ETH
                        </span>
                      )}
                    </div>

                                         {/* From and To Addresses */}
                     <div className="flex items-center gap-4 text-xs">
                       <div className="flex items-center gap-2">
                         <span className="text-gray-500 dark:text-gray-400">From:</span>
                         <button
                           onClick={() => copyToClipboard(tx.from || tx.from_address || '', 'From address')}
                           className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-mono"
                         >
                           {formatHash(tx.from || tx.from_address || '', 8)}
                         </button>
                       </div>
                       <ArrowRight className="h-3 w-3 text-gray-400" />
                       <div className="flex items-center gap-2">
                         <span className="text-gray-500 dark:text-gray-400">To:</span>
                         {(tx.to || tx.to_address) ? (
                           <button
                             onClick={() => copyToClipboard(tx.to || tx.to_address || '', 'To address')}
                             className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-mono"
                           >
                             {formatHash(tx.to || tx.to_address || '', 8)}
                           </button>
                         ) : (
                           <span className="text-orange-600 dark:text-orange-400">Contract Creation</span>
                         )}
                       </div>
                     </div>
                  </div>
                </div>

                {/* Transaction Stats */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Block #{formatNumber(tx.block_number)}
                  </div>
                                     <div className="text-xs text-gray-500 dark:text-gray-400">
                     {formatNumber(tx.gas_used || tx.gas)} gas used
                   </div>
                  <div className={cn("flex items-center gap-1 text-xs mt-1", getStatusColor(tx.status))}>
                    {getStatusIcon(tx.status)}
                    {tx.status}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <a 
            href="/transactions"
            className="flex items-center justify-center gap-2 w-full py-2 px-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
          >
            View all transactions
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default LatestTransactions;
