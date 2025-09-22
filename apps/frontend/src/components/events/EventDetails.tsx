import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Clock, Hash, Building2, Activity, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEventDetails } from '@/hooks/useEvents';
import { useDecodeEventData } from '@/hooks/useDecodeEventData';
import { formatHash, formatAddress, formatTimeAgo } from '@/services/api';

interface EventDetailsProps {
  id: string;
}

const EventDetails: React.FC<EventDetailsProps> = ({ id }) => {
  const {
    event,
    loading,
    error,
    fetchEvent
  } = useEventDetails({ id, autoFetch: true });

  const [enhancedData, setEnhancedData] = useState<any>(null);
  const [loadingEnhanced, setLoadingEnhanced] = useState(false);

    // Decode event data using ABI
  // Extrair apenas os dados hex do enhanced data ou event data
  let eventData;
  if (enhancedData?.data?.decoded_data?.data) {
    // Usar decoded_data.data que já está em hex
    eventData = enhancedData.data.decoded_data.data;
  } else if (enhancedData?.data?.data) {
    // Usar data que está em base64, converter para hex
    try {
      const binaryString = atob(enhancedData.data.data);
      let hexString = '0x';
      for (let i = 0; i < binaryString.length; i++) {
        const hex = binaryString.charCodeAt(i).toString(16).padStart(2, '0');
        hexString += hex;
      }
      eventData = hexString;
    } catch (e) {
      console.error('Failed to convert base64 to hex:', e);
      eventData = enhancedData.data.data;
    }
  } else {
    eventData = event?.data;
  }

  console.log('Event data being passed to hook:', {
    eventName: event?.event_name,
    eventSignature: event?.event_signature,
    topics: event?.topics,
    rawData: eventData,
    contractAddress: event?.contract_address,
    enhancedDataAvailable: !!enhancedData?.data,
    dataType: typeof eventData,
    dataLength: eventData?.length
  });

  const { decodedData, loading: eventDecodingLoading, error: eventDecodingError } = useDecodeEventData(
    event?.event_name,
    event?.event_signature,
    event?.topics,
    eventData,
    event?.contract_address
  );

  // Debug logs para entender o que está acontecendo
  console.log('useDecodeEventData result:', {
    decodedData,
    eventDecodingLoading,
    eventDecodingError,
    hasDecodedData: !!decodedData,
    parametersCount: decodedData?.parameters?.length || 0
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Fetch enhanced event data
  useEffect(() => {
    if (event && event.transaction_hash && event.log_index !== undefined) {
      const fetchEnhancedData = async () => {
        setLoadingEnhanced(true);
        try {
          const response = await fetch(`/api/events/${event.transaction_hash}-${event.log_index}`);
          if (response.ok) {
            const data = await response.json();
            setEnhancedData(data);
          }
        } catch (error) {
          console.error('Failed to fetch enhanced event data:', error);
        } finally {
          setLoadingEnhanced(false);
        }
      };
      fetchEnhancedData();
    }
  }, [event]);

  // Decode enhanced input data
  const decodeEnhancedInputData = (base64Data: string) => {
    try {
      // Decode base64 to hex
      const binaryString = atob(base64Data);
      let hexString = '0x';
      for (let i = 0; i < binaryString.length; i++) {
        const hex = binaryString.charCodeAt(i).toString(16).padStart(2, '0');
        hexString += hex;
      }

      if (hexString.length < 10) return null;

      // Extract method signature (first 4 bytes)
      const methodSignature = hexString.slice(0, 10);

      // Extract parameters (remaining bytes)
      const paramData = hexString.slice(10);

      if (paramData.length === 0) return { methodSignature, parameters: [] };

      // Split into 32-byte chunks
      const parameters = [];
      for (let i = 0; i < paramData.length; i += 64) {
        const chunk = paramData.slice(i, i + 64);
        if (chunk.length === 64) {
          const decimalValue = BigInt('0x' + chunk);
          let paramType = 'uint256';
          let paramValue = decimalValue.toString();

          // Check if it's likely an address
          if (chunk.startsWith('000000000000000000000000') && chunk.length === 64) {
            const addressPart = chunk.slice(24);
            const address = '0x' + addressPart;

            // Much more strict address detection:
            // 1. Not zero address
            // 2. Contains multiple hex letters (not just numbers)
            // 3. Has typical address checksum patterns
            // 4. Not a typical token amount pattern
            const hasMultipleHexLetters = (addressPart.match(/[a-fA-F]/g) || []).length >= 3;
            const notZeroAddress = address !== '0x0000000000000000000000000000000000000000';
            const looksLikeAddress = addressPart.match(/^[0-9a-fA-F]{40}$/);

            // Exclude common token amount patterns (like values ending in many zeros)
            const endsWithManyZeros = addressPart.match(/0{8,}$/); // 8 or more trailing zeros
            const isVeryLargeNumber = decimalValue > BigInt('1000000000000000000000'); // > 1000 tokens (18 decimals)

            // Only treat as address if it has address-like characteristics and isn't a token amount
            if (notZeroAddress && hasMultipleHexLetters && looksLikeAddress && !endsWithManyZeros && !isVeryLargeNumber) {
              paramType = 'address';
              paramValue = address;
            }
          }

          // Format large numbers for better readability
          if (paramType === 'uint256') {
            const value = BigInt(paramValue);
            if (value > BigInt('1000000000000000000')) { // > 1 ETH in wei
              const ethValue = Number(value) / 1e18;
              paramValue = `${paramValue} (${ethValue.toFixed(6)} tokens)`;
            } else {
              paramValue = value.toLocaleString();
            }
          }

          parameters.push({
            type: paramType,
            value: paramValue,
            raw: '0x' + chunk
          });
        }
      }

      return {
        methodSignature,
        parameters,
        fullHex: hexString
      };
    } catch (error) {
      console.error('Error decoding enhanced input data:', error);
      return null;
    }
  };

  const getEventTypeColor = (eventName: string): string => {
    const name = eventName.toLowerCase();
    if (name.includes('transfer')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    if (name.includes('approval')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    if (name.includes('mint')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    if (name.includes('burn')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    if (name.includes('swap')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600 dark:text-purple-400" />
          <span className="text-gray-600 dark:text-gray-400">Loading event details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Event</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={fetchEvent} variant="outline" className="text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Event Not Found</h3>
          <p className="text-gray-600 dark:text-gray-400">The requested event could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Event Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 sm:p-6 border border-purple-200 dark:border-purple-700">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30 w-fit">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                <Badge className={getEventTypeColor(event.event_name)}>
                   {event.event_name}
                 </Badge>
                <span className="text-sm text-gray-600 dark:text-gray-400">Event</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  Log Index: {event.log_index}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-purple-200 dark:border-purple-700">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>{formatTimeAgo(Number(event.timestamp) * 1000)}</span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Block #{event.block_number.toLocaleString()}
            </div>
          </div>
        </div>
      </div>



      {/* Event Data */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Hash className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          Event Data
        </h3>

        <div className="space-y-4">
          {/* Enhanced Method Decoding */}
          {enhancedData && enhancedData.input_data && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Method Signature</label>
                <Badge variant="secondary" className="text-xs text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700">Enhanced</Badge>
              </div>

              {(() => {
                const decodedData = decodeEnhancedInputData(enhancedData.input_data);
                if (!decodedData) return null;

                return (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Method Signature:</span>
                      <div className="mt-1">
                        <code className="font-mono text-sm bg-white dark:bg-gray-800 px-3 py-2 rounded border text-gray-900 dark:text-white">
                          {decodedData.methodSignature}
                        </code>
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Decoded from Base64:</span>
                      <div className="mt-1">
                        <code className="font-mono text-xs bg-white dark:bg-gray-800 px-3 py-2 rounded border break-all block text-gray-900 dark:text-white">
                          {decodedData.fullHex}
                        </code>
                      </div>
                    </div>

                    {decodedData.parameters.length > 0 && (
                      <div className="space-y-2">
                        {decodedData.parameters.map((param, index) => (
                          <div key={index} className="border-l-2 border-blue-300 dark:border-blue-600 pl-3">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Parameter {index + 1}
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                              {param.type}
                            </div>
                            <div className="font-mono text-sm bg-white dark:bg-gray-800 px-2 py-1 rounded border mt-1 break-all text-gray-900 dark:text-white">
                              {param.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Event Parameters - Status */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Event Parameters Status</span>
            </div>

            {/* Debug Info */}
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-3 text-xs">
              <div className="font-mono">
                <div>Event Name: {event?.event_name || 'N/A'}</div>
                <div>Contract Address: {event?.contract_address || 'N/A'}</div>
                <div>Topics Count: {event?.topics?.length || 0}</div>
                <div>Raw Data Length: {eventData?.length || 0}</div>
                <div>Decoded Data: {decodedData ? 'Available' : 'Not Available'}</div>
                <div>Parameters Count: {decodedData?.parameters?.length || 0}</div>
                <div>Loading: {eventDecodingLoading ? 'Yes' : 'No'}</div>
                <div>Error: {eventDecodingError || 'None'}</div>
              </div>
            </div>

            {eventDecodingLoading ? (
              <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-white/20 dark:border-gray-700/50 p-4">
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Decoding event parameters...</span>
                </div>
              </div>
            ) : eventDecodingError ? (
              <div className="bg-red-50/50 dark:bg-red-900/20 backdrop-blur-sm rounded-xl border border-red-200/50 dark:border-red-700/50 p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-red-700 dark:text-red-300">Error decoding event: {eventDecodingError}</span>
                </div>
              </div>
            ) : decodedData && decodedData.parameters && decodedData.parameters.length > 0 ? (
              <div className="bg-green-50/50 dark:bg-green-900/20 backdrop-blur-sm rounded-xl border border-green-200/50 dark:border-green-700/50 p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm font-medium">✓ {decodedData.parameters.length} parameters decoded successfully</span>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {decodedData ? 'No parameters found in decoded data' : 'Event data not available for decoding'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Decoded Event Parameters - Modern Table */}
          {decodedData && decodedData.parameters && decodedData.parameters.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Decoded Parameters Table</span>
                <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700">
                  {decodedData.parameters.length} parameters
                </Badge>
              </div>

              <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-white/20 dark:border-gray-700/50 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-green-50/50 to-blue-50/50 dark:from-green-900/20 dark:to-blue-900/20 border-b border-white/20 dark:border-gray-700/50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Parameter
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Value
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Info
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Raw
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20 dark:divide-gray-700/50">
                      {decodedData.parameters.map((param, index) => (
                        <tr key={index} className="hover:bg-white/30 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {param.name}
                              </span>
                              {param.indexed && (
                                <Badge variant="outline" className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700">
                                  Indexed
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className="text-xs text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                              {param.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="max-w-xs">
                              {param.type === 'address' ? (
                                <Link
                                  to={`/account/${param.formattedValue}`}
                                  className="font-mono text-xs bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:underline break-all block"
                                >
                                  {param.formattedValue}
                                </Link>
                              ) : (
                                <span className="font-mono text-xs bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white break-all block">
                                  {param.formattedValue}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {param.additionalInfo && (
                              <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                {param.additionalInfo}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 max-w-xs">
                              <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border text-gray-900 dark:text-white break-all flex-1">
                                {param.raw}
                              </code>
                              <button
                                onClick={() => copyToClipboard(param.raw)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                title="Copy to clipboard"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Basic Information and Contract Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Hash className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Basic Information
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Transaction Hash</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                <Link
                  to={`/transaction/${event.transaction_hash}`}
                  className="font-mono text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg break-all"
                >
                  {event.transaction_hash}
                </Link>
                <button
                  onClick={() => copyToClipboard(event.transaction_hash)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors self-start sm:self-auto"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Block Hash</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                <Link
                  to={`/block/${event.block_number}`}
                  className="font-mono text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg break-all"
                >
                  {event.block_hash}
                </Link>
                <button
                  onClick={() => copyToClipboard(event.block_hash)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors self-start sm:self-auto"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Method</label>
              <div className="mt-1">
                <span className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-3 py-2 rounded-lg text-sm font-medium">
                  <Hash className="h-3 w-3" />
                  {event.method || 'Event'}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
              <div className="mt-1">
                <Badge variant={event.status === 'success' ? 'default' : 'destructive'} className="text-gray-900 dark:text-white">
                  {event.status === 'success' ? 'Success' : 'Failed'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            Contract Information
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Contract Address</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                <Link
                  to={`/smart-contract/${event.contract_address}`}
                  className="font-mono text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg break-all"
                >
                  {event.contract_address}
                </Link>
                <button
                  onClick={() => copyToClipboard(event.contract_address)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors self-start sm:self-auto"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            {event.contract_name && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Contract Name</label>
                <div className="mt-1">
                  <span className="text-sm text-gray-900 dark:text-white font-medium break-words">
                    {event.contract_name}
                  </span>
                </div>
              </div>
            )}

            {event.contract_type && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Contract Type</label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">{event.contract_type}</Badge>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">From Address</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                <Link
                  to={`/account/${event.from_address}`}
                  className="font-mono text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg break-all"
                >
                  {event.from_address}
                </Link>
                <button
                  onClick={() => copyToClipboard(event.from_address)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors self-start sm:self-auto"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            {event.to_address && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">To Address</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                  <Link
                    to={`/account/${event.to_address}`}
                    className="font-mono text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg break-all"
                  >
                    {event.to_address}
                  </Link>
                  <button
                    onClick={() => copyToClipboard(event.to_address)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors self-start sm:self-auto"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
            </div>
          </div>

          {/* Raw Data */}
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Raw Data</label>
            <div className="flex items-center gap-2 mt-2">
              <code className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg flex-1 break-all text-gray-900 dark:text-white">
                {event.data}
              </code>
              <button
                onClick={() => copyToClipboard(event.data)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Decoded Data */}
          {event.decoded_data && Object.keys(event.decoded_data).length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Decoded Data</label>
              <div className="mt-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <pre className="text-sm text-gray-900 dark:text-white overflow-x-auto">
                  {JSON.stringify(event.decoded_data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Technical Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Technical Details</h3>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Transaction Index:</span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">{event.transaction_index}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Log Index:</span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">{event.log_index}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Gas Used:</span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">{event.gas_used?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Gas Price:</span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">{event.gas_price} wei</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Removed:</span>
              <Badge variant={event.removed ? 'destructive' : 'default'} className="text-gray-900 dark:text-white">
                {event.removed ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Event Signature</h3>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Event Signature</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg flex-1 break-all text-gray-900 dark:text-white">
                  {event.event_signature}
                </code>
                <button
                  onClick={() => copyToClipboard(event.event_signature)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
