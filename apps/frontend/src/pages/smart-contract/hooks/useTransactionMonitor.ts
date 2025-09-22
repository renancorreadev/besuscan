import { useState, useEffect, useRef, useCallback } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useTransactionToast } from '@/components/ui/transaction-toast';
// Não precisamos mais do API_BASE_URL aqui se a verificação for puramente Wagmi
// import { API_BASE_URL } from '@/services/api';

interface TransactionStatus {
  hash?: string; // Opcional no início, mas crucial para monitoramento
  status: 'idle' | 'preparing' | 'wallet' | 'sent' | 'mining' | 'confirmed' | 'failed';
  error?: string;
  functionName?: string;
  blockNumber?: number;
}

interface UseTransactionMonitorProps {
  contractAddress: string; // Pode ser necessário para logs ou futuras extensões
  walletAddress: string;   // Pode ser necessário para logs ou futuras extensões
  toastHooks?: {
    addToast: (toast: any) => string;
    updateToast: (id: string, updates: any) => void;
    removeToast: (id: string) => void;
  };
  onStatusChange?: (status: TransactionStatus) => void;
}

interface ToastData {
  type: 'preparing' | 'wallet' | 'sent' | 'mining' | 'confirmed' | 'error' | 'info';
  title: string;
  description: string;
  transactionHash?: string;
  functionName?: string;
  duration?: number;
}

interface Toast {
  id: string;
  update: (data: ToastData) => void;
  dismiss: () => void;
}

