import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  DollarSign,
  Activity,
  Zap,
  Clock
} from 'lucide-react';
import { AccountDetails } from '../types';
import { formatBalance, formatNumber, formatTimeAgo } from './utils';

interface AccountMetricsProps {
  account: AccountDetails;
}

export const AccountMetrics: React.FC<AccountMetricsProps> = ({
  account
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200/50 dark:border-blue-700/50">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">
              Balance
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-blue-900 dark:text-blue-100">
            {formatBalance(account.balance)}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200/50 dark:border-green-700/50">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300 uppercase tracking-wide">
              Transactions
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-green-900 dark:text-green-100">
            {formatNumber(account.transaction_count)}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200/50 dark:border-purple-700/50">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wide">
              Nonce
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-purple-900 dark:text-purple-100">
            {formatNumber(account.nonce)}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200/50 dark:border-orange-700/50">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-300 uppercase tracking-wide">
              Last Activity
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-orange-900 dark:text-orange-100">
            {account.last_activity_at ? formatTimeAgo(account.last_activity_at) : 'Never'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 