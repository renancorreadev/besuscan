import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Terminal, Eye, Edit3, Code, CheckCircle } from 'lucide-react';

interface ContractNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  readFunctionsCount: number;
  writeFunctionsCount: number;
  eventsCount: number;
  isVerified: boolean;
}

export const ContractNavigation: React.FC<ContractNavigationProps> = ({
  activeTab,
  setActiveTab,
  readFunctionsCount,
  writeFunctionsCount,
  eventsCount,
  isVerified,
}) => {
  return (
    <Card className="lg:sticky lg:top-6 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg text-gray-900 dark:text-white">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
            <Terminal className="h-5 w-5 text-white" />
          </div>
          Contract Interface
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <button
            onClick={() => setActiveTab('read')}
            className={`w-full justify-start gap-3 p-3 sm:p-4 rounded-xl transition-all duration-300 flex items-center ${
              activeTab === 'read'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Eye className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium text-sm sm:text-base">Read Functions</div>
              <div className="text-xs opacity-80">Query contract state</div>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('write')}
            className={`w-full justify-start gap-3 p-3 sm:p-4 rounded-xl transition-all duration-300 flex items-center ${
              activeTab === 'write'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Edit3 className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium text-sm sm:text-base">Write Functions</div>
              <div className="text-xs opacity-80">Execute transactions</div>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`w-full justify-start gap-3 p-3 sm:p-4 rounded-xl transition-all duration-300 flex items-center ${
              activeTab === 'code'
                ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg'
                : 'hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Code className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium text-sm sm:text-base">Source Code</div>
              <div className="text-xs opacity-80">View contract code</div>
            </div>
          </button>
        </div>
        
        {/* Quick Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Read Functions</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">{readFunctionsCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Write Functions</span>
            <span className="font-semibold text-green-600 dark:text-green-400">{writeFunctionsCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Verified</span>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="font-semibold text-green-600 dark:text-green-400">
                {isVerified ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          {eventsCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Events</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">{eventsCount}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 