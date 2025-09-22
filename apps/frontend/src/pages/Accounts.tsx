import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ModernPagination from '@/components/ui/modern-pagination';
import '@/styles/accounts-table.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  X, 
  Wallet, 
  Bot, 
  Activity, 
  DollarSign, 
  Zap, 
  Clock, 
  ArrowUpDown,
  Users,
  Shield,
  Code,
  TrendingUp,
  Eye,
  Copy,
  ExternalLink,
  Settings,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  formatAddress, 
  formatEther, 
  formatTimeAgo, 
  formatNumber,
  API_BASE_URL
} from '@/services/api';

// Interfaces para tipagem
interface Account {
  address: string;
  account_type: 'EOA' | 'CONTRACT';
  balance: string;
  nonce?: number;
  transaction_count?: number;
  is_contract: boolean;
  contract_type?: string;
  first_seen_at?: string;
  last_activity_at?: string;
  label?: string;
  risk_score?: number;
  compliance_status?: 'compliant' | 'flagged' | 'under_review';
  compliance_notes?: string;
  created_at: string;
  updated_at?: string;
}

interface AccountTag {
  address: string;
  tag: string;
  created_by?: string;
  created_at: string;
}

interface AccountStats {
  total_accounts: number;
  eoa_accounts: number;
  contract_accounts: number;
  smart_accounts: number;
  compliant_accounts: number;
  flagged_accounts: number;
  under_review_accounts: number;
  active_today: number;
  total_balance: string;
  avg_transaction_count: number;
}

