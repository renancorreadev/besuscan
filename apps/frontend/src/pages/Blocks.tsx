import React, { useState, useEffect, useCallback } from 'react';
import { Download, ExternalLink, Copy, Box, Activity, Zap, Clock, Wifi, WifiOff } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useGlassToast, GlassToastContainer } from '@/components/ui/glass-toast';
import ModernPagination from '@/components/ui/modern-pagination';
import { GlassButton } from '@/components/ui/glass-button';
import { cn } from '@/lib/utils';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {
  apiService,
  BlockSummary,
  BlockStatsResponse,
  formatHash,
  formatTimestamp,
  formatTimeAgo,
  formatGasUsed,
  formatNumber,
  formatBlockTime
} from '@/services/api';
import { useLatestBlock, useNetworkStats } from '@/stores/blockchainStore';

const Blocks = () => {
  const [blocks, setBlocks] = useState<BlockSummary[]>([]);
  const [stats, setStats] = useState<BlockStatsResponse['data'] | null>(null);
  const [latestBlock, setLatestBlock] = useState<number | null>(null);
  const { block: storeLatestBlock } = useLatestBlock();
  const { stats: storeNetworkStats } = useNetworkStats();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newBlockNumbers, setNewBlockNumbers] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [lastBlockNumber, setLastBlockNumber] = useState<number | null>(null);
  const { toast } = useToast();
  const { toasts, addToast, removeToast } = useGlassToast();

  // Polling to simulate real-time updates
  const pollForNewBlocks = useCallback(async () => {
    if (!isPolling || currentPage !== 1) return;

    try {
      const latestBlockResponse = await apiService.getLatestBlock();
      if (latestBlockResponse.success) {
        const newLatestBlock = latestBlockResponse.data.number;

        // If there's a new block
        if (lastBlockNumber && newLatestBlock > lastBlockNumber) {
          setLatestBlock(newLatestBlock);

          // Fetch the specific new block
          const newBlockResponse = await apiService.getBlock(newLatestBlock.toString());
          if (newBlockResponse.success) {
            const newBlock = newBlockResponse.data;

            // Add new block to the top of the list only if we're on the first page
            setBlocks(prev => {
              // Add the new block and remove the last one to maintain size
              const updatedBlocks = [newBlock, ...prev.slice(0, itemsPerPage - 1)];
              return updatedBlocks.map(block => ({
                ...block,
                age: formatTimeAgo(block.timestamp)
              }));
            });

            // Mark as new block for highlighting
            setNewBlockNumbers(prev => new Set(prev).add(newBlock.number));

            // Remove highlight after 5 seconds
            setTimeout(() => {
              setNewBlockNumbers(prev => {
                const newSet = new Set(prev);
                newSet.delete(newBlock.number);
                return newSet;
              });
            }, 5000);

            // Automatically reload statistics
            loadStats();

            // Show notification
            //const minerInfo = newBlock.miner ? ` by ${formatHash(newBlock.miner, 8)}` : '';
            // addToast({
            //   title: "🎉 New Block Mined!",
            //   description: `Block #${newBlock.number.toLocaleString()} was mined${minerInfo} with ${newBlock.tx_count || 0} transactions`,
            //   type: 'block',
            //   duration: 5000,
            // });
          }
        } else if (!lastBlockNumber) {
          // First check
          setLatestBlock(newLatestBlock);
        }

        setLastBlockNumber(newLatestBlock);
      }
    } catch (error) {
      console.error('Error polling for new blocks:', error);
    }
  }, [isPolling, currentPage, lastBlockNumber, itemsPerPage, addToast]);

  // React to the latest block from store
  useEffect(() => {
    if (storeLatestBlock && storeLatestBlock.number !== lastBlockNumber) {
      pollForNewBlocks();
    }
  }, [storeLatestBlock?.number]);

  // Use stats from store when available
  useEffect(() => {
    if (storeNetworkStats) {
      setStats(storeNetworkStats);
    }
  }, [storeNetworkStats]);

  // Load initial data via REST API
  useEffect(() => {
    loadInitialData();
  }, [currentPage, itemsPerPage]);

  // Separate function to load only statistics
  const loadStats = async () => {
    try {
      setUpdating(true);
      const statsResponse = await apiService.getBlockStats();
      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (err) {
      console.error('Error loading statistics:', err);
    } finally {
      setUpdating(false);
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load blocks, statistics and latest block in parallel
      const [blocksResponse, statsResponse, latestBlockResponse] = await Promise.all([
        apiService.getBlocks({
          limit: itemsPerPage,
          page: currentPage,
          order: 'desc'
        }),
        apiService.getBlockStats(),
        apiService.getLatestBlock()
      ]);

      if (blocksResponse.success) {
        // Add calculated 'age' field for each block
        const blocksWithAge = blocksResponse.data.map(block => ({
          ...block,
          age: formatTimeAgo(block.timestamp)
        }));

        setBlocks(blocksWithAge);

        if (blocksResponse.pagination) {
          setTotalPages(blocksResponse.pagination.total_pages);
          setTotalItems(blocksResponse.pagination.total);
        } else {
          // Fallback: calculate pagination based on total blocks from statistics
          if (statsResponse.success && statsResponse.data.total_blocks) {
            const totalBlocks = statsResponse.data.total_blocks;
            const calculatedTotalPages = Math.ceil(totalBlocks / itemsPerPage);
            setTotalItems(totalBlocks);
            setTotalPages(calculatedTotalPages);
          }
        }
      } else {
        throw new Error('Failed to load blocks');
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      if (latestBlockResponse.success) {
        const newLatestBlock = latestBlockResponse.data.number;
        setLatestBlock(newLatestBlock);
        setLastBlockNumber(newLatestBlock);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: "Error",
        description: `Failed to load data: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
      duration: 2000,
    });
  };

  const getGasUsedColor = (percentage: number) => {
    if (percentage <= 50) return 'bg-blue-500';
    if (percentage <= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const calculateGasPercentage = (gasUsed: number | undefined | null, gasLimit: number | undefined | null): number => {
    // If gas_limit is not present, assume a default value or return 0
    if (!gasUsed || !gasLimit || isNaN(gasUsed) || isNaN(gasLimit) || gasLimit === 0) {
      return 0;
    }

    const percentage = (gasUsed / gasLimit) * 100;
    return isNaN(percentage) ? 0 : percentage;
  };

  // Calculate average network utilization based on current blocks
  const calculateNetworkUtilization = (): string => {
    if (blocks.length === 0) return 'N/A';

    const validBlocks = blocks.filter(block => block.gas_used && block.gas_limit);
    if (validBlocks.length === 0) return 'N/A';

    const totalUtilization = validBlocks.reduce((sum, block) => {
      return sum + calculateGasPercentage(block.gas_used, block.gas_limit);
    }, 0);

    const averageUtilization = totalUtilization / validBlocks.length;
    return `${averageUtilization.toFixed(1)}%`;
  };

  // Calculate estimated TPS (Transactions Per Second)
  const calculateTPS = (): string => {
    if (blocks.length < 2) return '0.0';

    const totalTxs = blocks.reduce((sum, block) => sum + (block.tx_count || 0), 0);
    const avgBlockTime = getAverageBlockTime();
    const avgTxsPerBlock = totalTxs / blocks.length;
    const tps = avgTxsPerBlock / avgBlockTime;

    return tps.toFixed(1);
  };

  // Calculate average block time based on current blocks
  const calculateAverageBlockTime = (): number => {
    if (blocks.length < 2) return 12; // default value

    // Calculate time differences between consecutive blocks
    const timeDiffs: number[] = [];
    for (let i = 0; i < blocks.length - 1; i++) {
      const currentBlock = blocks[i];
      const nextBlock = blocks[i + 1];

      const currentTime = new Date(currentBlock.timestamp).getTime();
      const nextTime = new Date(nextBlock.timestamp).getTime();

      const diff = Math.abs(currentTime - nextTime) / 1000; // in seconds
      if (diff > 0 && diff < 300) { // filter anomalous values (less than 5 min)
        timeDiffs.push(diff);
      }
    }

    if (timeDiffs.length === 0) return 12;

    // Calculate average
    const average = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
    return Math.round(average * 10) / 10; // round to 1 decimal place
  };

  // Get average block time (from API or calculated)
  const getAverageBlockTime = (): number => {
    if (stats?.avg_block_time && !isNaN(stats.avg_block_time)) {
      return stats.avg_block_time;
    }
    return calculateAverageBlockTime();
  };

  // Function to change items per page
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Go back to first page
    // Fetch with new parameters
    loadInitialData();
  };

  // Function to navigate to a specific page
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Fetch the new page
      loadInitialData();
    }
  };

  // Calculate pagination information
  const getPaginationInfo = () => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    return { startItem, endItem };
  };

  if (loading && blocks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading blocks...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error && blocks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">Error loading data</p>
              <GlassButton onClick={loadInitialData} variant="primary">
                Try Again
              </GlassButton>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header with title and controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Blockchain Blocks
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Explore all blocks mined on the network
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Update system status */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              {isPolling ? (
                <>
                  <Activity className={`h-4 w-4 text-green-500 ${updating ? 'animate-pulse' : ''}`} />
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    {updating ? 'Updating...' : 'Active'}
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium">Paused</span>
                </>
              )}
            </div>

            {/* Button to pause/resume polling */}
            <GlassButton
              onClick={() => setIsPolling(!isPolling)}
              variant={isPolling ? "secondary" : "primary"}
              icon={isPolling ? WifiOff : Wifi}
            >
              {isPolling ? 'Pause' : 'Resume'}
            </GlassButton>

            {/* Manual update button */}
            <GlassButton
              onClick={() => {
                loadInitialData();
                addToast({
                  title: "🔄 Data Updated",
                  description: "Block list has been manually updated",
                  type: 'info',
                  duration: 2000,
                });
              }}
              loading={loading}
              variant="primary"
              icon={Activity}
            >
              Update
            </GlassButton>

            {/* Download button */}
            <GlassButton
              variant="success"
              icon={Download}
            >
              Export
            </GlassButton>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">
                  Network Utilization
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {calculateNetworkUtilization()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                TPS: {calculateTPS()}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Box className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">
                  Latest Block
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                #{formatNumber(latestBlock || 0)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">
                  Average Block Time
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {formatBlockTime(getAverageBlockTime())}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <span className="text-orange-600 dark:text-orange-400 text-lg">📊</span>
                </div>
                <div className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">
                  Total Blocks
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                {formatNumber(stats.total_blocks)}
              </div>
            </div>
          </div>
        )}

        {/* Table Info and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="text-gray-600 dark:text-gray-400">
            <p className="font-medium">
              {totalItems > 0 ? (
                <>
                  Latest blocks from Hyperledger Besu network
                </>
              ) : (
                'Loading...'
              )}
            </p>
            <p className="text-sm">
              Automatic updates every 5 seconds
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <GlassButton
              variant="primary"
              size="sm"
              icon={Download}
              onClick={loadInitialData}
              loading={loading}
            >
              {loading ? 'Loading...' : 'Update'}
            </GlassButton>
          </div>
        </div>

        {/* Blocks Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table className="w-full table-fixed min-w-[1000px]">
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 border-b border-gray-200 dark:border-gray-600">
                  <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6 w-[100px]">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30">
                        <Box className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span>Block</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6 w-[100px]">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-gray-500" />
                      <span>Age</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6 w-[60px]">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3 w-3 text-gray-500" />
                      <span>Txns</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6 w-[160px]">
                    <div className="flex items-center gap-2">
                      <span>Miner</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6 w-[140px]">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-gray-500" />
                      <span>Gas Used</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6 w-[100px]">Gas Limit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocks.map((block, index) => {
                  const gasPercentage = calculateGasPercentage(block.gas_used, block.gas_limit);


                  return (
                    <TableRow
                      key={block.hash}
                      className={cn(
                        "hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all duration-200 border-b border-gray-100 dark:border-gray-700 last:border-b-0 group animate-fade-in",
                        newBlockNumbers.has(block.number) && "bg-green-50/50 dark:bg-green-900/20 border-green-200 dark:border-green-700 shadow-lg"
                      )}
                      style={{
                        animationDelay: `${index * 0.05}s`,
                        animationFillMode: 'both'
                      }}
                    >
                      <TableCell className="py-4 px-6 w-[100px]">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
                          <a
                            href={`/block/${block.number}`}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-mono text-sm font-medium transition-colors bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 whitespace-nowrap"
                          >
                            #{block.number}
                          </a>
                        </div>
                      </TableCell>

                      <TableCell className="py-4 px-6 w-[100px]">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm whitespace-nowrap">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeAgo(block.timestamp)}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-4 px-6 w-[60px]">
                        <a
                          href={`/txs?block=${block.number}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 whitespace-nowrap"
                        >
                          {block.tx_count || 0}
                        </a>
                      </TableCell>

                      <TableCell className="py-4 px-6 w-[160px]">
                        <div className="flex items-center space-x-2">
                          {block.miner ? (
                            <>
                              <span className="text-gray-700 dark:text-gray-300 text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 truncate max-w-[120px]" title={block.miner}>
                                {formatHash(block.miner)}
                              </span>
                              <button
                                onClick={() => copyToClipboard(block.miner || '')}
                                className="p-1 h-6 w-6 copy-button flex-shrink-0 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <span className="text-gray-400 text-sm italic">Loading...</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-4 px-6 w-[140px]">
                        <div className="flex items-center space-x-3">
                          <div className="flex flex-col">
                            <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                              {formatNumber(block.gas_used || 0)}
                            </span>
                            {block.gas_limit && block.gas_used ? (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({((block.gas_used / block.gas_limit) * 100).toFixed(1)}%)
                              </span>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </div>
                          {block.gas_limit && block.gas_used && (
                            <div className="w-6 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, (block.gas_used / block.gas_limit) * 100)}%`
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-4 px-6 w-[100px]">
                        {block.gas_limit && block.gas_used ? (
                          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 text-sm font-mono bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded whitespace-nowrap">
                            <span>{formatNumber(block.gas_limit)}</span>
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, (block.gas_used / block.gas_limit) * 100)}%`
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">
                              {((block.gas_used / block.gas_limit) * 100).toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Modern Pagination */}
        {totalPages > 1 && (
          <ModernPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            loading={loading}
            className="mt-8"
          />
        )}
      </main>

      <Footer />

      {/* Glass Toast Container */}
      <GlassToastContainer
        toasts={toasts}
        onClose={removeToast}
        position="top-right"
      />
    </div>
  );
};

export default Blocks;
