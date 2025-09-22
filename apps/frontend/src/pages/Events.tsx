import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Filter, X, Zap } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import EventsTable from '@/components/events/EventsTable';
import EventsFilters, { EventFilters } from '@/components/events/EventsFilters';
import ModernPagination from '@/components/ui/modern-pagination';
import { useEvents, useEventStats } from '@/hooks/useEvents';
import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';

const Events = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [activeFilters, setActiveFilters] = useState<EventFilters>({});
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);

  // Ler parâmetros da URL na inicialização
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    
    if (searchParam) {
      // Aplicar filtro de busca automaticamente
      const filters = { search: searchParam };
      setActiveFilters(filters);
    }
  }, []);

  // Memoize options to prevent infinite loops
  const eventOptions = useMemo(() => ({
    limit: itemsPerPage,
    page: currentPage,
    order: 'desc' as const,
    autoFetch: Object.keys(activeFilters).length === 0 
  }), [itemsPerPage, currentPage, activeFilters]);

  const {
    events,
    loading: eventsLoading,
    error: eventsError,
    pagination,
    fetchEvents,
    searchEvents,
    setCustomEvents
  } = useEvents(eventOptions);

  // Buscar estatísticas dos eventos
  const {
    stats,
    loading: statsLoading,
    error: statsError,
    fetchStats
  } = useEventStats();

  // Handle filter changes
  const handleFiltersChange = async (filters: EventFilters) => {
    setActiveFilters(filters);
    setCurrentPage(1); // Reset to first page when filters change
    
    if (Object.keys(filters).length === 0) {
      // No filters, fetch regular events
      await fetchEvents({ limit: itemsPerPage, page: 1, order: 'desc' });
    } else {
      // Check for direct event ID search first
      if (filters.search) {
        const searchValue = filters.search.trim();
        // Check if it's a direct event ID or transaction hash
        if (searchValue.startsWith('0x') && searchValue.length === 66) {
          // É um hash de transação - buscar eventos dessa transação
          try {
            const response = await apiService.getEventsByTransaction(searchValue);
            if (response.success && response.data) {
              setCustomEvents(
                response.data,
                {
                  page: 1,
                  limit: response.data.length,
                  total: response.data.length,
                  total_pages: 1
                }
              );
            } else {
              // Hash não encontrado - mostrar resultado vazio
              setCustomEvents([], {
                page: 1,
                limit: itemsPerPage,
                total: 0,
                total_pages: 0
              });
            }
            return;
          } catch (err) {
            console.error('Erro ao buscar eventos por hash:', err);
            setCustomEvents([], {
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
      await searchEvents(apiParams);
    }
  };

  // Fechar modal com tecla ESC
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
  const buildApiParams = (filters: EventFilters, page: number = 1, limit: number = itemsPerPage) => {
    const apiParams: any = {
      order_by: 'block_number',
      order_dir: 'desc',
      page: page,
      limit: limit
    };

    // Mapear filtros
    if (filters.search) {
      const searchValue = filters.search.trim();
      if (searchValue.startsWith('0x') && searchValue.length === 42) {
        // É um endereço
        apiParams.contract_address = searchValue;
      } else if (/^\d+$/.test(searchValue)) {
        // É um número de bloco
        apiParams.from_block = searchValue;
        apiParams.to_block = searchValue;
      } else {
        // É um nome de evento
        apiParams.event_name = searchValue;
      }
    }

    // Mapear outros filtros
    if (filters.contract_address) apiParams.contract_address = filters.contract_address;
    if (filters.event_name) apiParams.event_name = filters.event_name;
    if (filters.from_address) apiParams.from_address = filters.from_address;
    if (filters.to_address) apiParams.to_address = filters.to_address;
    if (filters.from_block) apiParams.from_block = filters.from_block;
    if (filters.to_block) apiParams.to_block = filters.to_block;
    if (filters.from_date) apiParams.from_date = filters.from_date;
    if (filters.to_date) apiParams.to_date = filters.to_date;
    if (filters.transaction_hash) apiParams.transaction_hash = filters.transaction_hash;

    return apiParams;
  };

  // Handle page changes
  const handlePageChange = async (page: number) => {
    setCurrentPage(page);
    
    if (Object.keys(activeFilters).length > 0) {
      // Com filtros ativos, usar searchEvents
      const apiParams = buildApiParams(activeFilters, page, itemsPerPage);
      await searchEvents(apiParams);
    } else {
      // Sem filtros, usar fetchEvents para buscar a página normal
      await fetchEvents({ limit: itemsPerPage, page: page, order: 'desc' });
    }
  };

  const handleItemsPerPageChange = async (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
    
    if (Object.keys(activeFilters).length > 0) {
      // Com filtros ativos, usar searchEvents
      const apiParams = buildApiParams(activeFilters, 1, items);
      await searchEvents(apiParams);
    } else {
      // Sem filtros, usar fetchEvents para buscar com novo limite
      await fetchEvents({ limit: items, page: 1, order: 'desc' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="flex flex-col space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <Zap className="h-7 w-7 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Smart Contract Events</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Real-time events emitted by smart contracts on the Hyperledger Besu network
                </p>
              </div>
            </div>

            {/* Event Stats */}
            {stats && !statsError && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Events</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.total_events?.toLocaleString() || '0'}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Unique Contracts</div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {stats.unique_contracts?.toLocaleString() || '0'}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Most Popular</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.popular_events?.[0]?.event_name || 'N/A'}
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
                className="flex items-center gap-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 text-gray-900 dark:text-white"
              >
                <Filter className="h-4 w-4" />
                Filters
                {Object.keys(activeFilters).length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                    {Object.keys(activeFilters).length}
                  </span>
                )}
              </Button>
              
              {Object.keys(activeFilters).length > 0 && (
                <Button
                  onClick={() => handleFiltersChange({})}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-red-600 dark:hover:text-red-400 dark:text-gray-400"
                >
                  Clear Filters
                </Button>
              )}
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-6">
              {/* Event Overview */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <div className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">Event Overview</span>
                    <div className="text-gray-600 dark:text-gray-400">
                      {eventsLoading || statsLoading ? (
                        'Loading events...'
                      ) : Object.keys(activeFilters).length > 0 ? (
                        // Quando há filtros ativos, mostrar resultados filtrados vs total do banco
                        `Showing ${events.length} of ${pagination?.total?.toLocaleString() || events.length} filtered results (${stats?.total_events?.toLocaleString() || 'N/A'} total)`
                      ) : (
                        // Quando não há filtros, sempre usar stats do banco
                        stats?.total_events ? 
                          `Showing ${events.length} of ${stats.total_events.toLocaleString()} events` :
                          `Showing ${events.length} of ${pagination?.total?.toLocaleString() || events.length} events`
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Results Count */}
              <div className="text-sm text-gray-600 dark:text-gray-400 lg:text-right">
                {eventsLoading || statsLoading ? (
                  'Loading...'
                ) : Object.keys(activeFilters).length > 0 ? (
                  // Com filtros ativos
                  pagination?.total ? (
                    <>
                      <div className="font-medium">{pagination.total.toLocaleString()} filtered results</div>
                      <div>Page {currentPage} of {pagination.total_pages || Math.ceil(pagination.total / itemsPerPage)}</div>
                    </>
                  ) : events.length > 0 ? (
                    <>
                      <div className="font-medium">{events.length} results</div>
                      <div>Page 1 of 1</div>
                    </>
                  ) : (
                    'No results found'
                  )
                ) : (
                  // Sem filtros - sempre usar stats do banco se disponível
                  stats?.total_events ? (
                    <>
                      <div className="font-medium">{stats.total_events.toLocaleString()} total events</div>
                      <div>Page {currentPage} of {Math.ceil(stats.total_events / itemsPerPage)}</div>
                    </>
                  ) : pagination?.total ? (
                    <>
                      <div className="font-medium">{pagination.total.toLocaleString()} total results</div>
                      <div>Page {currentPage} of {pagination.total_pages || Math.ceil(pagination.total / itemsPerPage)}</div>
                    </>
                  ) : events.length > 0 ? (
                    <>
                      <div className="font-medium">{events.length} results</div>
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
              onClick={() => setIsFiltersModalOpen(false)}
            >
              <div 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <Filter className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Event Filters</h3>
                  </div>
                  <Button
                    onClick={() => setIsFiltersModalOpen(false)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Modal Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                  <EventsFilters 
                    onFiltersChange={handleFiltersChange}
                    onApplyFilters={() => setIsFiltersModalOpen(false)}
                    loading={eventsLoading}
                    totalCount={pagination?.total || 0}
                    currentFilters={activeFilters}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Events Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <EventsTable 
              events={events}
              loading={eventsLoading}
              error={eventsError}
              pagination={
                // Se não há filtros e temos stats, usar total de eventos para calcular páginas
                Object.keys(activeFilters).length === 0 && stats?.total_events 
                  ? {
                      page: currentPage,
                      limit: itemsPerPage,
                      total: stats.total_events,
                      total_pages: Math.ceil(stats.total_events / itemsPerPage)
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
          {events.length > 0 && (
            <ModernPagination
              currentPage={currentPage}
              totalPages={
                Object.keys(activeFilters).length === 0 && stats?.total_events 
                  ? Math.ceil(stats.total_events / itemsPerPage)
                  : pagination?.total_pages || Math.ceil((pagination?.total || events.length) / itemsPerPage)
              }
              totalItems={
                Object.keys(activeFilters).length === 0 && stats?.total_events 
                  ? stats.total_events
                  : pagination?.total || events.length
              }
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              loading={eventsLoading}
              className="mt-8"
            />
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Events; 