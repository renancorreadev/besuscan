import React, { useState, useEffect } from 'react';
import { TrendingUp, Activity, BarChart3 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/dashboard/Hero';
import StatsGrid from '@/components/dashboard/StatsGrid';
import LatestBlocks from '@/components/dashboard/LatestBlocks';
import LatestTransactions from '@/components/dashboard/LatestTransactions';
import LatestSmartContracts from '@/components/dashboard/LatestSmartContracts';
import LatestEvents from '@/components/dashboard/LatestEvents';
import { useNetworkStats } from '@/stores/blockchainStore';
import { apiService, formatNumber, formatLargeNumber } from '@/services/api';
import { useGasTrends } from '@/hooks/useGasTrends';
import { useVolumeDistribution } from '@/hooks/useVolumeDistribution';
import { useRecentActivity } from '@/hooks/useRecentActivity';

const Index = () => {
  const { stats, loading, error } = useNetworkStats();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Novos hooks para dados dinâmicos
  const { trends: gasTrends, loading: gasTrendsLoading } = useGasTrends(7);
  const { distribution: volumeDistribution, loading: volumeLoading } = useVolumeDistribution('24h');
  const { activity: recentActivity, loading: activityLoading } = useRecentActivity();

  // Fetch general stats from the new endpoint
  useEffect(() => {
    const fetchGeneralStats = async () => {
      try {
        setDashboardLoading(true);
        setDashboardError(null);

        const response = await apiService.getGeneralStats();
        if (response.success) {
          setDashboardData({
            network_stats: response.data,
            general_stats: response.data
          });
        } else {
          throw new Error('Stats API returned error');
        }
      } catch (err) {
        console.error('Error fetching general stats:', err);
        setDashboardError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setDashboardLoading(false);
      }
    };

    fetchGeneralStats();

    // Refresh general stats every 30 seconds
    const interval = setInterval(fetchGeneralStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Função para formatar números grandes
  const formatLargeNumber = (num: number | undefined | null): string => {
    if (num == null || num === undefined) return '0';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Use dashboard data if available, otherwise fallback to stats
  const networkStats = dashboardData?.network_stats || stats;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="relative">
        {/* Hero Section with Etherscan-inspired background */}
        <section className="relative overflow-hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900"></div>
          <Hero />
        </section>

        {/* Stats Grid with modern spacing */}
        <section className="relative py-8 md:py-16 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Network Overview
              </h2>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4">
                Real-time insights into the Hyperledger Besu network performance and QBFT consensus metrics
              </p>
            </div>
            <StatsGrid />
          </div>
        </section>

        {/* Latest Activity with Enhanced Grid Layout - Mobile Responsive */}
        <section className="relative py-8 md:py-16 bg-white dark:bg-gray-800">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Latest Network Activity
              </h2>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4">
                Stay updated with the most recent blocks, transactions, smart contracts, and events on the network
              </p>
            </div>

            {/* Mobile: Stack vertically, Desktop: 2x2 Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Latest Blocks */}
              <div className="space-y-6 animate-fade-in">
                <LatestBlocks />
              </div>

              {/* Latest Transactions */}
              <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <LatestTransactions />
              </div>

              {/* Latest Smart Contracts */}
              <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <LatestSmartContracts />
              </div>

              {/* Latest Events */}
              <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <LatestEvents />
              </div>
            </div>
          </div>
        </section>

        {/* Gas Trends & Volume Distribution */}
        <section className="relative py-8 md:py-16 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Gas Trends Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Gas Trends</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">7 days price evolution</p>
                  </div>
                </div>

                {gasTrendsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ) : gasTrends && gasTrends.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {parseFloat(gasTrends[0]?.avg_price || '0').toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Avg Price</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {formatNumber(gasTrends[0]?.tx_count || 0)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Transactions</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {formatLargeNumber(parseFloat(gasTrends[0]?.volume || '0'))}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Volume</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No gas trends data available</p>
                  </div>
                )}
              </div>

              {/* Volume Distribution Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Volume Distribution</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Last 24h breakdown</p>
                  </div>
                </div>

                {volumeLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ) : volumeDistribution ? (
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatLargeNumber(parseFloat(volumeDistribution.total_volume || '0'))}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Total Volume (24h)</div>
                    </div>

                    {volumeDistribution.by_contract_type && volumeDistribution.by_contract_type.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">By Contract Type</h4>
                        {volumeDistribution.by_contract_type.slice(0, 3).map((type, index) => (
                          <div key={type.contract_type} className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-500' :
                                index === 1 ? 'bg-green-500' : 'bg-purple-500'
                                }`}></div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {type.contract_type}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {type.percentage.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No volume data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            {!activityLoading && (
              <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Latest smart contract deployments and network metrics</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {recentActivity?.last_24h_growth || '+0.0%'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Last 24h Growth</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {recentActivity?.peak_tps || 0}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Peak TPS</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {formatNumber(recentActivity?.new_contracts || 0)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">New Contracts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      {formatNumber(recentActivity?.active_addresses || 0)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Active Addresses</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Network Statistics Summary - Mobile Responsive */}
        <section className="relative pb-8 md:pb-16 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 md:px-6">
            {/* Network Statistics Summary */}
            {(networkStats || dashboardData) && !dashboardLoading && (
              <div className="mt-8 md:mt-12 bg-white dark:bg-gray-800 rounded-xl p-6 md:p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="text-center mb-6 md:mb-8">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Network Statistics Summary
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                    Live data from the Hyperledger Besu network
                  </p>
                </div>

                {/* Mobile: 2 columns, Tablet: 4 columns */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  <div className="text-center">
                    <div className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {networkStats ? formatNumber(networkStats.total_blocks || 0) : '0'}
                    </div>
                    <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Total Blocks</div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">
                      {networkStats ? formatLargeNumber(networkStats.total_transactions || 0) : '0'}
                    </div>
                    <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Total Transactions</div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg md:text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {networkStats ? formatNumber(networkStats.total_contracts || 0) : '0'}
                    </div>
                    <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Smart Contracts</div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg md:text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {networkStats?.avg_block_time ? networkStats.avg_block_time.toFixed(1) + 's' : '2.0s'}
                    </div>
                    <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Block Time</div>
                  </div>
                </div>

                {/* Additional info for larger screens */}
                <div className="hidden md:block mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Latest Block</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        #{formatNumber(networkStats?.latest_block_number || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Active Validators</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatNumber(networkStats?.active_validators || 4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Network Utilization</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {networkStats?.network_utilization || '75%'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Avg Gas Used</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {networkStats?.avg_gas_used ? formatLargeNumber(networkStats.avg_gas_used) : '21K'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Methods Section */}
                {networkStats?.top_methods && networkStats.top_methods.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                      Most Used Contract Methods
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {networkStats.top_methods.slice(0, 6).map((method, index) => (
                        <div key={`${method.method_name}-${index}`} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                              {method.method_name}
                            </span>
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                              {formatNumber(method.call_count)} calls
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            {method.contract_name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            {formatLargeNumber(method.total_gas_used)} gas used
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Loading State */}
            {(dashboardLoading || loading) && (
              <div className="mt-8 md:mt-12 bg-white dark:bg-gray-800 rounded-xl p-6 md:p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 md:h-12 w-8 md:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Loading Network Statistics
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                    Fetching real-time data from the blockchain...
                  </p>
                </div>
              </div>
            )}

            {/* Error State */}
            {(dashboardError || error) && (
              <div className="mt-8 md:mt-12 bg-red-50 dark:bg-red-900/20 rounded-xl p-6 md:p-8 border border-red-200 dark:border-red-700 shadow-sm">
                <div className="text-center">
                  <div className="w-8 md:w-12 h-8 md:h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-red-600 dark:text-red-400 text-lg md:text-xl">⚠</span>
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold text-red-900 dark:text-red-100 mb-2">
                    Failed to Load Network Statistics
                  </h3>
                  <p className="text-sm md:text-base text-red-700 dark:text-red-300 mb-4">
                    {dashboardError || error}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm md:text-base"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
