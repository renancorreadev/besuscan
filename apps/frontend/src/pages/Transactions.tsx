import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Filter, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import TransactionsTable from '@/components/transactions/TransactionsTable';
import TransactionsFilters, { TransactionFilters } from '@/components/transactions/TransactionsFilters';
import ModernPagination from '@/components/ui/modern-pagination';
import { useTransactions, useTransactionStats } from '@/hooks/useTransactions';
import { formatTimeAgo, apiService } from '@/services/api';
import { Button } from '@/components/ui/button';

const Transactions = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [excludeVoteProgram, setExcludeVoteProgram] = useState(true);
  const [activeFilters, setActiveFilters] = useState<TransactionFilters>({});
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);

  // Ler parâmetros da URL na inicialização
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    
    if (searchParam) {
      // Aplicar filtro de busca automaticamente
      const filters = { search: searchParam };
      setActiveFilters(filters);
      // Não chamar handleFiltersChange aqui, será chamado pelo useEffect do hook
    }
  }, []);

  // Memoize options to prevent infinite loops
  const transactionOptions = useMemo(() => ({
    limit: itemsPerPage,
    order: 'desc' as const,
    autoFetch: false // Sempre false, vamos controlar manualmente
  }), [itemsPerPage]);

  const {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
    pagination,
    fetchTransactions,
    searchTransactions,
    setCustomTransactions
  } = useTransactions(transactionOptions);

  // Buscar estatísticas das transações
  const {
    stats,
    loading: statsLoading,
    error: statsError,
    fetchStats
  } = useTransactionStats();
 
  useEffect(() => {
    fetchTransactions({ limit: itemsPerPage, page: 1, order: 'desc' });
  }, []); // Apenas no mount, sem dependências

  // Handle filter changes
  const handleFiltersChange = async (filters: TransactionFilters) => {
    setActiveFilters(filters);
    setCurrentPage(1); // Reset to first page when filters change
    
    if (Object.keys(filters).length === 0) {
      // No filters, fetch regular transactions
      await fetchTransactions({ limit: itemsPerPage, page: 1, order: 'desc' });
    } else {
      // Check for hash search first - use direct endpoint
      if (filters.search) {
        const searchValue = filters.search.trim();
        if (searchValue.startsWith('0x') && searchValue.length === 66) {
          // É um hash de transação - usar endpoint direto
          try {
            const response = await apiService.getTransaction(searchValue);
            if (response.success && response.data) {
              // Encontrou a transação - mostrar apenas ela na tabela
              setCustomTransactions(
                [response.data as any], // Converter para TransactionSummary
                {
                  page: 1,
                  limit: 1,
                  total: 1,
                  total_pages: 1
                }
              );
            } else {
              // Hash não encontrado - mostrar resultado vazio
              setCustomTransactions([], {
                page: 1,
                limit: itemsPerPage,
                total: 0,
                total_pages: 0
              });
            }
            return;
          } catch (err) {
            console.error('Erro ao buscar transação por hash:', err);
            // Erro na busca - mostrar resultado vazio
            setCustomTransactions([], {
              page: 1,
              limit: itemsPerPage,
              total: 0,
              total_pages: 0
            });
            return;
          }
        }
      }

      // Build API parameters and search for other types of filters
      const apiParams = buildApiParams(filters, 1, itemsPerPage);
      await searchTransactions(apiParams);
    }
  };


  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFiltersModalOpen) {
        setIsFiltersModalOpen(false);
      }
    };

    if (isFiltersModalOpen) {
      document.addEventListener('keydown', handleEscKey);
      // Prevenir scroll do body quando modal está aberto
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'auto';
    };
  }, [isFiltersModalOpen]);

  // Helper function to build API parameters from filters
  const buildApiParams = (filters: TransactionFilters, page: number = 1, limit: number = itemsPerPage) => {
    const apiParams: any = {
      order_by: 'block_number',
      order_dir: 'desc',
      page: page,
      limit: limit
    };

    // Mapear o campo search dinamicamente
    if (filters.search) {
      const searchValue = filters.search.trim();
      if (searchValue.startsWith('0x') && searchValue.length === 42) {
        // É um endereço (40 caracteres + 0x)
        apiParams.from = searchValue;
      } else if (/^\d+$/.test(searchValue)) {
        // É um número de bloco
        apiParams.from_block = searchValue;
        apiParams.to_block = searchValue;
      }
      // Hash será tratado separadamente na função handleFiltersChange
    }

    // Mapear outros filtros apenas se estiverem preenchidos
    if (filters.from) apiParams.from = filters.from;
    if (filters.to) apiParams.to = filters.to;
    if (filters.status) apiParams.status = filters.status;
    if (filters.min_value) apiParams.min_value = filters.min_value;
    if (filters.max_value) apiParams.max_value = filters.max_value;
    if (filters.min_gas) apiParams.min_gas = filters.min_gas;
    if (filters.max_gas) apiParams.max_gas = filters.max_gas;
    if (filters.min_gas_used) apiParams.min_gas_used = filters.min_gas_used;
    if (filters.max_gas_used) apiParams.max_gas_used = filters.max_gas_used;
    if (filters.tx_type !== undefined) apiParams.tx_type = filters.tx_type;
    if (filters.from_date) apiParams.from_date = filters.from_date;
    if (filters.to_date) apiParams.to_date = filters.to_date;
    if (filters.from_block) apiParams.from_block = filters.from_block;
    if (filters.to_block) apiParams.to_block = filters.to_block;
    if (filters.contract_creation !== undefined) apiParams.contract_creation = filters.contract_creation;
    if (filters.has_data !== undefined) apiParams.has_data = filters.has_data;

    return apiParams;
  };

  // Handle page changes
  const handlePageChange = async (page: number) => {
    setCurrentPage(page);
    
    if (Object.keys(activeFilters).length > 0) {
      // Com filtros ativos, usar searchTransactions
      const apiParams = buildApiParams(activeFilters, page, itemsPerPage);
      await searchTransactions(apiParams);
    } else {
      // Sem filtros, usar fetchTransactions direto
      const params = { limit: itemsPerPage, page: page, order: 'desc' as const };
      await fetchTransactions(params);
    }
  };

  const handleItemsPerPageChange = async (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
    
    if (Object.keys(activeFilters).length > 0) {
      // Com filtros ativos, usar searchTransactions
      const apiParams = buildApiParams(activeFilters, 1, items);
      await searchTransactions(apiParams);
    } else {
      // Sem filtros, usar fetchTransactions direto
      await fetchTransactions({ limit: items, page: 1, order: 'desc' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8 ">
          {/* Page Header */}
          <div className="flex flex-col space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                <Activity className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transactions</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Real-time transaction data on the Hyperledger Besu network
                </p>
              </div>
            </div>
            
            {/* Current Block Info */}
            {/* <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-gray-600 dark:text-gray-400 font-medium">Latest Block:</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono font-semibold">
                  Latest transactions available
                </span>
              </div>
            </div> */}

            {/* Transaction Stats */}
            {stats && !statsError && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.total_transactions?.toLocaleString() || '0'}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Successful</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.success_transactions?.toLocaleString() || '0'}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.failed_transactions?.toLocaleString() || '0'}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Avg Gas Price</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.average_gas_price ? `${(stats.average_gas_price / 1e9).toFixed(2)} Gwei` : '0 Gwei'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filters Button and Overview */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setIsFiltersModalOpen(true)}
                variant="outline"
                className="flex items-center gap-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 text-gray-900 dark:text-white"
              >
                <Filter className="h-4 w-4" />
                Filters
                {Object.keys(activeFilters).length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                    {Object.keys(activeFilters).length}
                  </span>
                )}
              </Button>
              
              {Object.keys(activeFilters).length > 0 && (
                <Button
                  onClick={() => handleFiltersChange({})}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                >
                  Clear Filters
                </Button>
              )}
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-6">
              {/* Transaction Overview */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <div className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">Transaction Overview</span>
                    <div className="text-gray-600 dark:text-gray-400">
                      {transactionsLoading || statsLoading ? (
                        'Loading transactions...'
                      ) : Object.keys(activeFilters).length > 0 ? (
                        // Quando há filtros ativos, mostrar resultados filtrados vs total do banco
                        `Showing ${transactions.length} of ${pagination?.total?.toLocaleString() || transactions.length} filtered results (${stats?.total_transactions?.toLocaleString() || 'N/A'} total)`
                      ) : (
                        // Quando não há filtros, sempre usar stats do banco
                        stats?.total_transactions ? 
                          `Showing ${transactions.length} of ${stats.total_transactions.toLocaleString()} transactions` :
                          `Showing ${transactions.length} of ${pagination?.total?.toLocaleString() || transactions.length} transactions`
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Results Count */}
              <div className="text-sm text-gray-600 dark:text-gray-400 lg:text-right">
                {transactionsLoading || statsLoading ? (
                  'Loading...'
                ) : Object.keys(activeFilters).length > 0 ? (
                  // Com filtros ativos
                  pagination?.total ? (
                    <>
                      <div className="font-medium">{pagination.total.toLocaleString()} filtered results</div>
                      <div>Page {currentPage} of {pagination.total_pages || Math.ceil(pagination.total / itemsPerPage)}</div>
                    </>
                  ) : transactions.length > 0 ? (
                    <>
                      <div className="font-medium">{transactions.length} results</div>
                      <div>Page 1 of 1</div>
                    </>
                  ) : (
                    'No results found'
                  )
                ) : (
                  // Sem filtros - sempre usar stats do banco se disponível
                  stats?.total_transactions ? (
                    <>
                      <div className="font-medium">{stats.total_transactions.toLocaleString()} total transactions</div>
                      <div>Page {currentPage} of {Math.ceil(stats.total_transactions / itemsPerPage)}</div>
                    </>
                  ) : pagination?.total ? (
                    <>
                      <div className="font-medium">{pagination.total.toLocaleString()} total results</div>
                      <div>Page {currentPage} of {pagination.total_pages || Math.ceil(pagination.total / itemsPerPage)}</div>
                    </>
                  ) : transactions.length > 0 ? (
                    <>
                      <div className="font-medium">{transactions.length} results</div>
                      <div>Page 1 of 1</div>
                    </>
                  ) : (
                    'No results found'
                  )
                )}
              </div>
            </div>
          </div>

          {/* Filters Modal */}
          {isFiltersModalOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={(e) => {
                // Prevent closing when clicking inside the modal
                if (e.target === e.currentTarget) {
                  setIsFiltersModalOpen(false);
                }
              }}
            >
              <div 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction Filters</h3>
                  </div>
                  <button
                    onClick={() => setIsFiltersModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                  <TransactionsFilters
                    excludeVoteProgram={excludeVoteProgram}
                    setExcludeVoteProgram={setExcludeVoteProgram}
                    onFiltersChange={handleFiltersChange}
                    loading={transactionsLoading}
                    totalCount={pagination?.total || 0}
                    currentFilters={activeFilters}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Transactions Table */}
          <div className="bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden backdrop-blur-sm">
            <TransactionsTable 
              transactions={transactions as any}
              loading={transactionsLoading}
              error={transactionsError}
              pagination={
                // Se não há filtros e temos stats, usar total de transações para calcular páginas
                Object.keys(activeFilters).length === 0 && stats?.total_transactions 
                  ? {
                      page: currentPage,
                      limit: itemsPerPage,
                      total: stats.total_transactions,
                      total_pages: Math.ceil(stats.total_transactions / itemsPerPage)
                    }
                  : pagination
              }
              currentPage={currentPage}
              setCurrentPage={handlePageChange}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={handleItemsPerPageChange}
            />
          </div>

          {/* Modern Pagination */}
          {transactions.length > 0 && (
            <ModernPagination
              currentPage={currentPage}
              totalPages={
                Object.keys(activeFilters).length === 0 && stats?.total_transactions 
                  ? Math.ceil(stats.total_transactions / itemsPerPage)
                  : pagination?.total_pages || Math.ceil((pagination?.total || transactions.length) / itemsPerPage)
              }
              totalItems={
                Object.keys(activeFilters).length === 0 && stats?.total_transactions 
                  ? stats.total_transactions
                  : pagination?.total || transactions.length
              }
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              loading={transactionsLoading}
              className="mt-8"
            />
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Transactions;
