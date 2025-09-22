import React, { useState, useEffect } from 'react';
import { Clock, ExternalLink, Copy, Code, Shield, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  apiService, 
  SmartContractSummary, 
  formatHash, 
  formatTimestamp, 
  formatTimeAgo,
  formatNumber 
} from '@/services/api';

const LatestSmartContracts = () => {
  const [contracts, setContracts] = useState<SmartContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Carregar contratos mais recentes
  useEffect(() => {
    loadLatestContracts();
  }, []);

  const loadLatestContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getSmartContracts({ 
        limit: 6, 
        page: 1
      });
      
      if (response.success) {
        setContracts(response.data);
      } else {
        setError('Failed to load latest smart contracts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error loading latest smart contracts:', err);
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

  const getContractTypeColor = (type?: string): string => {
    switch (type?.toLowerCase()) {
      case 'erc20':
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700';
      case 'erc721':
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700';
      case 'proxy':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getContractTypeName = (contract: SmartContractSummary): string => {
    if (contract.contract_type) return contract.contract_type.toUpperCase();
    if (contract.is_token) return 'TOKEN';
    if (contract.is_proxy) return 'PROXY';
    return 'CONTRACT';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Code className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Smart Contracts</h3>
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
              <Code className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Smart Contracts</h3>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <button 
            onClick={loadLatestContracts}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!contracts || contracts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <Code className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Smart Contracts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">No contracts available</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="text-center">
            <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Smart Contracts Found</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No smart contracts have been deployed recently. This could be due to low network activity.
            </p>
            <button 
              onClick={loadLatestContracts}
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
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Code className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Smart Contracts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatNumber(contracts.length)} most recent contracts
              </p>
            </div>
          </div>
          <a 
            href="/smart-contracts" 
            className="hidden sm:flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            View all
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="space-y-3 sm:space-y-4">
          {contracts.map((contract, index) => (
            <div 
              key={contract.address}
              className={cn(
                "group p-3 sm:p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-600 transition-all duration-200 hover:shadow-md animate-fade-in",
                "hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-transparent dark:hover:from-purple-900/20 dark:hover:to-transparent"
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
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                      <Code className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => copyToClipboard(contract.address, 'Contract address')}
                        className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-mono block truncate"
                      >
                        {formatHash(contract.address, 10)}
                      </button>
                      {contract.is_verified && (
                        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimeAgo(contract.creation_timestamp)}
                      </span>
                    </div>
                    {contract.name && (
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                        {contract.name}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatNumber(contract.total_transactions)} txs
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      #{formatNumber(contract.creation_block_number)}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className={`text-xs px-2 py-0.5 ${getContractTypeColor(contract.contract_type)}`}>
                    {getContractTypeName(contract)}
                  </Badge>
                  {contract.is_verified ? (
                    <Badge className="text-xs px-2 py-0.5 bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                      <XCircle className="h-3 w-3 mr-1" />
                      Unverified
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500 dark:text-gray-400 min-w-0 flex-shrink-0">Creator:</span>
                    <button
                      onClick={() => copyToClipboard(contract.creator_address, 'Creator address')}
                      className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-mono truncate"
                    >
                      {formatHash(contract.creator_address, 6)}
                    </button>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Contract Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                      <Code className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Contract Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => copyToClipboard(contract.address, 'Contract address')}
                        className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-mono"
                      >
                        {formatHash(contract.address, 12)}
                      </button>
                      <Copy className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
                      {contract.is_verified && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(contract.creation_timestamp)}
                      </span>
                      <Badge className={`text-xs px-2 py-0.5 ${getContractTypeColor(contract.contract_type)}`}>
                        {getContractTypeName(contract)}
                      </Badge>
                      {contract.name && (
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {contract.name}
                        </span>
                      )}
                    </div>

                    {/* Creator Address */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Creator:</span>
                      <button
                        onClick={() => copyToClipboard(contract.creator_address, 'Creator address')}
                        className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-mono"
                      >
                        {formatHash(contract.creator_address, 8)}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Contract Stats */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatNumber(contract.total_transactions)} txs
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Block #{formatNumber(contract.creation_block_number)}
                  </div>
                  {contract.is_verified ? (
                    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                      <Shield className="h-3 w-3" />
                      Verified
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <XCircle className="h-3 w-3" />
                      Unverified
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <a 
            href="/smart-contracts"
            className="flex items-center justify-center gap-2 w-full py-2 px-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
          >
            View all smart contracts
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default LatestSmartContracts; 