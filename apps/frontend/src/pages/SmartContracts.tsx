import React, { useState, useMemo } from 'react';
import { Code, FileText, Activity, TrendingUp, Zap } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SmartContractsTable from '@/components/smart-contracts/SmartContractsTable';
import SmartContractsChart from '@/components/smart-contracts/SmartContractsChart';
import ModernPagination from '@/components/ui/modern-pagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSmartContracts, useSmartContractStats } from '@/hooks/useSmartContracts';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import { formatNumber } from '@/services/api';

const SmartContracts = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Memoize options to prevent unnecessary re-renders
  const contractsOptions = useMemo(() => ({
    limit: itemsPerPage,
    page: currentPage,
    autoFetch: true
  }), [itemsPerPage, currentPage]);

  // Hooks para dados da API
  const { stats, loading: statsLoading } = useSmartContractStats();
  const { activity: recentActivity, loading: activityLoading } = useRecentActivity();
  const {
    contracts,
    loading: contractsLoading,
    error: contractsError,
    pagination,
    fetchContracts
  } = useSmartContracts(contractsOptions);

  // Função para atualizar página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchContracts({ page, limit: itemsPerPage });
  };

  // Função para atualizar itens por página
  const handleItemsPerPageChange = (limit: number) => {
    setItemsPerPage(limit);
    setCurrentPage(1);
    fetchContracts({ page: 1, limit });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="flex flex-col space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                <Code className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Smart Contracts</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Explore deployed smart contracts on the Hyperledger Besu network
                </p>
              </div>
            </div>
          </div>

          {/* Modern Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Contracts Card */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 group cursor-pointer smart-card-hover">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700"></div>
              <CardContent className="relative p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg group-hover:shadow-blue-500/25 group-hover:scale-110 transition-all duration-300 icon-bounce">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    {!statsLoading && stats && (
                      <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                        {stats.verified_contracts > 0 ?
                          `${((stats.verified_contracts / stats.total_contracts) * 100).toFixed(1)}%` :
                          '0%'
                        }
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Total Contracts
                  </h3>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-20 rounded"></div>
                    ) : (
                      formatNumber(stats?.total_contracts || 0)
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {formatNumber(stats?.active_contracts || 0)}
                    </span> active
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Verified Contracts Card */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200/50 dark:border-emerald-700/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-500 group cursor-pointer smart-card-hover">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700"></div>
              <CardContent className="relative p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg group-hover:shadow-emerald-500/25 group-hover:scale-110 transition-all duration-300 icon-bounce">
                    <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 bg-emerald-500 rounded text-white flex items-center justify-center text-xs font-bold">✓</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {!statsLoading && stats && (
                      <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                        {stats.total_contracts > 0 ?
                          `${((stats.verified_contracts / stats.total_contracts) * 100).toFixed(1)}%` :
                          '0%'
                        }
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Verified Contracts
                  </h3>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-20 rounded"></div>
                    ) : (
                      formatNumber(stats?.verified_contracts || 0)
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {stats?.verified_contracts || 0}
                    </span> verified total
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Active Today Card */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200/50 dark:border-orange-700/50 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-500 group cursor-pointer smart-card-hover">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700"></div>
              <CardContent className="relative p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg group-hover:shadow-orange-500/25 group-hover:scale-110 transition-all duration-300 icon-bounce">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">Live</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Active Today
                  </h3>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-300">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-20 rounded"></div>
                    ) : (
                      formatNumber(stats?.active_contracts || 0)
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="text-orange-600 dark:text-orange-400 font-medium">
                      {stats?.daily_deployments?.find(d => d.date.startsWith(new Date().toISOString().split('T')[0]))?.count || 0}
                    </span> deployed today
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contract Types Card */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200/50 dark:border-purple-700/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-500 group cursor-pointer smart-card-hover">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700"></div>
              <CardContent className="relative p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg group-hover:shadow-purple-500/25 group-hover:scale-110 transition-all duration-300">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                      {stats?.contract_types?.length || 0} types
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Contract Types
                  </h3>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-20 rounded"></div>
                    ) : (
                      stats?.contract_types?.[0]?.type || 'ERC-20'
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="text-purple-600 dark:text-purple-400 font-medium">
                      {stats?.contract_types?.[0]?.count || 0}
                    </span> most popular
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>


          {/* Smart Contracts Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <SmartContractsTable
              contracts={contracts}
              loading={contractsLoading}
              error={contractsError}
              currentPage={currentPage}
              setCurrentPage={handlePageChange}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={handleItemsPerPageChange}
              pagination={pagination}
            />
          </div>

          {/* Modern Pagination */}
          {contracts && contracts.length > 0 && pagination && (
            <ModernPagination
              currentPage={currentPage}
              totalPages={pagination.total_pages || Math.ceil((pagination.total_items || contracts.length) / itemsPerPage)}
              totalItems={pagination.total_items || contracts.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              loading={contractsLoading}
              className="mt-8"
            />
          )}


          {/* Modern Chart Section */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 group">
            {/* Animated background elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full -translate-y-32 translate-x-32 group-hover:scale-125 transition-transform duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full translate-y-24 -translate-x-24 group-hover:scale-125 transition-transform duration-1000"></div>

            <CardHeader className="relative border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-gray-800/50 backdrop-blur-sm">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg group-hover:shadow-indigo-500/25 group-hover:scale-110 transition-all duration-300">
                    <TrendingUp className="h-6 w-6 text-white" />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-400/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                      Contract Deployments Over Time
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Daily deployment trends and analytics
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-700/50">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">Live Data</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-700/50">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {formatNumber(stats?.total_contracts || 0)} Total
                    </span>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative p-8 bg-gradient-to-br from-transparent via-white/30 to-transparent dark:via-gray-800/30">
              <SmartContractsChart
                data={stats?.daily_deployments}
                contractTypes={stats?.contract_types}
                totalGasUsed={stats?.total_gas_used}
                totalValueTransferred={stats?.total_value_transferred}
                totalTransactions={stats?.total_transactions}
                loading={statsLoading || activityLoading}
                recentActivity={recentActivity}
              />
            </CardContent>
          </Card>

          {/* Recent Activity & Network Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {stats?.daily_deployments?.slice(0, 5).map((deployment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {new Date(deployment.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Contract deployments
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatNumber(deployment.count)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          contracts
                        </p>
                      </div>
                    </div>
                  ))}

                  {(!stats?.daily_deployments || stats.daily_deployments.length === 0) && (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Network Stats */}
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  Network Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Total Gas Used */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Total Gas Used</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">All contracts combined</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatNumber(parseInt(stats?.total_gas_used || '0'))}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">gas</p>
                    </div>
                  </div>

                  {/* Total Value Transferred */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                        <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Value Transferred</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total ETH moved</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {(parseFloat(stats?.total_value_transferred || '0') / 1e18).toFixed(4)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">ETH</p>
                    </div>
                  </div>

                  {/* Contract Types Distribution */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Top Contract Types</h4>
                    <div className="space-y-3">
                      {statsLoading ? (
                        // Loading skeleton
                        Array.from({ length: 3 }).map((_, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                              <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            </div>
                          </div>
                        ))
                      ) : stats?.contract_types && stats.contract_types.length > 0 ? (
                        stats.contract_types.slice(0, 5).map((type, index) => (
                          <div key={`${type.type}-${index}`} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-500' :
                                index === 1 ? 'bg-green-500' :
                                  index === 2 ? 'bg-purple-500' :
                                    index === 3 ? 'bg-orange-500' : 'bg-pink-500'
                                }`}></div>
                              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                {type.type || 'Unknown'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {formatNumber(type.count)}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                                {type.percentage}%
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                          <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No contract types found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SmartContracts;
