import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FullConnectButton } from '@/components/ui/connect-button';
import { Edit3, Wallet, Shield, CheckCircle, Settings, Search, Loader2, Terminal, Copy } from 'lucide-react';
import { formatAddress } from '../utils/contractUtils';

interface ContractFunction {
  name: string;
  type: 'function' | 'constructor' | 'fallback' | 'receive';
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
  inputs: Array<{
    name: string;
    type: string;
    internalType?: string;
  }>;
  outputs?: Array<{
    name: string;
    type: string;
    internalType?: string;
  }>;
}

interface WriteFunctionsProps {
  functions: ContractFunction[];
  functionInputs: Record<string, Record<string, string>>;
  functionResults: Record<string, any>;
  executingFunction: string | null;
  activeWriteFunction: string | null;
  isConnected: boolean;
  walletAddress: string | null;
  onUpdateInput: (functionName: string, inputName: string, value: string) => void;
  onExecuteFunction: (func: ContractFunction) => void;
  onSetActiveFunction: (functionName: string | null) => void;
  onCopyToClipboard: (text: string) => void;
}

export const WriteFunctions: React.FC<WriteFunctionsProps> = ({
  functions,
  functionInputs,
  functionResults,
  executingFunction,
  activeWriteFunction,
  isConnected,
  walletAddress,
  onUpdateInput,
  onExecuteFunction,
  onSetActiveFunction,
  onCopyToClipboard,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar funções por termo de busca
  const filteredFunctions = functions.filter(func => 
    func.name.toLowerCase().includes(searchTerm.toLowerCase())
  );



  return (
    <div className="space-y-4 sm:space-y-6 mt-0">
      {/* Header das Funções de Escrita */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200/50 dark:border-green-700/50 gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
            <Edit3 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Write Functions</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Execute transactions that modify the contract state
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full w-fit">
          <Wallet className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-semibold text-green-700 dark:text-green-300">Requer Carteira</span>
        </div>
      </div>

      {/* Status de Conexão */}
      {!isConnected ? (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Conecte sua carteira para interagir com funções de escrita</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Todas as transações requerem taxas de gas e aprovação da carteira</p>
              <div className="mt-3">
                <FullConnectButton />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-xl">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Connected Wallet: {formatAddress(walletAddress || '')}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">You can execute write functions</p>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input 
          placeholder="Search write functions..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-green-500 dark:focus:border-green-400 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
        />
      </div>

      {/* Grid de Funções */}
      <div className="grid gap-4">
        {filteredFunctions.length === 0 ? (
          <div className="text-center py-8">
            <Edit3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No write functions found' : 'No write functions available'}
            </p>
          </div>
        ) : (
          filteredFunctions.map((func, index) => (
            <Card key={index} className="group relative overflow-hidden bg-gradient-to-br from-white to-green-50/30 dark:from-gray-800 dark:to-green-900/10 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="relative pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                            {func.name}
                          </span>
                          {func.stateMutability === 'payable' && (
                            <Badge variant="destructive" className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                              payable
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs border-green-200 dark:border-green-700 text-green-700 dark:text-green-300">
                            {func.stateMutability}
                          </Badge>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {func.inputs.length} parâmetro{func.inputs.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSetActiveFunction(activeWriteFunction === func.name ? null : func.name)}
                    className="bg-white/50 dark:bg-gray-800/50 border-green-200 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-400 dark:hover:border-green-500 transition-all duration-200 group-hover:scale-105 text-gray-900 dark:text-white"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    {activeWriteFunction === func.name ? 'Ocultar' : 'Escrever'}
                  </Button>
                </div>
              </CardHeader>
              {activeWriteFunction === func.name && (
                <CardContent className="relative pt-0 space-y-6 animate-fade-in">
                  <div className="bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10 p-6 rounded-xl border border-green-200/30 dark:border-green-700/30">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Settings className="h-4 w-4 text-green-600 dark:text-green-400" />
                        Transaction Parameters
                      </h4>
                      {func.inputs.map((input, inputIndex) => (
                        <div key={inputIndex} className="space-y-2">
                          <Label className="text-gray-700 dark:text-gray-300 font-medium">
                            {input.name || `param${inputIndex}`}
                            <span className="ml-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-400">
                              {input.type}
                            </span>
                          </Label>
                          <Input 
                            placeholder={`Digite o valor ${input.type}`}
                            value={functionInputs[func.name]?.[input.name] || ''}
                            onChange={(e) => onUpdateInput(func.name, input.name, e.target.value)}
                            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 focus:border-green-500 dark:focus:border-green-400 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                          />
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {input.type === 'uint256' ? 'Digite um número inteiro positivo (use wei para ETH: 1 ETH = 1000000000000000000)' :
                             input.type === 'bool' ? 'Digite "true", "false", "1", ou "0"' :
                             input.type === 'address' ? 'Digite um endereço Ethereum válido (42 caracteres começando com 0x)' :
                             input.type.includes('[]') ? 'Digite array JSON: ["item1", "item2"] ou separado por vírgula: item1, item2' :
                             ''}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      onClick={() => onExecuteFunction(func)}
                      disabled={executingFunction === func.name || !isConnected}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100"
                    >
                      {executingFunction === func.name ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Executando...
                        </>
                      ) : (
                        <>
                          <Wallet className="h-4 w-4 mr-2" />
                          {isConnected ? 'Executar Transação' : 'Conectar Carteira'}
                        </>
                      )}
                    </Button>
                    
                    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-600 shadow-inner">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Terminal className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Resultado da Transação</span>
                        </div>
                        {functionResults[func.name] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onCopyToClipboard(functionResults[func.name])}
                            className="h-6 px-2 text-xs hover:bg-green-50 dark:hover:bg-green-900/20"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        )}
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border font-mono text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-all whitespace-pre-wrap">
                        {functionResults[func.name] || 'Click "Execute Transaction" to see the results'}
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-700/50">
                      <div className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-800 dark:text-amber-200">Detalhes da Transação</p>
                          <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">
                            This creates a transaction on the blockchain that requires gas fees and cannot be undone.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}; 