import { useState, useCallback, useEffect, useRef } from 'react';
import { useReadContract, useWriteContract } from 'wagmi';
import { Address, encodeFunctionData as viemEncodeFunctionData } from 'viem';
import { processInputValue as processInput, serializeArgsForDisplay } from '@/hooks/useContractRead';
import { useWalletConnected, useWalletAddress } from '@/stores/walletStore';
import { useToast } from '@/hooks/use-toast';
import { useTransactionMonitor } from './useTransactionMonitor';

// Função para codificar dados da função usando viem (muito mais simples!)
const encodeFunctionData = (func: ContractFunction, args: any[]): string => {
  try {
    // Usar viem para codificar corretamente
    return viemEncodeFunctionData({
      abi: [func],
      functionName: func.name,
      args: args
    });
  } catch (error) {
    console.error('Error encoding function data:', error);
    // Fallback simples para funções sem parâmetros
    if (args.length === 0) {
      return '0x' + func.name.length.toString(16).padStart(8, '0');
    }
    return '0x00000000';
  }
};

// Função para decodificar resultado da função (simplificada)
const decodeFunctionResult = (func: ContractFunction, hexData: string): any => {
  if (!hexData || hexData === '0x') return null;

  // Remove 0x se presente
  const data = hexData.startsWith('0x') ? hexData.slice(2) : hexData;

  if (!func.outputs || func.outputs.length === 0) return null;

  // Para uma saída simples, vamos decodificar basicamente
  const output = func.outputs[0];
  const value = data.slice(0, 64); // Primeiros 32 bytes

  if (output.type === 'uint256' || output.type === 'int256') {
    return BigInt('0x' + value).toString();
  } else if (output.type === 'address') {
    return '0x' + value.slice(24); // Últimos 20 bytes
  } else if (output.type === 'bool') {
    return BigInt('0x' + value) === BigInt(1);
      } else if (output.type === 'string') {
      // Decodificação básica para string
      const length = parseInt(data.slice(0, 64), 16);
      const stringData = data.slice(64, 64 + length * 2);
      // Converter hex para string
      let result = '';
      for (let i = 0; i < stringData.length; i += 2) {
        const hex = stringData.substr(i, 2);
        result += String.fromCharCode(parseInt(hex, 16));
      }
      return result;
    }

  return '0x' + data;
};

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

interface UseContractFunctionsProps {
  contractAddress: string;
  abi: any[] | null;
  toastHooks?: {
    addToast: (toast: any) => string;
    updateToast: (id: string, updates: any) => void;
    removeToast: (id: string) => void;
  };
}

