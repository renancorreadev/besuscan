import { useState, useEffect } from 'react';

interface AbiItem {
  type: string;
  name?: string;
  inputs?: Array<{
    name: string;
    type: string;
    indexed?: boolean;
  }>;
  outputs?: Array<{
    name: string;
    type: string;
  }>;
  stateMutability?: string;
  anonymous?: boolean;
}

interface UseGetAbiDetailReturn {
  abi: AbiItem[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useGetAbiDetail = (contractAddress: string | undefined): UseGetAbiDetailReturn => {
  const [abi, setAbi] = useState<AbiItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAbi = async () => {
    if (!contractAddress) {
      console.log('useGetAbiDetail: No contract address provided');
      setAbi(null);
      setError(null);
      return;
    }

    console.log('useGetAbiDetail: Fetching ABI for contract:', contractAddress);
    setLoading(true);
    setError(null);

    try {
            const url = `/api/smart-contracts/${contractAddress}/abi`;
      console.log('useGetAbiDetail: Fetching from URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      console.log('useGetAbiDetail: Response status:', response.status);
      console.log('useGetAbiDetail: Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

            const data = await response.json();
      console.log('useGetAbiDetail: Response data:', data);

      // Extract ABI from the response format: { success: true, data: { address: "...", abi: [...] } }
      let abiData;
      if (data.success && data.data && data.data.abi) {
        abiData = data.data.abi;
      } else if (data.abi) {
        abiData = data.abi;
      } else if (data.result) {
        abiData = data.result;
      } else {
        abiData = data;
      }

      if (Array.isArray(abiData)) {
        console.log('useGetAbiDetail: ABI loaded successfully, functions:', abiData.filter(item => item.type === 'function').length);
        setAbi(abiData);
      } else {
        console.log('useGetAbiDetail: Invalid ABI format:', typeof abiData, abiData);
        throw new Error('Invalid ABI format');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch ABI';
      console.error('useGetAbiDetail: Error fetching ABI:', err);
      setError(errorMessage);
      setAbi(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbi();
  }, [contractAddress]);

  const refetch = () => {
    fetchAbi();
  };

  return {
    abi,
    loading,
    error,
    refetch
  };
};
