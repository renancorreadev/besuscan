import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  ExternalLink,
  CheckCircle,
  XCircle,
  Code,
  Activity,
  Calendar,
  Zap,
  Copy,
  Check,
  ChevronDown,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SmartContractSummary } from '@/services/api';
import { formatAddress, formatNumber, formatTimeAgo, formatEther, getContractTypeColor } from '@/services/api';

interface SmartContractsTableProps {
  contracts: SmartContractSummary[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (items: number) => void;
  pagination?: {
    current_page: number;
    items_per_page: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  } | null;
}

const SmartContractsTable: React.FC<SmartContractsTableProps> = ({
  contracts,
  loading,
  error,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  pagination
}) => {
  const navigate = useNavigate();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleContractClick = (address: string) => {
    navigate(`/smart-contract/${address}`);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(text);
      console.log('Address copied to clipboard:', text);

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedAddress(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
      // Fallback method for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      setCopiedAddress(text);
      setTimeout(() => {
        setCopiedAddress(null);
      }, 2000);
    }
  };

  const getTypeColor = (type?: string) => {
    const colorClass = getContractTypeColor(type);
    switch (colorClass) {
      case 'blue':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700';
      case 'purple':
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700';
      case 'green':
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
      case 'orange':
        return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700';
      case 'red':
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
    }
  };

  if (error) {
    return (
      <div className="space-y-6 bg-slate-50 border-none">
        <Card className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700">
          <CardContent className="p-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Contracts</h3>
              <p className="text-gray-600 dark:text-gray-400">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 border-none">
      {/* Enhanced Summary Stats */}


      {/* Modern Table Card */}
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 border-b border-gray-200 dark:border-gray-700 py-4 px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Code className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              Smart Contracts
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Show</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 px-3 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white">
                    {itemsPerPage}
                    <ChevronDown className="ml-2 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-32 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <DropdownMenuItem onClick={() => setItemsPerPage(10)} className="cursor-pointer text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                    10 per page
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setItemsPerPage(25)} className="cursor-pointer text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                    25 per page
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setItemsPerPage(50)} className="cursor-pointer text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                    50 per page
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading contracts...</span>
            </div>
          ) : !contracts || contracts.length === 0 ? (
            <div className="text-center py-12">
              <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Contracts Found</h3>
              <p className="text-gray-600 dark:text-gray-400">No smart contracts match your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-indigo-100 dark:bg-indigo-900/30">
                          <Code className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <span>Contract</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span>Type</span>
                        <ChevronDown className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                      </div>
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                        <span>Verified</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                        <span>Transactions</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                        <span>Balance</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                        <span>Created</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6">Creator</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-4 px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract, index) => (
                    <TableRow
                      key={contract.address}
                      className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all duration-200 border-b border-gray-100 dark:border-gray-700 last:border-b-0 group animate-fade-in"
                      style={{
                        animationDelay: `${index * 0.05}s`,
                        animationFillMode: 'both'
                      }}
                    >
                      <TableCell className="py-4 px-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleContractClick(contract.address)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-mono text-sm font-medium transition-colors bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
                            >
                              {formatAddress(contract.address)}
                            </button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(contract.address)}
                              className={`h-6 w-6 p-0 transition-all duration-200 ${copiedAddress === contract.address
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              title={copiedAddress === contract.address ? "Copied!" : "Copy address"}
                            >
                              {copiedAddress === contract.address ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                              )}
                            </Button>
                          </div>
                          {contract.name && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{contract.name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium px-2.5 py-1 ${getTypeColor(contract.contract_type)} badge-modern`}
                        >
                          {contract.contract_type || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        {contract.is_verified ? (
                          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded-full w-fit">
                            <CheckCircle className="h-3 w-3" />
                            <span className="text-xs font-medium">Verified</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-1 rounded-full w-fit">
                            <XCircle className="h-3 w-3" />
                            <span className="text-xs font-medium">Unverified</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="font-mono text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
                          {formatNumber(contract.total_transactions)}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="font-mono text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
                          {formatEther(contract.balance)}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-900 dark:text-white">
                            {formatTimeAgo(Number(contract.creation_timestamp))}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Block #{formatNumber(contract.creation_block_number)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded font-mono">
                          {formatAddress(contract.creator_address)}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleContractClick(contract.address)}
                          className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30 opacity-0 group-hover:opacity-100 transition-all duration-200"
                        >
                          <ExternalLink className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
};

export default SmartContractsTable;
