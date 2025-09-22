import React from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Code,
  Settings,
  Activity
} from 'lucide-react';

export const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'sent':
      return <ArrowUpRight className="h-4 w-4 text-red-500" />;
    case 'received':
      return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    case 'contract_call':
      return <Code className="h-4 w-4 text-purple-500" />;
    case 'contract_creation':
      return <Settings className="h-4 w-4 text-orange-500" />;
    default:
      return <Activity className="h-4 w-4 text-gray-500" />;
  }
}; 