interface AccountFilters {
  search: string;
  account_type: 'all' | 'EOA'; // Removido 'CONTRACT' pois esta página é só para EOAs
  minBalance: string;
  maxBalance: string;
  minTransactions: string;
  maxTransactions: string;
  complianceStatus: 'all' | 'compliant' | 'flagged' | 'under_review';
  hasContractInteractions: boolean | null;
  sortBy: 'balance' | 'transaction_count' | 'last_activity_at' | 'created_at';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

const Accounts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountTags, setAccountTags] = useState<Record<string, AccountTag[]>>({});
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Filters state
  const [filters, setFilters] = useState<AccountFilters>({
    search: searchParams.get('search') || '',
    account_type: (searchParams.get('type') as any) || 'all',
    minBalance: searchParams.get('minBalance') || '',
    maxBalance: searchParams.get('maxBalance') || '',
    minTransactions: searchParams.get('minTransactions') || '',
    maxTransactions: searchParams.get('maxTransactions') || '',
    complianceStatus: (searchParams.get('compliance') as any) || 'all',
    hasContractInteractions: searchParams.get('hasContracts') === 'true' ? true : searchParams.get('hasContracts') === 'false' ? false : null,
    sortBy: (searchParams.get('sortBy') as any) || 'balance',
    sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
    page: parseInt(searchParams.get('page') || '1'),
    limit: itemsPerPage
  });

      // API Functions
    const fetchAccountStats = async (): Promise<AccountStats> => {
      const response = await fetch(`${API_BASE_URL}/accounts/stats`);
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }
      const data = await response.json();
      return data.data;
    };

  const fetchAccounts = async (filters: AccountFilters): Promise<{ accounts: Account[], total: number }> => {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.account_type !== 'all') params.append('account_type', filters.account_type);
    if (filters.minBalance) params.append('min_balance', filters.minBalance);
    if (filters.maxBalance) params.append('max_balance', filters.maxBalance);
    if (filters.minTransactions) params.append('min_transactions', filters.minTransactions);
    if (filters.maxTransactions) params.append('max_transactions', filters.maxTransactions);
    if (filters.complianceStatus !== 'all') params.append('compliance_status', filters.complianceStatus);
    if (filters.hasContractInteractions !== null) params.append('has_contract_interactions', filters.hasContractInteractions.toString());
    
    // IMPORTANTE: Filtrar apenas accounts que NÃO são contratos (EOA apenas)
    params.append('is_contract', 'false');
    
    params.append('order_by', filters.sortBy);
    params.append('order_dir', filters.sortOrder.toUpperCase());
    params.append('page', filters.page.toString());
    params.append('limit', filters.limit.toString());
  
    const response = await fetch(`${API_BASE_URL}/accounts?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch accounts: ${response.status}`);
    }
    const data = await response.json();
    
    // Filtro adicional no frontend para garantir que apenas EOAs sejam mostradas
    const eoaAccounts = (data.data || []).filter((account: Account) => !account.is_contract);
    
    return {
      accounts: eoaAccounts,
      total: data.pagination?.total || 0
    };
  };

      const fetchAccountTags = async (address: string): Promise<AccountTag[]> => {
      try {
        const response = await fetch(`${API_BASE_URL}/accounts/${address}/tags`);
        if (!response.ok) {
          return [];
        }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.warn(`Failed to fetch tags for ${address}:`, error);
      return [];
    }
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load stats and accounts in parallel
        const [statsData, accountsData] = await Promise.all([
          fetchAccountStats().catch(() => null),
          fetchAccounts(filters)
        ]);

        if (statsData) {
    
          setStats(statsData);
        } else {
       
        }

        setAccounts(accountsData.accounts);
        setTotalAccounts(accountsData.total);

        // Load tags for each account
        const tagsPromises = accountsData.accounts.map(async (account) => {
          const tags = await fetchAccountTags(account.address);
          return { address: account.address, tags };
        });

        const tagsResults = await Promise.all(tagsPromises);
        const tagsMap: Record<string, AccountTag[]> = {};
        tagsResults.forEach(({ address, tags }) => {
          tagsMap[address] = tags;
        });
        setAccountTags(tagsMap);

      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.account_type !== 'all') params.set('type', filters.account_type);
    if (filters.minBalance) params.set('minBalance', filters.minBalance);
    if (filters.maxBalance) params.set('maxBalance', filters.maxBalance);
    if (filters.minTransactions) params.set('minTransactions', filters.minTransactions);
    if (filters.maxTransactions) params.set('maxTransactions', filters.maxTransactions);
    if (filters.complianceStatus !== 'all') params.set('compliance', filters.complianceStatus);
    if (filters.hasContractInteractions !== null) params.set('hasContracts', filters.hasContractInteractions.toString());
    if (filters.sortBy !== 'balance') params.set('sortBy', filters.sortBy);
    if (filters.sortOrder !== 'desc') params.set('sortOrder', filters.sortOrder);
    if (filters.page !== 1) params.set('page', filters.page.toString());

    setSearchParams(params);
  }, [filters, setSearchParams]);

  // Utility functions
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (isNaN(num)) return '0 ETH';
    
    // Convert from Wei to ETH
    const ethValue = num / 1e18;
    
    if (ethValue >= 1000000) return `${(ethValue / 1000000).toFixed(2)}M ETH`;
    if (ethValue >= 1000) return `${(ethValue / 1000).toFixed(2)}K ETH`;
    return `${ethValue.toFixed(4)} ETH`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getAccountTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'eoa':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700';
      case 'contract':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700';
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
      case 'flagged':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score <= 2) return 'text-green-600 dark:text-green-400';
    if (score <= 5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleFilterChange = (key: keyof AccountFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 })); // Reset to page 1 when filters change
  };

  const applyFilters = async () => {
    try {
      setLoading(true);
      setError(null);
      setShowFilters(false);

      const accountsData = await fetchAccounts(filters);
      setAccounts(accountsData.accounts);
      setTotalAccounts(accountsData.total);

      // Load tags for new accounts
      const tagsPromises = accountsData.accounts.map(async (account) => {
        const tags = await fetchAccountTags(account.address);
        return { address: account.address, tags };
      });

      const tagsResults = await Promise.all(tagsPromises);
      const tagsMap: Record<string, AccountTag[]> = {};
      tagsResults.forEach(({ address, tags }) => {
        tagsMap[address] = tags;
      });
      setAccountTags(tagsMap);

    } catch (err) {
      console.error('Error applying filters:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply filters');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      account_type: 'all',
      minBalance: '',
      maxBalance: '',
      minTransactions: '',
      maxTransactions: '',
      complianceStatus: 'all',
      hasContractInteractions: null,
      sortBy: 'balance',
      sortOrder: 'desc',
      page: 1,
      limit: itemsPerPage
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
    applyFilters();
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.account_type !== 'all') count++;
    if (filters.minBalance || filters.maxBalance) count++;
    if (filters.minTransactions || filters.maxTransactions) count++;
    if (filters.complianceStatus !== 'all') count++;
    if (filters.hasContractInteractions !== null) count++;
    return count;
  }, [filters]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading Accounts</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white">
                Retry
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Page Header */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <Users className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  EOA Accounts
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                  Explore and analyze Externally Owned Accounts (EOAs) on the blockchain
                </p>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200/50 dark:border-blue-700/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                      Total EOAs
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {(stats?.eoa_accounts || totalAccounts || 0).toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200/50 dark:border-purple-700/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                      With Activity
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {accounts.filter(a => (a.transaction_count || 0) > 0).length}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200/50 dark:border-green-700/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300 uppercase tracking-wide">
                      Compliant
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-green-900 dark:text-green-100">
                    {stats?.compliant_accounts?.toLocaleString() || accounts.filter(a => a.compliance_status === 'compliant').length}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200/50 dark:border-orange-700/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                      <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-300 uppercase tracking-wide">
                      Active Today
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {stats?.active_today?.toLocaleString() || '0'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Search and Filters */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    placeholder="Search EOA accounts by address, label, or tag..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  />
                </div>

                {/* Filter Button */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 relative text-gray-900 dark:text-white"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <Badge className="ml-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                  
                  <Button
                    onClick={applyFilters}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Search
                  </Button>
                </div>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Account Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Account Type
                      </label>
                      <select
                        value={filters.account_type}
                        onChange={(e) => handleFilterChange('account_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400"
                      >
                        <option value="all">All EOA Types</option>
                        <option value="EOA">Standard EOA</option>
                      </select>
                    </div>

                    {/* Balance Range */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Balance Range (ETH)
                      </label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Min"
                          value={filters.minBalance}
                          onChange={(e) => handleFilterChange('minBalance', e.target.value)}
                          className="bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        />
                        <Input
                          placeholder="Max"
                          value={filters.maxBalance}
                          onChange={(e) => handleFilterChange('maxBalance', e.target.value)}
                          className="bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        />
                      </div>
                    </div>

                    {/* Compliance Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Compliance Status
                      </label>
                      <select
                        value={filters.complianceStatus}
                        onChange={(e) => handleFilterChange('complianceStatus', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400"
                      >
                        <option value="all">All Status</option>
                        <option value="compliant">Compliant</option>
                        <option value="flagged">Flagged</option>
                        <option value="under_review">Under Review</option>
                      </select>
                    </div>

                    {/* Transaction Range */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Transaction Count
                      </label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Min"
                          value={filters.minTransactions}
                          onChange={(e) => handleFilterChange('minTransactions', e.target.value)}
                          className="bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        />
                        <Input
                          placeholder="Max"
                          value={filters.maxTransactions}
                          onChange={(e) => handleFilterChange('maxTransactions', e.target.value)}
                          className="bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        />
                      </div>
                    </div>

                    {/* Sort Options */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Sort By
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={filters.sortBy}
                          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400"
                        >
                          <option value="balance">Balance</option>
                          <option value="transaction_count">Transactions</option>
                          <option value="last_activity_at">Last Activity</option>
                          <option value="created_at">Created</option>
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                          className="px-3 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                        >
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mt-6">
                    <Button
                      onClick={applyFilters}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Apply Filters
                    </Button>
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                    >
                      Clear All
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowFilters(false)}
                      className="sm:ml-auto text-gray-900 dark:text-white"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accounts Table */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="text-gray-600 dark:text-gray-400">Loading accounts...</span>
                  </div>
                </div>
              ) : accounts.length === 0 ? (
                <div className="p-8 text-center">
                  <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No EOA accounts found</h3>
                  <p className="text-gray-600 dark:text-gray-400">Try adjusting your search criteria or filters to find EOA accounts.</p>
                </div>
              ) : (
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                        <th className="text-left p-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Account
                        </th>
                        <th className="text-left p-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Balance
                        </th>
                        <th className="text-left p-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Transactions
                        </th>
                        <th className="text-left p-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-left p-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Last Activity
                        </th>
                        <th className="text-center p-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600/50">
                      {accounts.map((account) => (
                        <tr 
                          key={account.address} 
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/30 group transition-colors"
                        >
                          {/* Account Column */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-blue-100/50 dark:bg-blue-900/30">
                                <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <a 
                                    href={`/address/${account.address}`}
                                    className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors truncate"
                                  >
                                    {formatAddress(account.address)}
                                  </a>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(account.address)}
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-600"
                                  >
                                    <Copy className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                  </Button>
                                </div>
                                {account.label && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                                    {account.label}
                                  </div>
                                )}
                                {/* Tags */}
                                {accountTags[account.address] && accountTags[account.address].length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {accountTags[account.address].slice(0, 2).map((tag, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600">
                                        {tag.tag}
                                      </Badge>
                                    ))}
                                    {accountTags[account.address].length > 2 && (
                                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600">
                                        +{accountTags[account.address].length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Balance Column */}
                          <td className="p-4">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatBalance(account.balance)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Nonce: {account.nonce?.toLocaleString() || 'N/A'}
                            </div>
                          </td>

                          {/* Transactions Column */}
                          <td className="p-4">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {(account.transaction_count || 0).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              transactions
                            </div>
                          </td>

                          {/* Status Column */}
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <Badge className={`text-xs ${getAccountTypeColor(account.account_type)}`}>
                                EOA
                              </Badge>
                              {account.compliance_status && (
                                <Badge className={`text-xs ${getComplianceColor(account.compliance_status)}`}>
                                  {account.compliance_status.replace('_', ' ')}
                                </Badge>
                              )}
                              {account.risk_score !== undefined && (
                                <Badge 
                                  variant="outline" 
                                  className={`border-current text-xs ${getRiskScoreColor(account.risk_score)}`}
                                >
                                  Risk: {account.risk_score}/10
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* Last Activity Column */}
                          <td className="p-4">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {account.last_activity_at ? formatTimeAgo(account.last_activity_at) : 'Never'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              last activity
                            </div>
                          </td>

                          {/* Actions Column */}
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                              >
                                <a href={`/address/${account.address}`} title="View Details">
                                  <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                </a>
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                                title="External Explorer"
                              >
                                <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modern Pagination */}
          {accounts.length > 0 && (
            <ModernPagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalAccounts / itemsPerPage)}
              totalItems={totalAccounts}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={(newItemsPerPage) => {
                setItemsPerPage(newItemsPerPage);
                setCurrentPage(1);
                applyFilters();
              }}
              loading={loading}
              className="mt-8"
            />
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Accounts; 