export const useContractFunctions = ({ contractAddress, abi, toastHooks }: UseContractFunctionsProps) => {
  const [functionInputs, setFunctionInputs] = useState<Record<string, Record<string, string>>>({});
  const [functionResults, setFunctionResults] = useState<Record<string, any>>({});
  const [executingFunction, setExecutingFunction] = useState<string | null>(null);
  const [activeReadFunction, setActiveReadFunction] = useState<string | null>(null);
  const lastMonitoredHash = useRef<string | null>(null);

  // Wallet connection
  const isConnected = useWalletConnected();
  const walletAddress = useWalletAddress();

  // Toast notifications
  const { toast } = useToast();

  // Wagmi hooks
  const { writeContract, data: writeData, error: writeError, isPending: isWritePending } = useWriteContract();

  // Transaction monitoring
  const transactionMonitor = useTransactionMonitor({
    contractAddress,
    walletAddress: walletAddress || '',
    toastHooks,
    onStatusChange: (status) => {
      if (status.functionName) {
        let result = '';

        switch (status.status) {
          case 'preparing':
            result = `🔄 Preparando transação...\n\n📋 Função: ${status.functionName}\n📋 Contrato: ${contractAddress}\n👛 De: ${walletAddress}\n\n⏳ Processando argumentos...`;
            break;
          case 'wallet':
            result = `👛 Aguardando carteira...\n\n📋 Função: ${status.functionName}\n📋 Contrato: ${contractAddress}\n👛 De: ${walletAddress}\n\n⏳ Aprove a transação na sua carteira...`;
            break;
          case 'sent':
            result = `🚀 Transação enviada!\n\n📋 Função: ${status.functionName}\n📋 Contrato: ${contractAddress}\n👛 De: ${walletAddress}\n\n🔗 Hash: ${status.hash}\n\n⏳ Aguardando confirmação...`;
            break;
          case 'mining':
            result = `⛏️ Minerando transação...\n\n📋 Função: ${status.functionName}\n📋 Contrato: ${contractAddress}\n👛 De: ${walletAddress}\n\n🔗 Hash: ${status.hash}\n\n🔄 Mineração em andamento...`;
            break;
          case 'confirmed':
            result = `✅ Transação confirmada!\n\n📋 Função: ${status.functionName}\n📋 Contrato: ${contractAddress}\n👛 De: ${walletAddress}\n\n🔗 Hash: ${status.hash}\n${status.blockNumber ? `\n🎉 Bloco: #${status.blockNumber}` : ''}\n\n🎉 Status: Minerada com sucesso!\n\n🔍 A transação foi incluída na blockchain e está confirmada.`;
            // Resetar executingFunction após confirmação bem-sucedida
            setExecutingFunction(null);
            break;
          case 'failed':
            result = `❌ Transação falhou!\n\n📋 Função: ${status.functionName}\n📋 Contrato: ${contractAddress}\n👛 De: ${walletAddress}\n\n💥 Erro: ${status.error}\n\n🔍 Verifique os parâmetros e tente novamente.`;
            // Resetar executingFunction após falha
            setExecutingFunction(null);
            break;
        }

        if (result) {
          setFunctionResults(prev => ({
            ...prev,
            [status.functionName]: result
          }));
        }
      }
    },
  });

  // Hook para leitura do contrato - DESABILITADO para evitar execução automática
  const readContractConfig = {
    address: contractAddress as Address,
    abi: abi || [],
    functionName: activeReadFunction || undefined,
    args: activeReadFunction && functionInputs[activeReadFunction] ?
      Object.values(functionInputs[activeReadFunction]).map((value, index) => {
        const func = abi?.find((item: any) => item.name === activeReadFunction);
        if (func?.inputs?.[index]) {
          return processInput(value, func.inputs[index].type);
        }
        return value;
      }) : [],
    query: {
      enabled: false // DESABILITADO - não executar automaticamente
    }
  };

  const { data: readData, isError: readError, error: readErrorData, isLoading: readLoading, isSuccess: readSuccess } = useReadContract(readContractConfig);

  // Atualizar input de função
  const updateFunctionInput = useCallback((functionName: string, inputName: string, value: string) => {
    setFunctionInputs(prev => ({
      ...prev,
      [functionName]: {
        ...prev[functionName],
        [inputName]: value
      }
    }));
  }, []);

  // Processar resultado de leitura
  const processReadResult = useCallback((data: any): string => {
    if (data === undefined || data === null) return 'undefined';

    if (typeof data === 'bigint') {
      return data.toString();
    } else if (typeof data === 'boolean') {
      return data.toString();
    } else if (Array.isArray(data)) {
      return JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2
      );
    } else if (typeof data === 'object' && data !== null) {
      return JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2
      );
    } else {
      return data.toString();
    }
  }, []);

  // Executar função de leitura
  const executeReadFunction = useCallback(async (func: ContractFunction) => {
    if (!abi || !contractAddress) {
      setFunctionResults(prev => ({
        ...prev,
        [func.name]: 'Error: ABI or contract address not available'
      }));
      return;
    }

    setExecutingFunction(func.name);

    try {
      // Validar argumentos de entrada
      const args: any[] = [];
      if (func.inputs.length > 0) {
        for (const input of func.inputs) {
          const inputValue = functionInputs[func.name]?.[input.name] || '';
          if (inputValue.trim() === '' && !input.type.includes('optional')) {
            throw new Error(`${input.name} é obrigatório`);
          }
          const processedValue = processInput(inputValue, input.type);
          if (processedValue !== undefined) {
            args.push(processedValue);
          }
        }
      }

      // Mostrar estado inicial de carregamento
      let result = `🔄 Executando função "${func.name}"...\n\n`;
      result += `📋 Contract: ${contractAddress}\n`;
      result += `📥 Arguments: ${serializeArgsForDisplay(args)}\n\n`;

      if (func.outputs && func.outputs.length > 0) {
        result += `📤 Return Type: ${func.outputs.map(o => `${o.name || 'result'} (${o.type})`).join(', ')}\n`;
        result += `📊 Result: Executando chamada RPC...`;
      } else {
        result += `📤 Return Type: void (no return value)\n`;
        result += `🔄 Executando função...`;
      }

      setFunctionResults(prev => ({
        ...prev,
        [func.name]: result
      }));

      // Fazer chamada RPC manual
      const rpcRequest = {
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: contractAddress,
            data: encodeFunctionData(func, args)
          },
          'latest'
        ],
        id: 1
      };

      const response = await fetch('/rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rpcRequest)
      });

      if (!response.ok) {
        throw new Error(`RPC request failed: ${response.status}`);
      }

      const rpcResponse = await response.json();

      if (rpcResponse.error) {
        throw new Error(`RPC error: ${rpcResponse.error.message}`);
      }

      // Decodificar resultado
      const decodedResult = decodeFunctionResult(func, rpcResponse.result);

      // Atualizar resultado
      result = `✅ Function "${func.name}" executed successfully!\n\n`;
      result += `📋 Contract: ${contractAddress}\n`;
      result += `📥 Arguments: ${serializeArgsForDisplay(args)}\n\n`;

      if (func.outputs && func.outputs.length > 0) {
        result += `📤 Return Type: ${func.outputs.map(o => `${o.name || 'result'} (${o.type})`).join(', ')}\n`;
        result += `📊 Result: ${processReadResult(decodedResult)}`;
      } else {
        result += `📤 Return Type: void (no return value)\n`;
        result += `✅ Function executed successfully without return value`;
      }

      setFunctionResults(prev => ({
        ...prev,
        [func.name]: result
      }));

    } catch (err) {
      console.error('Error reading contract:', err);

      setFunctionResults(prev => ({
        ...prev,
        [func.name]: `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}\n\nCheck the input parameters and try again.`
      }));
    } finally {
      setExecutingFunction(null);
    }
  }, [abi, contractAddress, functionInputs, processReadResult]);

  // Executar função de escrita
  const executeWriteFunction = useCallback(async (func: ContractFunction) => {
    if (!isConnected || !walletAddress) {
      toast({
        title: "🔌 Carteira Necessária",
        description: "Conecte sua carteira para executar funções de escrita",
        variant: "destructive",
      });

      setFunctionResults(prev => ({
        ...prev,
        [func.name]: '❌ Erro: Conecte sua carteira primeiro\n\nPara executar funções de escrita, você precisa conectar sua carteira usando o botão "Conectar Carteira" acima.'
      }));
      return;
    }

    if (!abi || !contractAddress) {
      setFunctionResults(prev => ({
        ...prev,
        [func.name]: '❌ Erro: ABI do contrato ou endereço não disponível'
      }));
      return;
    }

    setExecutingFunction(func.name);

    try {
      // Preparar transação
      transactionMonitor.prepareTransaction(func.name);

      // Processar argumentos de entrada
      const args: any[] = [];
      if (func.inputs.length > 0) {
        for (const input of func.inputs) {
          const inputValue = functionInputs[func.name]?.[input.name] || '';
          if (inputValue.trim() === '' && !input.type.includes('optional')) {
            throw new Error(`${input.name} é obrigatório`);
          }
          const processedValue = processInput(inputValue, input.type);
          if (processedValue !== undefined) {
            args.push(processedValue);
          }
        }
      }


      // Executar transação
      const writeArgs: any = {
        address: contractAddress as Address,
        abi: abi,
        functionName: func.name,
      };

      if (args.length > 0) {
        writeArgs.args = args;
      }

      await writeContract(writeArgs);

    } catch (err) {
      console.error('Error executing write function:', err);
      transactionMonitor.handleTransactionError(err as Error, func.name);
      setExecutingFunction(null);
    }
  }, [isConnected, walletAddress, abi, contractAddress, functionInputs, toast, transactionMonitor, writeContract, writeData]);

  // Monitorar dados de escrita do Wagmi
  useEffect(() => {
    if (writeData && executingFunction && typeof writeData === 'string' && writeData !== lastMonitoredHash.current) {
      transactionMonitor.startMonitoring(writeData, executingFunction);
      lastMonitoredHash.current = writeData;
    }
  }, [writeData, executingFunction, transactionMonitor]);

  // Monitorar estado pending do writeContract
  useEffect(() => {
    if (isWritePending && executingFunction) {
      transactionMonitor.waitingForWallet(executingFunction);
    }
  }, [isWritePending, executingFunction, transactionMonitor]);

  // Monitorar erros de escrita do Wagmi
  useEffect(() => {
    if (writeError && executingFunction) {
      console.error('Wagmi write error:', writeError);
      transactionMonitor.handleTransactionError(writeError, executingFunction);
      setExecutingFunction(null);
    }
  }, [writeError, executingFunction, transactionMonitor]);



  return {
    functionInputs,
    functionResults,
    executingFunction,
    activeReadFunction,
    updateFunctionInput,
    executeReadFunction,
    executeWriteFunction,
    setActiveReadFunction,
    isWritePending,
    transactionStatus: transactionMonitor.transactionStatus,
  };
};
