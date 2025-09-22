import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, Eye, Play, Terminal, Copy, Settings, Search, Loader2 } from 'lucide-react';

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

interface ReadFunctionsProps {
  functions: ContractFunction[];
  functionInputs: Record<string, Record<string, string>>;
  functionResults: Record<string, any>;
  executingFunction: string | null;
  activeReadFunction: string | null;
  onUpdateInput: (functionName: string, inputName: string, value: string) => void;
  onExecuteFunction: (func: ContractFunction) => void;
  onSetActiveFunction: (functionName: string | null) => void;
  onCopyToClipboard: (text: string) => void;
}

export const ReadFunctions: React.FC<ReadFunctionsProps> = ({
  functions,
  functionInputs,
  functionResults,
  executingFunction,
  activeReadFunction,
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
      {/* Read Functions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50 gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Read Contract</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Query contract state without gas fees
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full w-fit">
          <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{functions.length} Functions</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input 
          placeholder="Search read functions..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
        />
      </div>

      {/* Functions Grid */}
      <div className="grid gap-4">
        {filteredFunctions.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No functions found' : 'No read functions available'}
            </p>
          </div>
        ) : (
          filteredFunctions.map((func, index) => (
            <Card key={index} className="group relative overflow-hidden bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="relative pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-all">
                        {func.name}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300">
                          {func.stateMutability}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {func.inputs.length} input{func.inputs.length !== 1 ? 's' : ''} → {func.outputs?.length || 0} output{(func.outputs?.length || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSetActiveFunction(activeReadFunction === func.name ? null : func.name)}
                    className="bg-white/50 dark:bg-gray-800/50 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 group-hover:scale-105 text-gray-900 dark:text-white w-full sm:w-auto"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {activeReadFunction === func.name ? 'Hide' : 'Query'}
                  </Button>
                </div>
              </CardHeader>
              {activeReadFunction === func.name && (
                <CardContent className="relative pt-0 space-y-4 sm:space-y-6 animate-fade-in">
                  <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 p-4 sm:p-6 rounded-xl border border-blue-200/30 dark:border-blue-700/30">
                    {func.inputs.length > 0 ? (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          Input Parameters
                        </h4>
                        {func.inputs.map((input, inputIndex) => (
                          <div key={inputIndex} className="space-y-2">
                            <Label className="text-gray-700 dark:text-gray-300 font-medium text-sm">
                              {input.name || `param${inputIndex}`}
                              <span className="ml-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-400">
                                {input.type}
                              </span>
                            </Label>
                            <Input 
                              placeholder={`Enter ${input.type} value`}
                              value={functionInputs[func.name]?.[input.name] || ''}
                              onChange={(e) => onUpdateInput(func.name, input.name, e.target.value)}
                              className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm"
                            />
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {input.type === 'uint256' ? 'Enter a positive integer (use wei for ETH: 1 ETH = 1000000000000000000)' :
                               input.type === 'bool' ? 'Enter "true", "false", "1", or "0"' :
                               input.type === 'address' ? 'Enter a valid Ethereum address (42 characters starting with 0x)' :
                               input.type.includes('[]') ? 'Enter JSON array: ["item1", "item2"] or comma-separated: item1, item2' :
                               ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">No input parameters required</p>
                      </div>
                    )}
                    
                    <Button 
                      onClick={() => onExecuteFunction(func)}
                      disabled={executingFunction === func.name}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      {executingFunction === func.name ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Execute Query
                        </>
                      )}
                    </Button>
                    
                    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-600 shadow-inner">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Terminal className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Result</span>
                        </div>
                        {functionResults[func.name] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onCopyToClipboard(functionResults[func.name])}
                            className="h-6 px-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        )}
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border font-mono text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-all whitespace-pre-wrap">
                        {functionResults[func.name] || 'Click "Execute Query" to see results'}
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