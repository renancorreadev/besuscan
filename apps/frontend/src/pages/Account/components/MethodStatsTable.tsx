import React from 'react';
import { Loader2 } from 'lucide-react';
import { MethodStats } from '../types';
import { formatAddress, formatBalance, formatTimeAgo, formatNumber, getMethodBadgeClass } from './utils';

interface MethodStatsTableProps {
  methodStats: MethodStats[];
  loading: boolean;
}

export const MethodStatsTable: React.FC<MethodStatsTableProps> = ({
  methodStats,
  loading
}) => {
  return (
    <div className="glass-table-container">
      <table className="glass-table">
        <thead className="glass-table-header">
          <tr>
            <th>Method</th>
            <th>Contract</th>
            <th>Executions</th>
            <th>Success Rate</th>
            <th>Total Gas</th>
            <th>Avg Gas</th>
            <th>Value Sent</th>
            <th>Last Used</th>
          </tr>
        </thead>
        <tbody className="glass-table-body">
          {loading ? (
            <tr className="glass-table-row">
              <td colSpan={8} className="glass-table-cell text-center py-8">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-gray-500 dark:text-gray-400">Loading methods...</span>
                </div>
              </td>
            </tr>
          ) : methodStats.length === 0 ? (
            <tr className="glass-table-row">
              <td colSpan={8} className="glass-table-cell text-center py-8 text-gray-500 dark:text-gray-400">
                No method statistics found
              </td>
            </tr>
          ) : (
            methodStats.map((method) => {
              const successRate = method.execution_count > 0 ? (method.success_count / method.execution_count) * 100 : 0;
              return (
                <tr key={method.id} className="glass-table-row">
                  <td className="glass-table-cell">
                    <div className="space-y-2">
                      <span className={`method-badge ${getMethodBadgeClass(method.method_name)}`}>
                        {method.method_name}
                      </span>
                      {method.method_signature && (
                        <div className="text-xs font-mono text-gray-500 dark:text-gray-400">
                          {method.method_signature}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="glass-table-cell">
                    {method.contract_name ? (
                      <div className="space-y-1">
                        <div className="font-medium">{method.contract_name}</div>
                        {method.contract_address && (
                          <div className="address-display text-xs">
                            {formatAddress(method.contract_address)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">ETH Transfer</span>
                    )}
                  </td>
                  <td className="glass-table-cell">
                    <div className="space-y-1">
                      <div className="font-bold text-lg">{formatNumber(method.execution_count)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ✅ {method.success_count} | ❌ {method.failed_count}
                      </div>
                    </div>
                  </td>
                  <td className="glass-table-cell">
                    <div className="space-y-1">
                      <div className={`font-bold ${successRate >= 90 ? 'text-green-600 dark:text-green-400' : successRate >= 70 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                        {successRate.toFixed(1)}%
                      </div>
                      <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${successRate >= 90 ? 'bg-green-500' : successRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${successRate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="glass-table-cell">
                    <div className="value-display value-display-neutral">
                      {formatNumber(method.total_gas_used)}
                    </div>
                  </td>
                  <td className="glass-table-cell">
                    <div className="value-display value-display-neutral">
                      {formatNumber(method.avg_gas_used)}
                    </div>
                  </td>
                  <td className="glass-table-cell">
                    <div className="value-display value-display-positive">
                      {method.total_value_sent !== '0' ? formatBalance(method.total_value_sent) : '0 ETH'}
                    </div>
                  </td>
                  <td className="glass-table-cell">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {formatTimeAgo(method.last_executed_at)}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}; 