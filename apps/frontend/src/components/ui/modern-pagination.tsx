import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Zap, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ModernPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  className?: string;
  loading?: boolean;
  showItemsPerPage?: boolean;
  itemsPerPageOptions?: number[];
}

export const ModernPagination: React.FC<ModernPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className,
  loading = false,
  showItemsPerPage = true,
  itemsPerPageOptions = [5, 10, 25, 50, 100]
}) => {
  const [showPageInput, setShowPageInput] = useState(false);
  const [pageInputValue, setPageInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Calcular informações de paginação
  const getPaginationInfo = () => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    return { startItem, endItem };
  };

  const { startItem, endItem } = getPaginationInfo();

  // Navegar para página específica
  const handlePageInputSubmit = () => {
    const pageNum = parseInt(pageInputValue);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setShowPageInput(false);
      setPageInputValue('');
    }
  };

  const handlePageInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit();
    } else if (e.key === 'Escape') {
      setShowPageInput(false);
      setPageInputValue('');
    }
  };

  // Formatação inteligente de números grandes
  const formatLargeNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // Verificar se precisa de otimização visual para números grandes
  const needsOptimization = totalItems >= 1000;

  // Gerar números de página para exibir (otimizado para grandes volumes)
  const getPageNumbers = () => {
    // Para volumes muito grandes (4+ dígitos), usar estratégia simplificada
    if (needsOptimization && totalPages > 100) {
      const range = [];
      
      // Sempre mostrar primeira página
      if (currentPage > 3) {
        range.push(1);
        if (currentPage > 4) {
          range.push('...');
        }
      }
      
      // Páginas ao redor da atual (máximo 3)
      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!range.includes(i)) {
          range.push(i);
        }
      }
      
      // Sempre mostrar última página
      if (currentPage < totalPages - 2) {
        if (currentPage < totalPages - 3) {
          range.push('...');
        }
        range.push(totalPages);
      }
      
      return range;
    }

    // Lógica original para volumes menores
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1 && !showItemsPerPage) {
    return null;
  }

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm",
      className
    )}>
      <div className="px-4 sm:px-6 py-4">
        <div className="flex flex-col gap-4">
                    {/* Items info and controls - Mobile optimized */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Items info */}
            <div className="text-sm text-gray-600 dark:text-gray-400 order-2 sm:order-1">
              {totalItems > 0 ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div>
                    {needsOptimization ? (
                      <>
                        <span className="font-medium text-gray-900 dark:text-white">{formatLargeNumber(startItem)}</span>-
                        <span className="font-medium text-gray-900 dark:text-white">{formatLargeNumber(endItem)}</span> of{' '}
                        <span className="font-medium text-gray-900 dark:text-white" title={`${totalItems.toLocaleString()} total items`}>
                          {formatLargeNumber(totalItems)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-gray-900 dark:text-white">{startItem.toLocaleString()}</span>-
                        <span className="font-medium text-gray-900 dark:text-white">{endItem.toLocaleString()}</span> of{' '}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {totalItems.toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>
                  {needsOptimization && totalPages > 100 && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full whitespace-nowrap">
                      Page {currentPage.toLocaleString()}
                    </span>
                  )}
                </div>
              ) : (
                'No results found'
              )}
            </div>

            {/* Items per page selector */}
            {showItemsPerPage && (
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                  disabled={loading}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {itemsPerPageOptions.map(option => (
                    <option key={option} value={option} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                      {option}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-600 dark:text-gray-400">per page</span>
              </div>
            )}
          </div>

          {/* Pagination controls - Mobile optimized */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Mobile: Top row with Latest and Go to Page */}
              <div className="flex sm:hidden items-center justify-center gap-2">
                {/* Latest button for large datasets */}
                {needsOptimization && currentPage > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(1)}
                    disabled={loading}
                    className="h-8 px-3 text-xs border-gray-200 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <Zap className="h-3 w-3 mr-1 text-green-600 dark:text-green-400" />
                    <span className="text-green-600 dark:text-green-400 font-medium">Latest</span>
                  </Button>
                )}

                {/* Quick page navigation for large datasets */}
                {needsOptimization && totalPages > 100 && (
                  <div className="flex items-center gap-1">
                    {showPageInput ? (
                      <div className="flex items-center gap-1">
                        <input
                          ref={inputRef}
                          type="number"
                          min="1"
                          max={totalPages}
                          value={pageInputValue}
                          onChange={(e) => setPageInputValue(e.target.value)}
                          onKeyDown={handlePageInputKeyPress}
                          onBlur={() => {
                            setTimeout(() => setShowPageInput(false), 150);
                          }}
                          className="w-14 h-7 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500/20"
                          placeholder="Page"
                          autoFocus
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePageInputSubmit}
                          className="h-7 w-7 p-0 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        >
                          <Search className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowPageInput(true);
                          setTimeout(() => inputRef.current?.focus(), 50);
                        }}
                        className="h-8 px-3 text-xs border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400"
                        title="Jump to page"
                      >
                        <Search className="h-3 w-3 mr-1" />
                        Go to
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Main navigation controls */}
              <div 
                className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden"
                style={{
                  scrollbarWidth: 'none', /* Firefox */
                  msOverflowStyle: 'none', /* IE and Edge */
                }}
              >
                {/* Desktop: Latest button */}
                <div className="hidden sm:flex items-center gap-2">
                  {needsOptimization && currentPage > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(1)}
                      disabled={loading}
                      className="h-9 px-3 border-gray-200 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <Zap className="h-3 w-3 mr-1 text-green-600 dark:text-green-400" />
                      <span className="text-green-600 dark:text-green-400 font-medium">Latest</span>
                    </Button>
                  )}

                  {/* First page (hidden when Latest is shown) */}
                  {(!needsOptimization || currentPage === 1) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(1)}
                      disabled={currentPage === 1 || loading}
                      className="h-9 w-9 p-0 border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* First page (mobile only) */}
                <div className="flex sm:hidden">
                  {(!needsOptimization || currentPage === 1) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(1)}
                      disabled={currentPage === 1 || loading}
                      className="h-8 w-8 p-0 border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white"
                    >
                      <ChevronsLeft className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Previous page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white"
                >
                  <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>

                {/* Page numbers */}
                <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                  {getPageNumbers().map((pageNumber, index) => (
                    <React.Fragment key={index}>
                      {pageNumber === '...' ? (
                        <span className="px-1 sm:px-2 py-1 text-gray-400 dark:text-gray-500 text-xs sm:text-sm">•••</span>
                      ) : (
                        <Button
                          variant={currentPage === pageNumber ? "default" : "outline"}
                          size="sm"
                          onClick={() => onPageChange(pageNumber as number)}
                          disabled={loading}
                          className={cn(
                            "h-8 sm:h-9 text-xs sm:text-sm font-medium transition-all duration-200 flex-shrink-0",
                            needsOptimization && totalPages > 100 
                              ? "min-w-[1.75rem] sm:min-w-[2.5rem] px-1 sm:px-2" // Largura flexível para números grandes
                              : "w-8 sm:w-9 p-0", // Largura fixa para números pequenos
                            currentPage === pageNumber
                              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md border-blue-600"
                              : "border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                          title={needsOptimization ? `Page ${(pageNumber as number).toLocaleString()}` : undefined}
                        >
                          {needsOptimization && (pageNumber as number) >= 1000 
                            ? formatLargeNumber(pageNumber as number)
                            : pageNumber
                          }
                        </Button>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Next page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                  className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                </Button>

                {/* Last page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(totalPages)}
                  disabled={currentPage === totalPages || loading}
                  className="h-8 sm:h-9 w-8 sm:w-9 p-0 border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white"
                >
                  <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>

                {/* Desktop: Quick page navigation */}
                <div className="hidden sm:flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-600">
                  {needsOptimization && totalPages > 100 && (
                    <>
                      {showPageInput ? (
                        <div className="flex items-center gap-1">
                          <input
                            ref={inputRef}
                            type="number"
                            min="1"
                            max={totalPages}
                            value={pageInputValue}
                            onChange={(e) => setPageInputValue(e.target.value)}
                            onKeyDown={handlePageInputKeyPress}
                            onBlur={() => {
                              setTimeout(() => setShowPageInput(false), 150);
                            }}
                            className="w-16 h-8 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500/20"
                            placeholder="Page"
                            autoFocus
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePageInputSubmit}
                            className="h-8 w-8 p-0 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                          >
                            <Search className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowPageInput(true);
                            setTimeout(() => inputRef.current?.focus(), 50);
                          }}
                          className="h-9 px-3 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400"
                          title="Jump to page"
                        >
                          <Search className="h-3 w-3 mr-1" />
                          Go to
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernPagination; 