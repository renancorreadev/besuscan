import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink, Clock, CheckCircle, ChevronDown, ChevronUp, Activity, Send, ArrowRight, Zap, FileText, DollarSign, Hash, User, Shield, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useTransactionDetails } from '@/hooks/useTransactions';
import { useDecodeInputData } from '@/hooks/useDecodeInputData';

import { getTransactionTypeLabel } from '@/services/api';

interface TransactionDetailsProps {
  hash: string;
}

interface EnhancedTransactionData {
  hash: string;
  block_number: number;
  block_hash: string;
  transaction_index: number;
  from: string;
  to: string;
  value: number;
  gas: number;
  gas_price: number;
  gas_used: number;
  max_fee_per_gas: number | null;
  max_priority_fee_per_gas: number | null;
  nonce: number;
  data: string;
  status: string;
  contract_address: string | null;
  type: number;
  method: string;
  method_type: string;
  created_at: string;
  updated_at: string;
  mined_at: string;
}

interface TransactionEvent {
  id: string;
  transaction_hash: string;
  block_number: number;
  block_hash: string;
  log_index: number;
  contract_address: string;
  contract_name?: string;
  event_name: string;
  event_signature: string;
  topics: string[];
  data: string;
  decoded_data?: any;
  from_address: string;
  to_address?: string;
  timestamp: number;
  status: string;
  method?: string;
  gas_used?: number;
  gas_price: string;
  transaction_index: number;
  removed: boolean;
}



