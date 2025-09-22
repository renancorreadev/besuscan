import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, Copy, Shield, ShieldCheck, ShieldOff, Users, Activity, Zap, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { apiService, ValidatorSummary, ValidatorMetrics } from '@/services/api';

// Interface para dados dos validadores
interface ValidatorData {
  totalValidators: number;
  activeValidators: number;
  stakeThreshold: string;
  networkConsensus: string;
  currentEpoch: string;
  validators: ValidatorSummary[];
}

const Validators = () => {
  const [data, setData] = useState<ValidatorData>({
    totalValidators: 0,
    activeValidators: 0,
    stakeThreshold: 'N/A (QBFT)',
    networkConsensus: 'QBFT',
    currentEpoch: '0',
    validators: []
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch validators data from API
  useEffect(() => {
    fetchValidators();
  }, []);

  const fetchValidators = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both validators and metrics
      const [validatorsResponse, metricsResponse] = await Promise.all([
        apiService.getValidators(),
        apiService.getValidatorMetrics()
      ]);

      if (validatorsResponse.success && metricsResponse.success) {
        setData({
          totalValidators: metricsResponse.data.total_validators,
          activeValidators: metricsResponse.data.active_validators,
          stakeThreshold: 'N/A (QBFT)', // QBFT doesn't use stake
          networkConsensus: metricsResponse.data.consensus_type,
          currentEpoch: metricsResponse.data.current_epoch.toLocaleString(),
          validators: validatorsResponse.data
        });
      } else {
        setError('Failed to fetch validators data');
      }
    } catch (err) {
      console.error('Error fetching validators:', err);
      setError('Error connecting to API');
    } finally {
      setLoading(false);
    }
  };

  const syncValidators = async () => {
    try {
      setSyncing(true);
      const response = await apiService.syncValidators();
      
      if (response.success) {
        // Refresh data after sync
        await fetchValidators();
      } else {
        setError('Failed to sync validators');
      }
    } catch (err) {
      console.error('Error syncing validators:', err);
      setError('Error syncing validators');
    } finally {
      setSyncing(false);
    }
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');
  const validatorsPerPage = 10;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <ShieldCheck className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <ShieldOff className="h-4 w-4 text-red-500" />;
      default:
        return <Shield className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-500';
      case 'inactive':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  const getUptimeColor = (uptime: string) => {
    const percentage = parseFloat(uptime);
    if (percentage >= 99) return 'text-green-500';
    if (percentage >= 95) return 'text-yellow-500';
    return 'text-red-500';
  };

  const filteredValidators = data.validators.filter(validator => {
    if (activeTab === 'active') return validator.status === 'active';
    if (activeTab === 'inactive') return validator.status === 'inactive';
    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredValidators.length / validatorsPerPage);
  const startIndex = (currentPage - 1) * validatorsPerPage;
  const endIndex = startIndex + validatorsPerPage;
  const paginatedValidators = filteredValidators.slice(startIndex, endIndex);

  // Reset page when changing tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <Shield className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">QBFT Validators</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Network validators securing the Hyperledger Besu blockchain
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 text-gray-900 dark:text-white">
            <span>🔧</span> API
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">
                Total Validators
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {data.totalValidators}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">
                Active Validators
              </div>
            </div>
            <div className="text-2xl font-bold text-green-500 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
              {data.activeValidators}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">
                Current Epoch
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {data.currentEpoch}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">
                Consensus Mechanism
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
              {data.networkConsensus}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">
                Stake Threshold
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {data.stakeThreshold}
            </div>
          </div>
        </div>

        {/* Tabs for filtering */}
        <div className="mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
              <TabsTrigger value="all" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-900 dark:text-gray-300">
                All Validators ({data.validators.length})
              </TabsTrigger>
              <TabsTrigger value="active" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-900 dark:text-gray-300">
                Active ({data.validators.filter(v => v.status === 'active').length})
              </TabsTrigger>
              <TabsTrigger value="inactive" className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-900 dark:text-gray-300">
                Inactive ({data.validators.filter(v => v.status === 'inactive').length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Table Info and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="text-gray-600 dark:text-gray-400">
            <p className="font-medium">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredValidators.length)} of {filteredValidators.length} validators
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={syncValidators}
              disabled={syncing}
              className="border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 text-gray-900 dark:text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Validators'}
            </Button>
            <Button variant="outline" size="sm" className="border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 text-gray-900 dark:text-white">
              <Download className="h-4 w-4 mr-2" />
              Download Data
            </Button>
          </div>
        </div>

        {/* Loading/Error States */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm p-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-purple-600 mr-2" />
              <span className="text-gray-600 dark:text-gray-400">Loading validators...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <ShieldOff className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          </div>
        )}

        {/* Validators Table */}
        {!loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-600">
                  <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-purple-100 dark:bg-purple-900/30">
                        <span className="text-purple-600 dark:text-purple-400 text-xs font-bold">#</span>
                      </div>
                      <span>Rank</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                      <span>Validator</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                      <span>Status</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                      <span>Stake</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6">Commission</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                      <span>Uptime</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6">Blocks Proposed</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6">Missed Blocks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedValidators.map((validator, index) => (
                  <TableRow 
                    key={validator.address} 
                    className="hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all duration-200 border-b border-gray-100 dark:border-gray-700 last:border-b-0 group animate-fade-in"
                    style={{ 
                      animationDelay: `${index * 0.05}s`,
                      animationFillMode: 'both'
                    }}
                  >
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                          {startIndex + index + 1}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4 px-6">
                      <div className="space-y-2">
                        <div className="font-medium text-gray-900 dark:text-white">
                          Validator #{startIndex + index + 1}
                        </div>
                        <div className="flex items-center space-x-2">
                          <a 
                            href={`/validator/${validator.address}`} 
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-mono text-xs bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30"
                          >
                            {validator.address.substring(0, 12)}...{validator.address.substring(validator.address.length - 6)}
                          </a>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => copyToClipboard(validator.address)}
                            className="p-1 h-6 w-6 copy-button hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            <Copy className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(validator.status)}
                        <span className={`font-medium capitalize px-2 py-1 rounded-full text-xs ${
                          validator.status === 'active' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {validator.status}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4 px-6">
                      <div className="font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-lg text-sm">
                        N/A (QBFT)
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4 px-6">
                      <div className="text-gray-700 dark:text-gray-300 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded text-sm font-medium">
                        N/A (QBFT)
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className={`font-medium px-2 py-1 rounded text-sm ${getUptimeColor(validator.uptime.toString())} ${
                          validator.uptime >= 99 
                            ? 'bg-green-50 dark:bg-green-900/20' 
                            : validator.uptime >= 95 
                            ? 'bg-yellow-50 dark:bg-yellow-900/20' 
                            : 'bg-red-50 dark:bg-red-900/20'
                        }`}>
                          {validator.uptime.toFixed(1)}%
                        </div>
                        <div className="w-8 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              validator.uptime >= 99 ? 'bg-green-500' :
                              validator.uptime >= 95 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${validator.uptime}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4 px-6">
                      <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-sm font-medium">
                        {parseInt(validator.proposed_block_count).toLocaleString()}
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4 px-6">
                      <div className="font-medium px-2 py-1 rounded text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
                        N/A
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={goToPrevious}
                  className={`cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white ${
                    currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
              </PaginationItem>
              
              {/* First page */}
              {currentPage > 2 && (
                <>
                  <PaginationItem>
                    <PaginationLink 
                      onClick={() => goToPage(1)}
                      className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white"
                    >
                      1
                    </PaginationLink>
                  </PaginationItem>
                  {currentPage > 3 && (
                    <PaginationItem>
                      <span className="px-3 py-2 text-gray-500 dark:text-gray-400">...</span>
                    </PaginationItem>
                  )}
                </>
              )}
              
              {/* Previous page */}
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationLink 
                    onClick={() => goToPage(currentPage - 1)}
                    className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white"
                  >
                    {currentPage - 1}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              {/* Current page */}
              <PaginationItem>
                <PaginationLink 
                  isActive 
                  className="bg-blue-600 text-white hover:bg-blue-700 cursor-default"
                >
                  {currentPage}
                </PaginationLink>
              </PaginationItem>
              
              {/* Next page */}
              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationLink 
                    onClick={() => goToPage(currentPage + 1)}
                    className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white"
                  >
                    {currentPage + 1}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              {/* Last page */}
              {currentPage < totalPages - 1 && (
                <>
                  {currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <span className="px-3 py-2 text-gray-500 dark:text-gray-400">...</span>
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationLink 
                      onClick={() => goToPage(totalPages)}
                      className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white"
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                </>
              )}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={goToNext}
                  className={`cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white ${
                    currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Validators;
