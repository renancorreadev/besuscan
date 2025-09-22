import { useEffect, useRef } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import type { Address } from 'viem';

interface WalletSyncData {
  account?: {
    address: string;
    displayBalance?: string;
    displayName?: string;
    ensName?: string;
  } | null;
  chain?: {
    id: number;
    name?: string;
    iconUrl?: string;
    unsupported?: boolean;
  } | null;
  mounted?: boolean;
}

export const useWalletSync = ({ account, chain, mounted }: WalletSyncData) => {
  const { 
    setConnected, 
    updateAccountData, 
    updateChainData,
    reset 
  } = useWalletStore();

  // Usar refs para evitar loops infinitos
  const prevAccountRef = useRef<typeof account>();
  const prevChainRef = useRef<typeof chain>();
  const prevMountedRef = useRef<typeof mounted>();

  useEffect(() => {
    // Verificar se houve mudanças reais
    const accountChanged = prevAccountRef.current !== account;
    const chainChanged = prevChainRef.current !== chain;
    const mountedChanged = prevMountedRef.current !== mounted;

    if (!accountChanged && !chainChanged && !mountedChanged) {
      return;
    }

    // Atualizar refs
    prevAccountRef.current = account;
    prevChainRef.current = chain;
    prevMountedRef.current = mounted;

    if (!mounted) {
      return;
    }

    if (account && chain) {
      // Conectado
      setConnected(true);
      
      updateAccountData({
        address: account.address as Address,
        balance: account.displayBalance || null,
        displayName: account.displayName || null,
        ensName: account.ensName || null,
      });
      
      updateChainData({
        chainId: chain.id,
        chainName: chain.name || null,
        chainIconUrl: chain.iconUrl || null,
        isWrongNetwork: chain.unsupported || false,
      });
    } else {
      // Desconectado
      setConnected(false);
      reset();
    }
  }, [account, chain, mounted, setConnected, updateAccountData, updateChainData, reset]);
}; 