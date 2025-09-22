import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Copy, ExternalLink, AlertCircle, Hash, Activity, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import TransactionDetails from '@/components/transaction/TransactionDetails';
import { useTransactionDetails } from '@/hooks/useTransactions';

const Transaction = () => {
  const { hash } = useParams<{ hash: string }>();

  const {
    transaction,
    loading,
    error,
    fetchTransaction
  } = useTransactionDetails({ hash: hash || '', autoFetch: true });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  if (!hash) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">Invalid Transaction Hash</h3>
                <p className="text-red-700 dark:text-red-300">No transaction hash provided in the URL.</p>
              </div>
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

      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Enhanced Page Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-8 border border-blue-200 dark:border-blue-700">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="p-4 rounded-xl bg-blue-100 dark:bg-blue-900/30 shadow-sm">
                  <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                      Transaction Details
                    </h1>
                    <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      Besu Network
                    </Badge>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm lg:text-base">
                    Comprehensive transaction analysis for private blockchain networks
                  </p>
                </div>
              </div>

              {/* Transaction Hash Display */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Transaction Hash</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded border border-gray-200 dark:border-gray-600 flex-1 min-w-0 truncate lg:max-w-xs">
                    {hash}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(hash)}
                    className="h-8 w-8 p-0 flex-shrink-0 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            {transaction && !loading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-blue-200 dark:border-blue-700">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Status</span>
                  </div>
                  <Badge
                    className={
                      transaction.status === 'success'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : transaction.status === 'failed'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                    }
                  >
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </Badge>
                </div>

                {transaction.block_number && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Block</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      #{transaction.block_number.toLocaleString()}
                    </span>
                  </div>
                )}

                {transaction.mined_at && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Age</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {(() => {
                        const date = new Date(transaction.mined_at);
                        const now = new Date();
                        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

                        if (diffInMinutes < 1) return 'just now';
                        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
                        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
                        return `${Math.floor(diffInMinutes / 1440)}d ago`;
                      })()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transaction Details Component */}
          <TransactionDetails hash={hash} />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Transaction;