const TransactionDetails = ({ hash }: TransactionDetailsProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [enhancedData, setEnhancedData] = useState<EnhancedTransactionData | null>(null);
  const [enhancedLoading, setEnhancedLoading] = useState(false);
  const [enhancedError, setEnhancedError] = useState<string | null>(null);
  const [events, setEvents] = useState<TransactionEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const { transaction, loading, error } = useTransactionDetails({
    hash,
    autoFetch: true
  });

  // Decode input data using ABI
  const contractAddress = transaction?.to_address || (transaction as any)?.to;
  console.log('TransactionDetails: Contract address for ABI:', contractAddress);
  console.log('TransactionDetails: Transaction data:', transaction?.data?.substring(0, 50) + '...');

  // Usar o nome da função que já temos na transação
  const functionName = transaction?.method || 'unknown';
  console.log('TransactionDetails: Function name from transaction:', functionName);

  const { decodedData, loading: inputDecodingLoading, error: inputDecodingError } = useDecodeInputData(
    transaction?.data,
    contractAddress,
    functionName
  );

  // Function to fetch enhanced transaction data from new API
  const fetchEnhancedData = async () => {
    if (!hash) return;

    setEnhancedLoading(true);
    setEnhancedError(null);

    try {
      const response = await fetch(`/api/events/${hash}-0`, {
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setEnhancedData(result.data);
      } else {
        setEnhancedError('No enhanced data available');
      }
    } catch (err) {
      setEnhancedError(err instanceof Error ? err.message : 'Failed to fetch enhanced data');
    } finally {
      setEnhancedLoading(false);
    }
  };

  // Function to fetch transaction events - ONLY for this specific transaction
  const fetchTransactionEvents = async () => {
    if (!hash) return;

    setEventsLoading(true);

    try {
      // Strategy: Try individual event endpoints first since we know the pattern
      const eventsArray: TransactionEvent[] = [];

      // Try to fetch events with log indexes 0, 1, 2, etc. until we don't find any more
      for (let logIndex = 0; logIndex < 20; logIndex++) {
        try {
          const eventUrl = `/api/events/${hash}-${logIndex}`;

          const response = await fetch(eventUrl, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const result = await response.json();

            if (result.success && result.data) {
              // Double check that this event belongs to our transaction
              if (result.data.transaction_hash.toLowerCase() === hash.toLowerCase()) {
                eventsArray.push(result.data);
              }
            }
          } else {
            // If we get 404 or error, probably no more events with this log index
            break;
          }
        } catch (e) {
          // Error fetching this specific event, try next one
          continue;
        }
      }

      // If no events found with individual approach, try the general API with strict filtering
      if (eventsArray.length === 0) {
        try {
          const response = await fetch(`/api/events?limit=100`, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const result = await response.json();

            if (result.success && result.data && Array.isArray(result.data)) {
              // Strictly filter only events from this exact transaction
              const filteredEvents = result.data.filter((event: any) =>
                event.transaction_hash &&
                event.transaction_hash.toLowerCase() === hash.toLowerCase()
              );
              eventsArray.push(...filteredEvents);
            }
          }
        } catch (generalErr) {
          console.error('Failed to fetch events from general API:', generalErr);
        }
      }

      // Sort events by log_index to maintain order
      eventsArray.sort((a, b) => (a.log_index || 0) - (b.log_index || 0));

      setEvents(eventsArray);

    } catch (err) {
      console.error('Failed to fetch transaction events:', err);
      setEvents([]); // Clear events on error
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnhancedData();
    fetchTransactionEvents();
  }, [hash]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };



  // Improved parameter detection function
  const decodeEnhancedInputData = (base64Data: string, method: string) => {
    if (!base64Data || !method) return null;

    try {
      // Decode base64 to binary, then convert to hex
      const binaryString = atob(base64Data);
      const hexData = '0x' + Array.from(binaryString)
        .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');

      if (hexData.length <= 10) return null;

      // Extract method signature (first 4 bytes = 8 hex chars after 0x)
      const methodSignature = hexData.slice(0, 10);
      const parametersHex = hexData.slice(10);

      if (parametersHex.length === 0) return null;

      // Decode parameters with VERY strict address detection
      const parameters = [];

      // Split parameters into 32-byte chunks (64 hex chars each)
      for (let i = 0; i < parametersHex.length; i += 64) {
        const chunk = parametersHex.slice(i, i + 64);
        if (chunk.length === 64) {
          const hexValue = '0x' + chunk;
          const decimalValue = BigInt('0x' + chunk);

          // Default to uint256
          let paramType = 'uint256';
          let paramValue = decimalValue.toString();

          // EXTREMELY strict address detection
          if (chunk.startsWith('000000000000000000000000') && chunk.length === 64) {
            const addressPart = chunk.slice(24);
            const address = '0x' + addressPart;

            // Address criteria - ALL must be true:
            // 1. Not zero address
            // 2. Contains at least 4 hex letters (A-F)
            // 3. Doesn't end with 8+ zeros (typical token amount pattern)
            // 4. Doesn't represent a very large token amount
            // 5. Has mixed case or typical address pattern
            const hexLetters = (addressPart.match(/[a-fA-F]/g) || []).length;
            const notZeroAddress = address !== '0x0000000000000000000000000000000000000000';
            const endsWithManyZeros = addressPart.match(/0{8,}$/);
            const isTokenAmount = decimalValue > BigInt('1000000000000000000'); // > 1 token (18 decimals)
            const hasTypicalAddressPattern = /[a-fA-F].*[0-9]|[0-9].*[a-fA-F]/.test(addressPart);

            // Only treat as address if ALL criteria match
            if (notZeroAddress &&
                hexLetters >= 4 &&
                !endsWithManyZeros &&
                !isTokenAmount &&
                hasTypicalAddressPattern) {
              paramType = 'address';
              paramValue = address;
            }
          }

          // Format uint256 values for better display
          if (paramType === 'uint256') {
            const value = BigInt(paramValue);
            if (value > BigInt('1000000000000000000')) { // > 1 ETH in wei
              const ethValue = Number(value) / 1e18;
              paramValue = `${value.toLocaleString()} (${ethValue.toFixed(6)} tokens)`;
            } else {
              paramValue = value.toLocaleString();
            }
          }

          parameters.push({
            type: paramType,
            value: paramValue,
            raw: hexValue
          });
        }
      }

      return {
        method,
        methodSignature,
        parameters,
        originalData: base64Data,
        decodedHex: hexData
      };
    } catch (error) {
      console.error('Error decoding enhanced data:', error);
      return null;
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    let timeAgo = '';
    if (diffInMinutes < 1) {
      timeAgo = 'just now';
    } else if (diffInMinutes < 60) {
      timeAgo = `${diffInMinutes} min${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      timeAgo = `${days} day${days > 1 ? 's' : ''} ago`;
    }

    return `${date.toLocaleString()} (${timeAgo})`;
  };

  const formatAddress = (address: string | null) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 mr-1" />;
      case 'pending':
        return <Clock className="h-3 w-3 mr-1" />;
      default:
        return <AlertCircle className="h-3 w-3 mr-1" />;
    }
  };

  const getEventTypeColor = (eventName: string): string => {
    const name = eventName.toLowerCase();
    if (name.includes('transfer')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700';
    if (name.includes('approval')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700';
    if (name.includes('mint')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-700';
    if (name.includes('burn')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700';
    if (name.includes('swap')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-700';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity className="h-4 w-4" /> },
    { id: 'input', label: 'Input Data', icon: <FileText className="h-4 w-4" />, count: transaction?.data && transaction.data !== '0x' ? 1 : 0 },
    { id: 'events', label: 'Events', icon: <Zap className="h-4 w-4" />, count: events.length },
    { id: 'logs', label: 'Raw Logs', icon: <FileText className="h-4 w-4" /> },
    { id: 'state', label: 'State Changes', icon: <ArrowRight className="h-4 w-4" /> }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600 dark:text-gray-400">Loading transaction details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">Error Loading Transaction</h3>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">Transaction Not Found</h3>
            <p className="text-yellow-700 dark:text-yellow-300">The requested transaction could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Transaction Status Header */}
      <div className={`rounded-xl p-6 border ${
        transaction.status === 'success'
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700/50'
          : transaction.status === 'failed'
          ? 'bg-gradient-to-r from-red-50 to-red-50 dark:from-red-900/20 dark:to-red-900/20 border-red-200 dark:border-red-700/50'
          : 'bg-gradient-to-r from-yellow-50 to-yellow-50 dark:from-yellow-900/20 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-700/50'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${
            transaction.status === 'success'
              ? 'bg-green-100 dark:bg-green-900/30'
              : transaction.status === 'failed'
              ? 'bg-red-100 dark:bg-red-900/30'
              : 'bg-yellow-100 dark:bg-yellow-900/30'
          }`}>
            {transaction.status === 'success' && <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />}
            {transaction.status === 'failed' && <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />}
            {transaction.status === 'pending' && <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge className={getStatusColor(transaction.status)}>
                {getStatusIcon(transaction.status)}
                {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
              </Badge>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Transaction {transaction.status === 'success' ? 'completed successfully' : transaction.status === 'failed' ? 'failed' : 'is pending'}
              </span>
              {events.length > 0 && (
                <Badge variant="outline" className="text-xs text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
                  {events.length} event{events.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {transaction.method && (
                <>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{transaction.method}</span>
                  {' - '}
                </>
              )}
              Transfer <span className="font-semibold text-gray-900 dark:text-white">{(transaction as any).value || '0'} ETH</span>
              {(transaction as any).to && (
                <>
                  {' to '}
                  <span className="text-blue-600 dark:text-blue-400 font-mono">{formatAddress((transaction as any).to)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs Navigation */}
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all duration-200 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <Badge variant="secondary" className="text-xs ml-1 text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">

            {/* Transaction Hash */}
            <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Transaction Hash:</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">
                  {formatAddress(transaction.hash)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(transaction.hash)}
                  className="h-8 w-8 p-0 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
              </div>
              <Badge className={getStatusColor(transaction.status)}>
                {getStatusIcon(transaction.status)}
                {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
              </Badge>
            </div>

            {/* Block */}
            {transaction.block_number && (
              <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Block:</span>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    to={`/block/${transaction.block_number}`}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                  >
                    {transaction.block_number.toLocaleString()}
                  </Link>
                  {transaction.transaction_index !== null && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      Position: {transaction.transaction_index}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* From */}
            <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">From:</span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to={`/account/${transaction.from_address || (transaction as any).from}`}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-mono text-sm transition-colors"
                >
                  {formatAddress(transaction.from_address || (transaction as any).from)}
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(transaction.from_address || (transaction as any).from)}
                  className="h-8 w-8 p-0 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* To */}
            {(transaction.to_address || (transaction as any).to) && (
              <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">To:</span>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    to={`/account/${transaction.to_address || (transaction as any).to}`}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-mono text-sm transition-colors"
                  >
                    {formatAddress(transaction.to_address || (transaction as any).to)}
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(transaction.to_address || (transaction as any).to)}
                    className="h-8 w-8 p-0 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Value */}
            <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Value:</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {transaction.value || (transaction as any).value || '0'} ETH
                </span>
              </div>
            </div>

            {/* Gas Used */}
            {(transaction.gas_used || (transaction as any).gas_used) && (
              <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Gas Used:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {(transaction.gas_used || (transaction as any).gas_used).toLocaleString()}
                  </span>
                  {(transaction.gas_limit || (transaction as any).gas) && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      / {(transaction.gas_limit || (transaction as any).gas).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced Method Decoding */}
            {(() => {
              let decodedInput = null;
              let isEnhanced = false;

              if (enhancedData && enhancedData.data && enhancedData.method) {
                decodedInput = decodeEnhancedInputData(enhancedData.data, enhancedData.method);
                isEnhanced = true;
              }

              return decodedInput && decodedInput.parameters.length > 0 ? (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-l-4 border-blue-500">
                  <div className="px-6 py-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-lg font-semibold text-blue-900 dark:text-blue-100">Method Parameters</span>
                      <Badge variant="default" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700">
                        Enhanced
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      {/* Method Signature */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Method Signature:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(decodedInput.methodSignature)}
                            className="h-6 w-6 p-0 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <code className="font-mono text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 px-3 py-2 rounded border">
                          {decodedInput.methodSignature}
                        </code>
                      </div>

                      {/* Decoded Hex */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Decoded from Base64:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(decodedInput.decodedHex)}
                            className="h-6 w-6 p-0 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <code className="font-mono text-xs bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded border break-all block">
                          {decodedInput.decodedHex}
                        </code>
                      </div>

                      {/* Parameters */}
                      <div className="space-y-3">
                        {decodedInput.parameters.map((param, index) => (
                          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Parameter {index + 1}
                                  </span>
                                  <Badge
                                    variant={param.type === 'address' ? 'default' : 'secondary'}
                                    className={`text-xs ${
                                      param.type === 'address'
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                                        : 'text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                                    }`}
                                  >
                                    {param.type}
                                  </Badge>
                                </div>
                                <div className="font-mono text-sm text-gray-900 dark:text-white break-all bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded">
                                  {param.type === 'address' ? (
                                    <Link
                                      to={`/account/${param.value}`}
                                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                    >
                                      {param.value}
                                    </Link>
                                  ) : (
                                    param.value
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(param.value)}
                                className="h-8 w-8 p-0 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {/* More Details Toggle */}
            <div className="px-6 py-4">
              <Button
                variant="ghost"
                onClick={() => setShowMoreDetails(!showMoreDetails)}
                className="w-full flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
              >
                {showMoreDetails ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Show Less Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show More Details
                  </>
                )}
              </Button>
            </div>

            {/* Additional Details */}
            {showMoreDetails && (
              <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {/* Timestamp */}
                {transaction.mined_at && (
                  <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Timestamp:</span>
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white">{formatTimestamp(transaction.mined_at)}</span>
                  </div>
                )}

                {/* Transaction Type */}
                <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Transaction Type:</span>
                  <Badge variant="outline" className="text-xs text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
                    {getTransactionTypeLabel(transaction.type)}
                  </Badge>
                </div>

                {/* Nonce */}
                <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Nonce:</span>
                  <span className="text-sm text-gray-900 dark:text-white">{transaction.nonce}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Data Tab */}
        {activeTab === 'input' && (
          <div className="p-6">
            {inputDecodingLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <span className="text-gray-600 dark:text-gray-400">Decoding input data...</span>
                </div>
              </div>
            ) : inputDecodingError ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">Error Decoding Input Data</h3>
                    <p className="text-red-700 dark:text-red-300">{inputDecodingError}</p>
                  </div>
                </div>
              </div>
            ) : !transaction?.data || transaction.data === '0x' ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Input Data</h3>
                <p className="text-gray-600 dark:text-gray-400">This transaction has no input data to decode.</p>
              </div>
            ) : decodedData ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Transaction Input Data</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Decoded parameters sent to the smart contract
                    </p>
                  </div>
                </div>

                {/* Method Information */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Method Information</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Method Signature</label>
                        <div className="mt-1">
                          <code className="font-mono text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded border">
                            {decodedData.methodSignature}
                          </code>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Method Name</label>
                        <div className="mt-1">
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {functionName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decoded Parameters Table */}
                {decodedData.parameters.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Decoded Parameters</h3>
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700">
                          {decodedData.parameters.length} parameter{decodedData.parameters.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-700/50">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              #
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Data
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {decodedData.parameters.map((param, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {index}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {param.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge
                                  variant="outline"
                                  className={`font-mono text-xs ${
                                    param.type === 'address'
                                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700'
                                      : param.type.includes('uint') || param.type.includes('int')
                                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                                      : param.type === 'string'
                                      ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700'
                                      : param.type === 'bool'
                                      ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700'
                                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                                  }`}
                                >
                                  {param.type}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                <div className="max-w-md">
                                  {param.type === 'address' ? (
                                    <div className="flex items-center gap-2">
                                      <Link
                                        to={`/account/${param.formattedValue}`}
                                        className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-blue-600 dark:text-blue-400 hover:underline"
                                      >
                                        {param.formattedValue}
                                      </Link>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(param.formattedValue)}
                                        className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
                                        title="Copiar endereço"
                                      >
                                        <Copy className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                      </Button>
                                    </div>
                                  ) : param.type === 'string' ? (
                                    <div className="space-y-1">
                                      <div className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded break-all">
                                        {param.formattedValue}
                                      </div>
                                      {param.additionalInfo && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {param.additionalInfo}
                                        </div>
                                      )}
                                    </div>
                                  ) : param.type === 'bool' ? (
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant={param.formattedValue === 'true' ? 'default' : 'secondary'}
                                        className={param.formattedValue === 'true'
                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700'
                                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                                        }
                                      >
                                        {param.formattedValue}
                                      </Badge>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <div className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded break-all">
                                        {param.formattedValue}
                                      </div>
                                      {param.additionalInfo && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {param.additionalInfo}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Raw Data */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Raw Data</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Original Input Data</label>
                      <div className="mt-1">
                        <code className="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded border break-all block max-h-32 overflow-y-auto">
                          {transaction.data}
                        </code>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Decoded Hex</label>
                      <div className="mt-1">
                        <code className="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded border break-all block max-h-32 overflow-y-auto">
                          {decodedData.decodedHex}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Unable to Decode Input Data</h3>
                <p className="text-gray-600 dark:text-gray-400">The input data could not be decoded.</p>
              </div>
            )}
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="p-6">
            {eventsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <span className="text-gray-600 dark:text-gray-400">Loading events...</span>
                </div>
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Transaction Events</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Smart contract events generated during transaction execution
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-sm text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                    {events.length} event{events.length > 1 ? 's' : ''}
                  </Badge>
                </div>

                {events.map((event, index) => (
                  <div key={event.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    {/* Event Header */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 px-6 py-4 border-b border-purple-200 dark:border-purple-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                            <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={`text-sm font-medium ${getEventTypeColor(event.event_name)}`}>
                              {event.event_name}
                            </Badge>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-mono">Log #{event.log_index}</span>
                              {event.contract_name && (
                                <>
                                  <span>•</span>
                                  <span className="font-medium text-gray-700 dark:text-gray-300">{event.contract_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Link
                          to={`/event/${event.transaction_hash}-${event.log_index}`}
                          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium bg-white/50 dark:bg-gray-800/50 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                        >
                          View Details
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>

                    {/* Event Content */}
                    <div className="p-6">
                      {/* Decoded Data Section - Enhanced for Transfer events */}
                      {event.decoded_data && event.event_name === 'Transfer' && (
                        <div className="mb-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                              <Send className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="text-lg font-semibold text-green-800 dark:text-green-300">Transfer Details</span>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            {/* From Address */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                              <label className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 block">From Address</label>
                              <div className="flex items-center gap-2">
                                <Link
                                  to={`/account/${event.decoded_data.from}`}
                                  className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:underline break-all flex-1"
                                >
                                  {event.decoded_data.from === '0x0000000000000000000000000000000000000000' ? (
                                    <span className="text-gray-500 dark:text-gray-400">Zero Address (Mint)</span>
                                  ) : (
                                    event.decoded_data.from
                                  )}
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(event.decoded_data.from)}
                                  className="h-7 w-7 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
                                  title="Copiar endereço"
                                >
                                  <Copy className="h-3 w-3 text-green-600 dark:text-green-400" />
                                </Button>
                              </div>
                            </div>

                            {/* To Address */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                              <label className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 block">To Address</label>
                              <div className="flex items-center gap-2">
                                <Link
                                  to={`/account/${event.decoded_data.to}`}
                                  className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:underline break-all flex-1"
                                >
                                  {event.decoded_data.to}
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(event.decoded_data.to)}
                                  className="h-7 w-7 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
                                  title="Copiar endereço"
                                >
                                  <Copy className="h-3 w-3 text-green-600 dark:text-green-400" />
                                </Button>
                              </div>
                            </div>

                            {/* Value */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                              <label className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 block">Value</label>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-gray-900 dark:text-white break-all">
                                  {(() => {
                                    try {
                                      const value = BigInt(event.decoded_data.value);
                                      const tokenValue = Number(value) / 1e18;
                                      if (tokenValue > 0.000001) {
                                        return `${tokenValue.toFixed(6)} tokens`;
                                      } else if (value > 0n) {
                                        return `${value.toString()} wei`;
                                      } else {
                                        return '0 tokens';
                                      }
                                    } catch {
                                      return event.decoded_data.value || 'Unknown';
                                    }
                                  })()}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(event.decoded_data.value)}
                                  className="h-7 w-7 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
                                  title="Copiar valor"
                                >
                                  <Copy className="h-3 w-3 text-green-600 dark:text-green-400" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Contract Information */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Contract Address</label>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/smart-contract/${event.contract_address}`}
                              className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:underline break-all flex-1"
                            >
                              {event.contract_address}
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(event.contract_address)}
                              className="h-7 w-7 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
                              title="Copiar endereço do contrato"
                            >
                              <Copy className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                            </Button>
                          </div>
                        </div>

                        {event.from_address && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">From Address</label>
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/account/${event.from_address}`}
                                className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:underline break-all flex-1"
                              >
                                {event.from_address}
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(event.from_address)}
                                className="h-7 w-7 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
                                title="Copiar endereço"
                              >
                                <Copy className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {event.to_address && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">To Address</label>
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/account/${event.to_address}`}
                                className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:underline break-all flex-1"
                              >
                                {event.to_address}
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(event.to_address)}
                                className="h-7 w-7 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
                                title="Copiar endereço"
                              >
                                <Copy className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                                            {/* Topics Section */}
                      {event.topics && event.topics.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Hash className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Event Topics</span>
                            <Badge variant="outline" className="text-xs text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
                              {event.topics.length} topic{event.topics.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>

                          <div className="space-y-3">
                            {event.topics.map((topic, topicIndex) => (
                              <div key={topicIndex} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className="text-xs text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 min-w-[40px]">
                                    [{topicIndex}]
                                  </Badge>
                                  <code className="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded border flex-1 break-all">
                                    {topic}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(topic)}
                                    className="h-7 w-7 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
                                    title="Copiar topic"
                                  >
                                    <Copy className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Events Found</h3>
                <p className="text-gray-600 dark:text-gray-400">This transaction did not generate any events.</p>
              </div>
            )}
          </div>
        )}

        {/* Raw Logs Tab */}
        {activeTab === 'logs' && (
          <div className="p-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Raw Transaction Logs</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Raw log data will be displayed here when available
              </p>
            </div>
          </div>
        )}

        {/* State Changes Tab */}
        {activeTab === 'state' && (
          <div className="p-6">
            <div className="text-center py-8">
              <ArrowRight className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">State Changes</h3>
              <p className="text-gray-600 dark:text-gray-400">State change analysis for Besu private networks</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TransactionDetails;
