import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Copy, ArrowRight, Clock, Zap, Activity, Send, Repeat, FileText, DollarSign, ExternalLink, ArrowUpRight, ArrowDownLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TransactionSummary, formatHash, formatTimeAgo, formatEther, formatGwei, getTransactionTypeLabel } from '@/services/api';
import { useLatestBlock } from '@/stores/blockchainStore';
import { formatTransactionAgeWithFallback } from '@/utils/transactionUtils';
import { Button } from '@/components/ui/button';

// Interface temporária para os dados reais da API
interface RealTransactionData {
  hash: string;
  block_number: number;
  from: string;
  to?: string;
  value: string;
  gas: number;
  gas_used: number;
  gas_price?: string;
  status: 'success' | 'failed' | 'pending';
  mined_at?: string | null;
  type: number;
  contract_address?: string;
  method?: string;      // Nome do método identificado
  method_type?: string; // Tipo do método (transfer, approve, etc.)
  input?: string;       // Dados de entrada da transação
}

interface TransactionsTableProps {
  transactions?: RealTransactionData[];
  loading?: boolean;
  error?: string | null;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (items: number) => void;
}

const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions = [],
  loading = false,
  error = null,
  pagination = null,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage
}) => {
  const navigate = useNavigate();
  const { block: latestBlock } = useLatestBlock();

  // Calcular total de páginas com fallback inteligente
  const totalPages = pagination?.total_pages || 
    (pagination?.total ? Math.ceil(pagination.total / itemsPerPage) : 1);

  const getMethodFromTransaction = (tx: RealTransactionData): string => {
    // Se temos método identificado pela API, usar ele
    if (tx.method) {
      return tx.method;
    }

    // Fallback para lógica anterior
    // Se não tem to_address, é um deploy de contrato
    if (!tx.to) {
      return 'Deploy Contract';
    }

    // Se tem contract_address, é uma criação de contrato
    if (tx.contract_address) {
      return 'Deploy Contract';
    }

    // Se tem valor > 0 e não tem dados, é transferência de ETH
    if (parseFloat(tx.value) > 0) {
      return 'Transfer ETH';
    }

    // Transação com dados mas sem método identificado
    return 'Contract Call';
  };

  const getMethodColor = (method: string, methodType?: string) => {
    // Usar method_type da API se disponível
    if (methodType) {
      switch (methodType) {
        case 'transfer':
        case 'transferETH':
          return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';
        case 'approve':
          return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700';
        case 'mint':
          return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700';
        case 'burn':
          return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700';
        case 'swap':
          return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700';
        case 'stake':
        case 'unstake':
          return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-700';
        case 'claim':
          return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-700';
        case 'deposit':
          return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-700';
        case 'withdraw':
          return 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-700';
        case 'deploy':
          return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700';
        case 'setter':
          return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700';
        case 'getter':
          return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-300 dark:border-slate-700';
        case 'custom':
          return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-700';
        case 'unknown':
          return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
        default:
          return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700';
      }
    }

    // Fallback para análise do nome do método
    const methodLower = method.toLowerCase();
    if (method === 'Transfer' || method === 'Transfer ETH' || methodLower.includes('transfer')) {
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';
    } else if (method.includes('Deploy')) {
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700';
    } else if (methodLower.includes('swap')) {
      return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700';
    } else if (methodLower.includes('approve')) {
      return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700';
    } else if (methodLower.includes('mint')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700';
    } else if (methodLower.includes('burn')) {
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700';
    } else if (methodLower.includes('stake')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-700';
    } else if (methodLower.includes('increment') || methodLower.includes('decrement') || methodLower.includes('set')) {
      return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-700';
    } else if (method.startsWith('0x') || method === 'Unknown Method' || method === 'Contract Call') {
      return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
    } else {
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700';
    }
  };

  const getMethodIcon = (method: string, methodType?: string) => {
    // Usar method_type da API se disponível
    if (methodType) {
      switch (methodType) {
        case 'transfer':
        case 'transferETH':
          return <Send className="h-3 w-3" />;
        case 'approve':
          return <CheckCircle className="h-3 w-3" />;
        case 'mint':
          return <ArrowUpRight className="h-3 w-3" />;
        case 'burn':
          return <ArrowDownLeft className="h-3 w-3" />;
        case 'swap':
          return <Repeat className="h-3 w-3" />;
        case 'stake':
        case 'unstake':
          return <Activity className="h-3 w-3" />;
        case 'claim':
          return <DollarSign className="h-3 w-3" />;
        case 'deposit':
          return <ArrowUpRight className="h-3 w-3" />;
        case 'withdraw':
          return <ArrowDownLeft className="h-3 w-3" />;
        case 'deploy':
          return <FileText className="h-3 w-3" />;
        case 'setter':
          return <Zap className="h-3 w-3" />;
        case 'getter':
          return <Eye className="h-3 w-3" />;
        case 'custom':
          return <Zap className="h-3 w-3" />;
        case 'unknown':
          return <AlertCircle className="h-3 w-3" />;
        default:
          return <Zap className="h-3 w-3" />;
      }
    }

    // Fallback para análise do nome do método
    const methodLower = method.toLowerCase();
    if (method === 'Transfer' || method === 'Transfer ETH' || methodLower.includes('transfer')) {
      return <Send className="h-3 w-3" />;
    } else if (method.includes('Deploy')) {
      return <FileText className="h-3 w-3" />;
    } else if (methodLower.includes('swap')) {
      return <Repeat className="h-3 w-3" />;
    } else if (methodLower.includes('approve')) {
      return <CheckCircle className="h-3 w-3" />;
    } else if (methodLower.includes('mint')) {
      return <ArrowUpRight className="h-3 w-3" />;
    } else if (methodLower.includes('burn')) {
      return <ArrowDownLeft className="h-3 w-3" />;
    } else if (methodLower.includes('stake')) {
      return <Activity className="h-3 w-3" />;
    } else if (methodLower.includes('increment') || methodLower.includes('decrement')) {
      return <Zap className="h-3 w-3" />;
    } else if (methodLower.includes('set')) {
      return <Zap className="h-3 w-3" />;
    } else if (methodLower.includes('get')) {
      return <Eye className="h-3 w-3" />;
    } else if (method.startsWith('0x') || method === 'Unknown Method' || method === 'Contract Call') {
      return <AlertCircle className="h-3 w-3" />;
    } else {
      return <Zap className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'pending':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const copyToClipboard = (text: string) => {
    // Fallback universal que funciona em HTTP e HTTPS
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (!successful) throw new Error('Fallback copy failed');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const formatValue = (value: string) => {
    const ethValue = parseFloat(formatEther(value));
    if (ethValue === 0) return '0';
    if (ethValue < 0.000001) return ethValue.toExponential(2);
    return ethValue.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    });
  };

  const calculateTxFee = (gasUsed: number, gasPrice: string): string => {
    const fee = (gasUsed * parseFloat(gasPrice)) / 1e18;
    return fee.toFixed(8);
  };

  // Função para decodificar input data (versão simplificada para tabela)
  const decodeInputData = (input: string) => {
    if (!input || input === '0x' || input.length < 10) {
      return null;
    }

    try {
      let hexData = input;
      
      // Se é Base64, converter para hex
      if (!input.startsWith('0x')) {
        const binaryString = atob(input);
        hexData = '0x' + Array.from(binaryString)
          .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('');
      }

      if (hexData.length < 10) return null;

      const methodSignature = hexData.slice(0, 10);
      const paramData = hexData.slice(10);
      
      if (paramData.length === 0) return null;

      // Dividir em chunks de 64 caracteres (32 bytes cada)
      const chunks = [];
      for (let i = 0; i < paramData.length; i += 64) {
        chunks.push(paramData.slice(i, i + 64));
      }

      const parameters = chunks.map((chunk, index) => {
        if (chunk.length < 64) {
          chunk = chunk.padEnd(64, '0');
        }

        // Detectar se é endereço (últimos 40 caracteres não são zero)
        if (chunk.slice(0, 24) === '000000000000000000000000' && chunk.slice(24).match(/^[0-9a-fA-F]{40}$/)) {
          return {
            type: 'address',
            value: '0x' + chunk.slice(24)
          };
        }

        // Caso contrário, tratar como número
        const value = parseInt(chunk, 16).toString();
        return {
          type: 'uint256',
          value: value
        };
      });

      return {
        methodSignature,
        parameters: parameters.filter(p => p.value !== '0')
      };
    } catch (error) {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/6"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/8"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/6"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
          <div className="p-6 text-center">
            <div className="text-red-600 dark:text-red-400 font-medium">
              Error loading transactions: {error}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="p-12 text-center">
            <Activity className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">No Transactions Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              No transactions match your current search criteria or filters. Try adjusting your filters or search terms.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => window.location.reload()} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Refresh Page
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                Go Back
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Summary Stats */}
      {/* <div className="bg-gray-50 from-blue-50/30 to-indigo-50/30 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl p-6 border border-blue-200/30 dark:border-blue-700/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-blue-100/50 dark:bg-blue-900/20">
            <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction Overview</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {pagination ? (
                <>
                  More than <span className="font-semibold text-blue-600 dark:text-blue-400">{pagination.total.toLocaleString()}</span> transactions found
                </>
              ) : (
                <>
                  Showing <span className="font-semibold text-blue-600 dark:text-blue-400">{transactions.length}</span> transactions
                </>
              )}
            </p>
            {pagination && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                (Showing page {pagination.page} of {pagination.total_pages})
              </p>
            )}
          </div>
        </div>
      </div> */}

      {/* Modern Table Card */}
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full table-fixed min-w-[1220px]">
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <TableHead className="w-[160px] text-gray-700 dark:text-gray-300 font-semibold py-3 px-3">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm">Txn Hash</span>
                  </div>
                </TableHead>
                <TableHead className="w-[100px] text-gray-700 dark:text-gray-300 font-semibold py-3 px-2">
                  <span className="text-sm">Method</span>
                </TableHead>
                <TableHead className="w-[80px] text-gray-700 dark:text-gray-300 font-semibold py-3 px-2">
                  <span className="text-sm">Block</span>
                </TableHead>
                <TableHead className="w-[90px] text-gray-700 dark:text-gray-300 font-semibold py-3 px-2">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm">Age</span>
                  </div>
                </TableHead>
                <TableHead className="w-[150px] text-gray-700 dark:text-gray-300 font-semibold py-3 px-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">From</span>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <span className="text-sm">To</span>
                  </div>
                </TableHead>
                <TableHead className="w-[130px] text-gray-700 dark:text-gray-300 font-semibold py-3 px-2">
                  <span className="text-sm opacity-0">To</span>
                </TableHead>
                <TableHead className="w-[100px] text-gray-700 dark:text-gray-300 font-semibold py-3 px-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <DollarSign className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm">Value</span>
                  </div>
                </TableHead>
                <TableHead className="w-[100px] text-gray-700 dark:text-gray-300 font-semibold py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Zap className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm">Txn Fee</span>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx, index) => {
                const method = getMethodFromTransaction(tx);
                return (
                <TableRow 
                  key={index} 
                  className="border-b border-gray-100 dark:border-gray-600/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 group animate-fade-in transition-colors"
                  style={{ 
                    animationDelay: `${index * 0.05}s`,
                    animationFillMode: 'both'
                  }}
                >
                  <TableCell className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(tx.status)} ${tx.status === 'pending' ? 'animate-status-pulse' : ''} flex-shrink-0`}></div>
                      <Link 
                        to={`/tx/${tx.hash}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-mono text-xs font-medium transition-colors truncate"
                        title={tx.hash}
                      >
                        {formatHash(tx.hash)}
                      </Link>
                      <button 
                        onClick={() => copyToClipboard(tx.hash)}
                        className="h-5 w-5 p-0 copy-button flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                      >
                        <Copy className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-3 px-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs font-medium px-1.5 py-0.5 ${getMethodColor(method, tx.method_type)} flex items-center gap-1 w-fit badge-modern`}
                    >
                      {getMethodIcon(method, tx.method_type)}
                      <span className="truncate">{method.length > 8 ? method.substring(0, 8) + '...' : method}</span>
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="py-3 px-2">
                    <Link 
                      to={`/block/${tx.block_number}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-xs transition-colors"
                    >
                      {tx.block_number.toLocaleString()}
                    </Link>
                  </TableCell>
                  
                  <TableCell className="py-3 px-2">
                    <div className="text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">
                      {formatTransactionAgeWithFallback(
                        tx.mined_at, 
                        tx.block_number,
                        latestBlock?.number,
                        latestBlock?.timestamp ? new Date(latestBlock.timestamp).getTime() / 1000 : undefined
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-3 px-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">From:</span>
                        <Link 
                          to={`/address/${tx.from}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-mono text-xs transition-colors"
                          title={tx.from}
                        >
                          {formatHash(tx.from)}
                        </Link>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-3 px-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">To:</span>
                        {tx.to ? (
                          <Link 
                            to={`/address/${tx.to}`}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-mono text-xs transition-colors"
                            title={tx.to}
                          >
                            {formatHash(tx.to)}
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            Contract Creation
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-3 px-2 text-right">
                    <div className="text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {(() => {
                        // Primeiro, tentar mostrar parâmetros decodificados se disponíveis
                        const decodedInput = decodeInputData((tx as any).input);
                        
                        if (decodedInput && decodedInput.parameters.length > 0) {
                          const mainParam = decodedInput.parameters[0];
                          if (mainParam.type === 'uint256') {
                            return parseInt(mainParam.value).toLocaleString();
                          } else if (mainParam.type === 'address') {
                            return formatHash(mainParam.value);
                          }
                          return mainParam.value;
                        }
                        
                        // Caso contrário, mostrar valor ETH tradicional
                        return formatValue(tx.value) === '0' ? '0 ETH' : `${formatValue(tx.value)} ETH`;
                      })()}
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-3 px-3 text-right">
                    <div className="text-xs font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
                      {tx.gas_price ? calculateTxFee(tx.gas_used, tx.gas_price) : '0'} ETH
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>


    </div>
  );
};

export default TransactionsTable;
