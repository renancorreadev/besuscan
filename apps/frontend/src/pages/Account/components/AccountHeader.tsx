import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Copy,
  Wallet,
  Code,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { AccountDetails, AccountTag } from '../types';
import { formatAddress, getComplianceColor, getRiskScoreColor, copyToClipboard } from './utils';

interface AccountHeaderProps {
  account: AccountDetails;
  tags: AccountTag[];
}

export const AccountHeader: React.FC<AccountHeaderProps> = ({
  account,
  tags
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${account.is_contract ? 'bg-gradient-to-br from-purple-500 to-violet-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'} shadow-lg`}>
            {account.is_contract ? (
              <Code className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            ) : (
              <Wallet className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {account.label || 'Account Details'}
              </h1>
              <div className="flex flex-wrap gap-2">
                <Badge className={account.is_contract ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700' : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'}>
                  {account.account_type === 'Smart Account' ? 'Smart Account' :
                    account.is_contract ? 'Smart Contract' : 'EOA'}
                </Badge>
                {account.compliance_status && (
                  <Badge className={getComplianceColor(account.compliance_status)}>
                    {account.compliance_status === 'compliant' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {account.compliance_status === 'non_compliant' && <XCircle className="h-3 w-3 mr-1" />}
                    {account.compliance_status === 'under_review' && <Clock className="h-3 w-3 mr-1" />}
                    {account.compliance_status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                    {account.compliance_status.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm sm:text-base text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg">
                  {formatAddress(account.address)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(account.address)}
                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                  data-copy-button="true"
                  data-address={account.address}
                  aria-label="Copiar endereço"
                  title="Copiar endereço"
                >
                  <Copy className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                </Button>
              </div>
              {account.risk_score !== undefined && (
                <Badge variant="outline" className={`border-current ${getRiskScoreColor(account.risk_score)}`}>
                  Risk Score: {account.risk_score}/10
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600">
              {tag.tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}; 