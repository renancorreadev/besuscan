import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Code, FileText, Copy, ExternalLink, CheckCircle, Loader2 } from 'lucide-react';

interface SourceCodeProps {
  sourceCode: string | null;
  isVerified: boolean;
  contractName: string;
  compilerVersion?: string;
  loading: boolean;
  onCopyToClipboard: (text: string) => void;
}

export const SourceCode: React.FC<SourceCodeProps> = ({
  sourceCode,
  isVerified,
  contractName,
  compilerVersion,
  loading,
  onCopyToClipboard,
}) => {
  return (
    <div className="space-y-6 mt-0">
      {/* Header do Código Fonte */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl border border-purple-200/50 dark:border-purple-700/50">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg">
            <Code className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Código Fonte do Contrato</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Verified and readable Solidity code
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
          <CheckCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Verified</span>
        </div>
      </div>

      <Card className="relative overflow-hidden bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-800 dark:to-purple-900/10 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <CardHeader className="border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-gray-800/50">
          <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 shadow-sm">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {contractName || 'Contrato'}.sol
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {compilerVersion ? `Solidity ${compilerVersion}` : 'Solidity'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => sourceCode && onCopyToClipboard(sourceCode)}
                disabled={!sourceCode}
                className="border-purple-200 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-900 dark:text-white"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400 mx-auto mb-4" />
                <p>Carregando código fonte...</p>
              </div>
            </div>
          ) : sourceCode ? (
            <div className="bg-gray-900 dark:bg-black text-gray-100 p-6 overflow-x-auto max-h-[600px] overflow-y-auto">
              <pre className="text-sm leading-relaxed whitespace-pre-wrap">
                <code className="language-solidity">
                  {sourceCode}
                </code>
              </pre>
            </div>
          ) : isVerified ? (
            <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400 mx-auto mb-4" />
                <p>Loading source code...</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="font-medium mb-2">Source code not available</p>
                <p className="text-sm">This contract has not been verified</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      {isVerified && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-green-200/50 dark:border-green-700/50">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Contrato Verificado
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                The source code has been verified and corresponds to the bytecode deployed on the blockchain.
                {compilerVersion && ` Compiled with Solidity ${compilerVersion}.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 