export const useTransactionMonitor = ({
  contractAddress,
  walletAddress,
  toastHooks,
  onStatusChange,
}: UseTransactionMonitorProps) => {
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({ status: 'idle' });
  const [currentToast, setCurrentToast] = useState<Toast | null>(null);
  // Usamos processedTransactions para evitar que um toast de "confirmado" seja disparado múltiplas vezes para o mesmo hash
  const processedTransactions = useRef<Set<string>>(new Set());

  const { addToast, updateToast, removeToast } = toastHooks || useTransactionToast();

  // Wagmi hook para monitoramento de recibo da transação
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    isError: hasError,
    data: receipt,
    error: receiptError 
  } = useWaitForTransactionReceipt({
    hash: transactionStatus.hash as `0x${string}`,
    query: {
      enabled: !!transactionStatus.hash && 
               transactionStatus.status !== 'failed' && 
               transactionStatus.status !== 'confirmed',
      retry: true,
      retryDelay: 1000,
      refetchInterval: 1000,
    },
  });

  // Função para atualizar o status e notificar
  const updateStatus = useCallback((newStatus: TransactionStatus) => {
    console.log('UPDATE_STATUS:', newStatus);
    setTransactionStatus(newStatus);
    onStatusChange?.(newStatus);

    // Atualizar toast baseado no novo status
    if (currentToast) {
      let toastData: ToastData = {
        type: 'info',
        title: '',
        description: '',
        functionName: newStatus.functionName,
        transactionHash: newStatus.hash,
      };

      switch (newStatus.status) {
        case 'preparing':
          toastData = {
            type: 'preparing',
            title: "🔄 Preparando Transação",
            description: "Processando argumentos da transação...",
            functionName: newStatus.functionName,
            duration: 0,
          };
          break;
        case 'wallet':
          toastData = {
            type: 'wallet',
            title: "👛 Aguardando Aprovação",
            description: "Por favor, aprove a transação na sua carteira MetaMask.",
            functionName: newStatus.functionName,
            duration: 0,
          };
          break;
        case 'sent':
          toastData = {
            type: 'sent',
            title: "🚀 Transação Enviada",
            description: "Sua transação foi enviada para a rede. Aguardando confirmação da blockchain...",
            transactionHash: newStatus.hash,
            functionName: newStatus.functionName,
            duration: 0,
          };
          break;
        case 'mining':
          toastData = {
            type: 'mining',
            title: "⛏️ Minerando Transação",
            description: `Minerando transação... Hash: ${newStatus.hash?.slice(0, 10)}...`,
            transactionHash: newStatus.hash,
            functionName: newStatus.functionName,
            duration: 0,
          };
          break;
        case 'confirmed':
          toastData = {
            type: 'confirmed',
            title: "✅ Transação Confirmada",
            description: `Transação confirmada no bloco #${newStatus.blockNumber}`,
            transactionHash: newStatus.hash,
            functionName: newStatus.functionName,
            duration: 5000,
          };
          break;
        case 'failed':
          toastData = {
            type: 'error',
            title: "❌ Transação Falhou",
            description: newStatus.error || "A transação falhou. Verifique os detalhes.",
            transactionHash: newStatus.hash,
            functionName: newStatus.functionName,
            duration: 8000,
          };
          break;
      }

      currentToast.update(toastData);

      // Auto-dismiss para estados finais
      if (newStatus.status === 'confirmed' || newStatus.status === 'failed') {
        setTimeout(() => {
          currentToast.dismiss();
          setCurrentToast(null);
        }, toastData.duration || 5000);
      }
    }
  }, [currentToast, onStatusChange]);

  // Monitorar mudanças no status da transação via Wagmi
  useEffect(() => {
    if (!transactionStatus.hash) return;

    if (isConfirming && transactionStatus.status !== 'mining') {
      updateStatus({
        ...transactionStatus,
        status: 'mining'
      });
    }

    if (isConfirmed && receipt) {
      updateStatus({
        hash: transactionStatus.hash,
        status: 'confirmed',
        functionName: transactionStatus.functionName,
        blockNumber: receipt.blockNumber
      });
      processedTransactions.current.add(transactionStatus.hash);
    }

    if (hasError && receiptError) {
      updateStatus({
        hash: transactionStatus.hash,
        status: 'failed',
        error: receiptError.message,
        functionName: transactionStatus.functionName
      });
      processedTransactions.current.add(transactionStatus.hash);
    }
  }, [isConfirming, isConfirmed, hasError, receipt, receiptError, transactionStatus, updateStatus]);

  // Funções de controle
  const prepareTransaction = useCallback((functionName: string) => {
    console.log('CONTROL_FN: prepareTransaction para:', functionName);
    const toastData: ToastData = {
      type: 'preparing',
      title: "🔄 Preparando Transação",
      description: "Processando argumentos da transação...",
      functionName,
      duration: 0,
    };

    if (!currentToast) {
      const id = addToast(toastData);
      setCurrentToast({
        id,
        update: (data: ToastData) => updateToast(id, data),
        dismiss: () => removeToast(id)
      });
    } else {
      currentToast.update(toastData);
    }

    updateStatus({
      status: 'preparing',
      functionName
    });
  }, [addToast, updateToast, removeToast, currentToast, updateStatus]);

  const waitingForWallet = useCallback((functionName: string) => {
    console.log('CONTROL_FN: waitingForWallet para:', functionName);
    updateStatus({
      status: 'wallet',
      functionName
    });
  }, [updateStatus]);

  const startMonitoring = useCallback((hash: string, functionName: string) => {
    console.log('CONTROL_FN: startMonitoring - Hash:', hash, 'Função:', functionName);
    updateStatus({
      hash,
      status: 'sent',
      functionName
    });
  }, [updateStatus]);

  const handleTransactionError = useCallback((error: Error, functionName: string) => {
    console.error('CONTROL_FN: handleTransactionError para:', functionName, 'Erro:', error);
    updateStatus({
      hash: transactionStatus.hash,
      status: 'failed',
      error: error.message,
      functionName
    });
  }, [transactionStatus.hash, updateStatus]);

  return {
    transactionStatus,
    prepareTransaction,
    waitingForWallet,
    startMonitoring,
    handleTransactionError
  };
}; 