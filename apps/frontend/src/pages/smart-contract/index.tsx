import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { Copy, CheckCircle, Code, Activity, FileText, Zap, Wallet, Shield, Loader2, AlertCircle } from 'lucide-react';
import { useWalletConnected, useWalletAddress } from '@/stores/walletStore';
import { TransactionToastContainer, useTransactionToast } from '@/components/ui/transaction-toast';

// Hooks personalizados
import { useContractData } from './hooks/useContractData';
import { useContractFunctions } from './hooks/useContractFunctions';

// Componentes
import { ContractNavigation } from './components/ContractNavigation';
import { ReadFunctions } from './components/ReadFunctions';
import { WriteFunctions } from './components/WriteFunctions';
import { SourceCode } from './components/SourceCode';

// Utilitários
import { formatEther, formatTimeAgo, formatNumber, copyToClipboard } from './utils/contractUtils';
import { useToast } from '@/hooks/use-toast';

const SmartContract = () => {
  const { address } = useParams();
  const [activeTab, setActiveTab] = useState('read');

  // Wallet connection
  const isConnected = useWalletConnected();
  const walletAddress = useWalletAddress();

  // Toast notifications
  const { toast } = useToast();
  const { toasts, addToast, updateToast, removeToast } = useTransactionToast();

  // Carregar dados do contrato
  const {
    contract,
    abi,
    sourceCode,
    events,
    metrics,
    readFunctions,
    writeFunctions,
    loading,
    error,
    refetch,
  } = useContractData(address);

  // Gerenciar execução de funções
  const {
    functionInputs,
    functionResults,
    executingFunction,
    activeReadFunction,
    updateFunctionInput,
    executeReadFunction,
    executeWriteFunction,
    setActiveReadFunction,
    transactionStatus,
  } = useContractFunctions({
    contractAddress: address || '',
    abi,
    toastHooks: { addToast, updateToast, removeToast }
  });

  // Estados para funções de escrita
  const [activeWriteFunction, setActiveWriteFunction] = useState<string | null>(null);

  // Contract data with fallback
  const contractData = contract || {
    address: address || '0x0000000000000000000000000000000000000000',
    name: 'Unknown Contract',
    contract_type: 'Unknown',
    is_verified: false,
    balance: '0',
    transaction_count: 0,
    creator_address: '0x0000000000000000000000000000000000000000',
    creation_tx_hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    creation_block_number: 0,
    creation_timestamp: 0,
    last_activity: 0
  };

  // Chart configuration
  const chartConfig = {
    transactions: {
      label: "Daily Transactions",
      color: "#3B82F6",
    },
  };

  // Function to copy to clipboard
  const handleCopyToClipboard = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      toast({
        title: "📋 Copied!",
        description: "Text copied to clipboard",
        variant: "default",
      });
    } else {
      toast({
        title: "❌ Error",
        description: "Failed to copy text",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading contract data...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 dark:text-red-400 mb-2">Error loading contract</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{error}</p>
              <Button onClick={refetch} className="mt-4">
                Try Again
              </Button>
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
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Contract Header */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 w-fit">
                <Code className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Smart Contract</h1>
                  {contractData.is_verified && (
                    <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full w-fit">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">Verified</span>
                    </div>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                  Detailed information about this smart contract
                </p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                    <span className="text-gray-600 dark:text-gray-400 font-medium text-sm sm:text-base">Contract Address:</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm break-all">
                      {contractData.address}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyToClipboard(contractData.address)}
                      className="border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 text-gray-900 dark:text-white w-full sm:w-auto"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    {contractData.contract_type}
                  </Badge>
                  <Badge variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                    {contractData.name}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Contract Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">
                    Balance
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {formatEther(contractData.balance)}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">
                    Total Transactions
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                  {formatNumber(contract?.total_transactions || 0)}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Wallet className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">
                    Unique Users
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {formatNumber(contract?.unique_addresses_count || 0)}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">
                    Last Activity
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  {contract?.created_at ? formatTimeAgo(new Date(contract.created_at).getTime() / 1000) : 'Never'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transactions Chart */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                Daily Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {loading ? (
                <div className="flex items-center justify-center h-[250px] sm:h-[300px]">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Loading chart data...</span>
                </div>
              ) : metrics?.metrics && metrics.metrics.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.metrics}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#374151" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#6B7280', fontSize: window.innerWidth < 640 ? 10 : 12 }}
                        tickLine={{ stroke: '#6B7280' }}
                        axisLine={{ stroke: '#6B7280' }}
                        angle={window.innerWidth < 640 ? -45 : 0}
                        textAnchor={window.innerWidth < 640 ? 'end' : 'middle'}
                        height={window.innerWidth < 640 ? 60 : 40}
                      />
                      <YAxis 
                        tick={{ fill: '#6B7280', fontSize: window.innerWidth < 640 ? 10 : 12 }}
                        tickLine={{ stroke: '#6B7280' }}
                        axisLine={{ stroke: '#6B7280' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'var(--tooltip-bg)',
                          border: '1px solid var(--tooltip-border)',
                          borderRadius: '8px',
                          color: 'var(--tooltip-text)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="transactions_count" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p>No transaction data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contract Interface */}
          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
              <div className="lg:w-1/4">
                <ContractNavigation
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  readFunctionsCount={readFunctions.length}
                  writeFunctionsCount={writeFunctions.length}
                  eventsCount={events.length}
                  isVerified={contractData.is_verified}
                />
              </div>

              <div className="lg:w-3/4">
                <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
                  {activeTab === 'read' && (
                    <ReadFunctions
                      functions={readFunctions}
                      functionInputs={functionInputs}
                      functionResults={functionResults}
                      executingFunction={executingFunction}
                      activeReadFunction={activeReadFunction}
                      onUpdateInput={updateFunctionInput}
                      onExecuteFunction={executeReadFunction}
                      onSetActiveFunction={setActiveReadFunction}
                      onCopyToClipboard={handleCopyToClipboard}
                    />
                  )}

                  {activeTab === 'write' && (
                    <div className="space-y-4">
                      {/* Transaction Status */}
                      {transactionStatus.status !== 'idle' && transactionStatus.functionName && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              transactionStatus.status === 'confirmed' ? 'bg-green-500' :
                              transactionStatus.status === 'failed' ? 'bg-red-500' :
                              'bg-blue-500 animate-pulse'
                            }`} />
                            <div>
                              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                {transactionStatus.functionName}
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                {transactionStatus.status === 'preparing' ? 'Preparando transação...' :
                                 transactionStatus.status === 'wallet' ? 'Aguardando carteira...' :
                                 transactionStatus.status === 'sent' ? 'Transação enviada' :
                                 transactionStatus.status === 'mining' ? 'Minerando...' :
                                 transactionStatus.status === 'confirmed' ? 'Confirmada!' :
                                 transactionStatus.status === 'failed' ? `Falhou: ${transactionStatus.error}` :
                                 'Processando...'}
                                {transactionStatus.hash && ` • Hash: ${transactionStatus.hash.slice(0, 10)}...`}
                                {transactionStatus.blockNumber && ` • Bloco: #${transactionStatus.blockNumber}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <WriteFunctions
                        functions={writeFunctions}
                        functionInputs={functionInputs}
                        functionResults={functionResults}
                        executingFunction={executingFunction}
                        activeWriteFunction={activeWriteFunction}
                        isConnected={isConnected}
                        walletAddress={walletAddress}
                        onUpdateInput={updateFunctionInput}
                        onExecuteFunction={executeWriteFunction}
                        onSetActiveFunction={setActiveWriteFunction}
                        onCopyToClipboard={handleCopyToClipboard}
                      />
                    </div>
                  )}

                  {activeTab === 'code' && (
                    <SourceCode
                      sourceCode={sourceCode}
                      isVerified={contractData.is_verified}
                      contractName={contractData.name}
                      compilerVersion={contract?.compiler_version}
                      loading={loading}
                      onCopyToClipboard={handleCopyToClipboard}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
      
      {/* Transaction Toast Container */}
      <TransactionToastContainer 
        toasts={toasts}
        onClose={removeToast}
        onCopy={handleCopyToClipboard}
        position="top-right" 
      />
    </div>
  );
};

export default SmartContract;
