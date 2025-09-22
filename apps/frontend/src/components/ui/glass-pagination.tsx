import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlassPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  className?: string;
}

export const GlassPagination: React.FC<GlassPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className
}) => {
  const getPaginationInfo = () => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    return { startItem, endItem };
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Ajustar se não há páginas suficientes no final
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Primeira página
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('...');
      }
    }

    // Páginas visíveis
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Última página
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }

    return pages;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Glass Container */}
      <div className="relative backdrop-blur-xl bg-white/10 dark:bg-gray-900/20 border border-white/20 dark:border-gray-700/30 rounded-2xl p-6 shadow-2xl">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 rounded-2xl"></div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Top Section - Info and Items Per Page */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            {/* Pagination Info */}
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Mostrando{' '}
                <span className="font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {formatNumber(getPaginationInfo().startItem)}
                </span>
                {' '}a{' '}
                <span className="font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {formatNumber(getPaginationInfo().endItem)}
                </span>
                {' '}de{' '}
                <span className="font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {formatNumber(totalItems)}
                </span>
                {' '}resultados
              </div>
            </div>

            {/* Items Per Page Selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Mostrar:
              </span>
              <div className="relative">
                <select
                  value={itemsPerPage}
                  onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                  className="appearance-none bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-xl px-4 py-2 pr-8 text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:bg-white/30 dark:hover:bg-gray-700/30"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronRight className="h-4 w-4 text-gray-500 rotate-90" />
                </div>
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                por página
              </span>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left Side - Navigation Buttons */}
            <div className="flex items-center gap-2">
              {/* First Page */}
              <button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="group relative overflow-hidden px-3 py-2 rounded-xl bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/30 dark:hover:bg-gray-700/30 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                <div className="relative flex items-center gap-1">
                  <ChevronsLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Primeira</span>
                </div>
              </button>

              {/* Previous Page */}
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="group relative overflow-hidden px-3 py-2 rounded-xl bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/30 dark:hover:bg-gray-700/30 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                <div className="relative flex items-center gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </div>
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {generatePageNumbers().map((page, index) => (
                  <React.Fragment key={index}>
                    {page === '...' ? (
                      <span className="px-2 py-1 text-gray-400 dark:text-gray-500 text-sm">
                        ...
                      </span>
                    ) : (
                      <button
                        onClick={() => onPageChange(page as number)}
                        className={cn(
                          "group relative overflow-hidden min-w-[40px] h-10 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg",
                          page === currentPage
                            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border-0"
                            : "bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-700/30 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400"
                        )}
                      >
                        {page !== currentPage && (
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                        )}
                        <span className="relative">{page}</span>
                      </button>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Next Page */}
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="group relative overflow-hidden px-3 py-2 rounded-xl bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/30 dark:hover:bg-gray-700/30 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                <div className="relative flex items-center gap-1">
                  <span className="hidden sm:inline">Próxima</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </button>

              {/* Last Page */}
              <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="group relative overflow-hidden px-3 py-2 rounded-xl bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/30 dark:hover:bg-gray-700/30 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                <div className="relative flex items-center gap-1">
                  <span className="hidden sm:inline">Última</span>
                  <ChevronsRight className="h-4 w-4" />
                </div>
              </button>
            </div>

            {/* Right Side - Go To Page */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Ir para:
              </span>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      onPageChange(page);
                    }
                  }}
                  className="w-20 px-3 py-2 bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:bg-white/30 dark:hover:bg-gray-700/30"
                />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                de {totalPages}
              </span>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-4 right-4 w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
        <div className="absolute bottom-4 left-4 w-1 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
    </div>
  );
};

export default GlassPagination; 