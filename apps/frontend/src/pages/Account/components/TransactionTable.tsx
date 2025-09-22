import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Loader2 } from 'lucide-react';
import { AccountTransaction } from '../types';
import { formatAddress, formatBalance, formatTimeAgo, formatNumber, copyToClipboard, getMethodBadgeClass } from './utils';
import { getTransactionIcon } from './TransactionIcons';

interface TransactionTableProps {
  transactions: AccountTransaction[];
  loading: boolean;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  loading
}) => {
  return (
    <div className="glass-table-container">
      <table className="glass-table">
        <thead className="glass-table-header">
          <tr>
            <th>Type</th>
            <th>Hash</th>
            <th>Method</th>
            <th>From/To</th>
            <th>Value</th>
            <th>Gas</th>
            <th>Status</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody className="glass-table-body">
          {loading ? (
            <tr className="glass-table-row">
              <td colSpan={8} className="glass-table-cell text-center py-8">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-gray-500 dark:text-gray-400">Loading transactions...</span>
                </div>
              </td>
            </tr>
          ) : transactions.length === 0 ? (
            <tr className="glass-table-row">
              <td colSpan={8} className="glass-table-cell text-center py-8 text-gray-500 dark:text-gray-400">
                No transactions found
              </td>
            </tr>
          ) : (
            transactions.map((tx) => (
              <tr key={tx.id} className="glass-table-row">
                <td className="glass-table-cell">
                  <div className="transaction-type-container">
                    <div className={`transaction-icon transaction-icon-${tx.transaction_type}`}>
                      {getTransactionIcon(tx.transaction_type)}
                    </div>
                    {tx.contract_type ? (
                      <div className="transaction-type-label">
                        {tx.contract_type}
                      </div>
                    ) : (
                      <div className="transaction-type-label">
                        {tx.transaction_type.replace('_', ' ')}
                      </div>
                    )}
                  </div>
                </td>
                <td className="glass-table-cell">
                  <div className="address-display">
                    <span>{formatAddress(tx.transaction_hash)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(tx.transaction_hash)}
                      className="glass-action-button h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
                <td className="glass-table-cell">
                  {tx.method_name ? (
                    <span className={`method-badge ${getMethodBadgeClass(tx.method_name)}`}>
                      {tx.method_name}
                    </span>
                  ) : (
                    <span className="glass-badge-neutral">ETH Transfer</span>
                  )}
                </td>
                <td className="glass-table-cell">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400">From:</div>
                    <div className="address-display text-xs">
                      {formatAddress(tx.from_address)}
                    </div>
                    {tx.to_address && (
                      <>
                        <div className="text-xs text-gray-500 dark:text-gray-400">To:</div>
                        <div className="address-display text-xs">
                          {formatAddress(tx.to_address)}
                        </div>
                      </>
                    )}
                  </div>
                </td>
                <td className="glass-table-cell">
                  <div className={`value-display ${tx.value !== '0' ? 'value-display-positive' : 'value-display-neutral'}`}>
                    {tx.value !== '0' ? formatBalance(tx.value) : '0 ETH'}
                  </div>
                </td>
                <td className="glass-table-cell">
                  <div className="text-xs space-y-1">
                    <div>Limit: {formatNumber(tx.gas_limit)}</div>
                    {tx.gas_used && (
                      <div className="text-gray-500">Used: {formatNumber(tx.gas_used)}</div>
                    )}
                  </div>
                </td>
                <td className="glass-table-cell">
                  <span className={`glass-badge ${tx.status === 'success' ? 'glass-badge-success' : tx.status === 'failed' ? 'glass-badge-error' : 'glass-badge-warning'}`}>
                    {tx.status}
                  </span>
                </td>
                <td className="glass-table-cell">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formatTimeAgo(tx.timestamp)}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}; 