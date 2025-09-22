import React, { useState, useEffect } from 'react';
import { Activity, Users, Zap, Clock, TrendingUp, Shield } from 'lucide-react';
import { useNetworkStats } from '@/stores/blockchainStore';
import { formatNumber, formatTimeAgo, apiService } from '@/services/api';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  subtitle: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  changeType, 
  icon, 
  subtitle, 
  loading = false 
}) => {
  const getChangeColor = (type: 'positive' | 'negative' | 'neutral') => {
    switch (type) {
      case 'positive':
        return 'text-green-600 dark:text-green-400';
      case 'negative':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-lg"></div>
            <div className="w-12 h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
          </div>
          <div className="w-16 h-8 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
          <div className="w-20 h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-600 dark:text-blue-400">
          {icon}
        </div>
        {change && (
          <div className={`text-xs md:text-sm font-medium ${getChangeColor(changeType)}`}>
            {change}
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </div>
        <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-medium">
          {title}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {subtitle}
        </div>
      </div>
    </div>
  );
};

const StatsGrid = () => {
  const { stats, loading, error } = useNetworkStats();
  const [additionalStats, setAdditionalStats] = useState<any>(null);
  const [loadingAdditional, setLoadingAdditional] = useState(false);

  // Fetch additional stats from multiple endpoints
  useEffect(() => {
    const fetchAdditionalStats = async () => {
      setLoadingAdditional(true);
      try {
        const [
          transactionStats,
          smartContractStats,
          validatorMetrics
        ] = await Promise.all([
          apiService.getTransactionStats().catch(() => null),
          apiService.getSmartContractStats().catch(() => null),
          apiService.getValidatorMetrics().catch(() => null)
        ]);

        setAdditionalStats({
          transactions: transactionStats?.data,
          smartContracts: smartContractStats?.data,
          validators: validatorMetrics?.data
        });
      } catch (err) {
        console.error('Error fetching additional stats:', err);
      } finally {
        setLoadingAdditional(false);
      }
    };

    fetchAdditionalStats();
  }, []);

  // Se houver erro, mostrar placeholder
  if (error) {
    console.error('Error loading network stats:', error);
  }

  // Função para formatar números grandes
  const formatLargeNumber = (num: number | undefined | null): string => {
    if (num == null || num === undefined) return '0';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Função para formatar gas price (wei para gwei)
  const formatGasPrice = (gasPrice: number | undefined | null): string => {
    if (gasPrice == null || gasPrice === undefined) return '0 Gwei';
    const gwei = gasPrice / 1000000000; // Convert wei to gwei
    return gwei.toFixed(1) + ' Gwei';
  };

  // Função para formatar tempo de bloco
  const formatBlockTime = (seconds: number | undefined | null): string => {
    if (seconds == null || seconds === undefined) return '0s';
    return seconds.toFixed(1) + 's';
  };

  // Função para determinar mudança baseada em métricas
  const getChangeIndicator = (value: number | undefined | null, threshold: number, reverse = false): { change: string; type: 'positive' | 'negative' | 'neutral' } => {
    if (value == null || value === undefined || value === 0) return { change: 'N/A', type: 'neutral' };
    
    const isGood = reverse ? value < threshold : value > threshold;
    return {
      change: `${value.toFixed(1)}%`,
      type: isGood ? 'positive' : 'neutral'
    };
  };

  // Combine data from different sources
  const combinedStats = {
    totalBlocks: stats?.total_blocks || stats?.totalBlocks || 0,
    latestBlockNumber: stats?.latest_block_number || stats?.latestBlockNumber || 0,
    totalTransactions: additionalStats?.transactions?.total_transactions || stats?.total_transactions || stats?.totalTransactions || 0,
    successRate: additionalStats?.transactions?.success_transactions && additionalStats?.transactions?.total_transactions 
      ? (additionalStats.transactions.success_transactions / additionalStats.transactions.total_transactions) * 100 
      : stats?.successRate || 95,
    totalContracts: additionalStats?.smartContracts?.total_contracts || stats?.total_contracts || stats?.totalContracts || 0,
    verifiedContracts: additionalStats?.smartContracts?.verified_contracts || stats?.verified_contracts || stats?.verifiedContracts || 0,
    activeValidators: additionalStats?.validators?.active_validators || stats?.active_validators || stats?.activeValidators || 0,
    totalValidators: additionalStats?.validators?.total_validators || stats?.total_validators || stats?.totalValidators || 0,
    averageBlockTime: stats?.avg_block_time || stats?.averageBlockTime || 4.0,
    averageGasPrice: additionalStats?.transactions?.average_gas_price || stats?.average_gas_price || stats?.averageGasPrice || 0,
    averageUptime: additionalStats?.validators?.average_uptime || stats?.average_uptime || stats?.averageUptime || 0
  };

  const statsData = [
    {
      title: 'Total Blocks',
      value: formatNumber(combinedStats.totalBlocks),
      change: undefined,
      changeType: 'neutral' as const,
      icon: <div className="h-5 w-5 md:h-6 md:w-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg text-white flex items-center justify-center text-xs md:text-sm font-bold shadow-sm">■</div>,
      subtitle: `Latest: #${formatNumber(combinedStats.latestBlockNumber)}`
    },
    {
      title: 'Total Transactions',
      value: formatLargeNumber(combinedStats.totalTransactions),
      change: getChangeIndicator(combinedStats.successRate, 95).change,
      changeType: getChangeIndicator(combinedStats.successRate, 95).type as 'positive' | 'negative' | 'neutral',
      icon: <Activity className="h-5 w-5 md:h-6 md:w-6" />,
      subtitle: `Success Rate: ${combinedStats.successRate.toFixed(1)}%`
    },
    {
      title: 'Active Validators',
      value: formatNumber(combinedStats.activeValidators),
      change: combinedStats.totalValidators > 0 ? `${combinedStats.totalValidators - combinedStats.activeValidators} offline` : undefined,
      changeType: (combinedStats.totalValidators - combinedStats.activeValidators) === 0 ? 'positive' as const : 'neutral' as const,
      icon: <Users className="h-5 w-5 md:h-6 md:w-6" />,
      subtitle: `Total: ${formatNumber(combinedStats.totalValidators)}`
    },
    {
      title: 'Smart Contracts',
      value: formatLargeNumber(combinedStats.totalContracts),
      change: combinedStats.verifiedContracts > 0 ? `${((combinedStats.verifiedContracts / combinedStats.totalContracts) * 100).toFixed(1)}% verified` : undefined,
      changeType: (combinedStats.verifiedContracts / combinedStats.totalContracts) > 0.5 ? 'positive' as const : 'neutral' as const,
      icon: <div className="h-5 w-5 md:h-6 md:w-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg text-white flex items-center justify-center text-xs md:text-sm font-bold shadow-sm">{ }</div>,
      subtitle: `${formatNumber(combinedStats.verifiedContracts)} verified`
    },
    {
      title: 'Block Time',
      value: formatBlockTime(combinedStats.averageBlockTime),
      change: combinedStats.averageBlockTime < 15 ? 'Fast' : combinedStats.averageBlockTime > 20 ? 'Slow' : 'Normal',
      changeType: combinedStats.averageBlockTime < 15 ? 'positive' as const : combinedStats.averageBlockTime > 20 ? 'negative' as const : 'neutral' as const,
      icon: <Clock className="h-5 w-5 md:h-6 md:w-6" />,
      subtitle: `Avg: ${combinedStats.averageBlockTime.toFixed(1)}s`
    },
    {
      title: 'Network Health',
      value: combinedStats.activeValidators > 0 && combinedStats.successRate > 95 ? '99.9%' : combinedStats.successRate > 90 ? '95.0%' : '90.0%',
      change: combinedStats.averageUptime > 0 ? `${combinedStats.averageUptime.toFixed(1)}% uptime` : 'Stable',
      changeType: 'positive' as const,
      icon: <Shield className="h-5 w-5 md:h-6 md:w-6" />,
      subtitle: `Gas: ${formatGasPrice(combinedStats.averageGasPrice)}`
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {statsData.map((stat, index) => (
        <div 
          key={index} 
          className="animate-fade-in" 
          style={{ 
            animationDelay: `${index * 0.1}s`,
            animationFillMode: 'both'
          }}
        >
          <StatCard {...stat} loading={(loading || loadingAdditional) && !stats && !additionalStats} />
        </div>
      ))}
    </div>
  );
};

export default StatsGrid;
