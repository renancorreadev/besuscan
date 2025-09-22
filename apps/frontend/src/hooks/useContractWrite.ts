import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseAbi, type Address } from 'viem';
import { toast } from 'sonner';

interface ContractWriteParams {
  contractAddress: Address;
  functionName: string;
  args: any[];
  abi: any[];
  value?: bigint;
}

interface UseContractWriteResult {
  writeContract: (params: ContractWriteParams) => Promise<void>;
  isLoading: boolean;
  isSuccess: boolean;
  error: Error | null;
  transactionHash: string | null;
  reset: () => void;
}

export const useContractWrite = (): UseContractWriteResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const { writeContract: wagmiWriteContract } = useWriteContract();
  
  const { data: receipt, isLoading: isWaitingForReceipt } = useWaitForTransactionReceipt({
    hash: transactionHash as `0x${string}` | undefined,
  });

  const writeContract = async (params: ContractWriteParams) => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setTransactionHash(null);

      const { contractAddress, functionName, args, abi, value } = params;

      // Executar a transação
      const hash = await wagmiWriteContract({
        address: contractAddress,
        abi: abi,
        functionName: functionName,
        args: args,
        value: value,
      });

      setTransactionHash(hash);
      
      toast.success('Transaction submitted!', {
        description: `Transaction hash: ${hash.slice(0, 10)}...`,
      });

      // Aguardar confirmação
      // O hook useWaitForTransactionReceipt vai lidar com isso automaticamente
      
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast.error('Transaction failed', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar se a transação foi confirmada
  if (receipt && !isSuccess) {
    setIsSuccess(true);
    toast.success('Transaction confirmed!', {
      description: `Block: ${receipt.blockNumber}`,
    });
  }

  const reset = () => {
    setIsLoading(false);
    setIsSuccess(false);
    setError(null);
    setTransactionHash(null);
  };

  return {
    writeContract,
    isLoading: isLoading || isWaitingForReceipt,
    isSuccess,
    error,
    transactionHash,
    reset,
  };
};

export default useContractWrite; 