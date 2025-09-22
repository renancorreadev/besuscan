import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { type Address } from 'viem';

// Tipos para o estado da wallet
export interface WalletState {
  // Estado da conexão
  isConnected: boolean;
  isConnecting: boolean;
  address: Address | null;
  chainId: number | null;
  
  // Informações da conta
  balance: string | null;
  ensName: string | null;
  displayName: string | null;
  
  // Informações da rede
  chainName: string | null;
  chainIconUrl: string | null;
  isWrongNetwork: boolean;
  
  // Funções para atualizar o estado
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setAddress: (address: Address | null) => void;
  setChainId: (chainId: number | null) => void;
  setBalance: (balance: string | null) => void;
  setEnsName: (ensName: string | null) => void;
  setDisplayName: (displayName: string | null) => void;
  setChainInfo: (chainName: string | null, chainIconUrl: string | null) => void;
  setWrongNetwork: (isWrong: boolean) => void;
  
  // Função para resetar o estado
  reset: () => void;
  
  // Função para atualizar dados da conta
  updateAccountData: (data: {
    address?: Address | null;
    balance?: string | null;
    ensName?: string | null;
    displayName?: string | null;
  }) => void;
  
  // Função para atualizar dados da rede
  updateChainData: (data: {
    chainId?: number | null;
    chainName?: string | null;
    chainIconUrl?: string | null;
    isWrongNetwork?: boolean;
  }) => void;
}

// Estado inicial
const initialState = {
  isConnected: false,
  isConnecting: false,
  address: null,
  chainId: null,
  balance: null,
  ensName: null,
  displayName: null,
  chainName: null,
  chainIconUrl: null,
  isWrongNetwork: false,
};

// Store da wallet
export const useWalletStore = create<WalletState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // Setters simples
      setConnected: (connected) => {
        const currentState = get();
        if (currentState.isConnected !== connected) {
          set({ isConnected: connected }, false, 'setConnected');
        }
      },
      setConnecting: (connecting) => {
        const currentState = get();
        if (currentState.isConnecting !== connecting) {
          set({ isConnecting: connecting }, false, 'setConnecting');
        }
      },
      setAddress: (address) => {
        const currentState = get();
        if (currentState.address !== address) {
          set({ address }, false, 'setAddress');
        }
      },
      setChainId: (chainId) => {
        const currentState = get();
        if (currentState.chainId !== chainId) {
          set({ chainId }, false, 'setChainId');
        }
      },
      setBalance: (balance) => {
        const currentState = get();
        if (currentState.balance !== balance) {
          set({ balance }, false, 'setBalance');
        }
      },
      setEnsName: (ensName) => {
        const currentState = get();
        if (currentState.ensName !== ensName) {
          set({ ensName }, false, 'setEnsName');
        }
      },
      setDisplayName: (displayName) => {
        const currentState = get();
        if (currentState.displayName !== displayName) {
          set({ displayName }, false, 'setDisplayName');
        }
      },
      setChainInfo: (chainName, chainIconUrl) => {
        const currentState = get();
        if (currentState.chainName !== chainName || currentState.chainIconUrl !== chainIconUrl) {
          set({ chainName, chainIconUrl }, false, 'setChainInfo');
        }
      },
      setWrongNetwork: (isWrong) => {
        const currentState = get();
        if (currentState.isWrongNetwork !== isWrong) {
          set({ isWrongNetwork: isWrong }, false, 'setWrongNetwork');
        }
      },
      
      // Reset completo
      reset: () => set(initialState, false, 'reset'),
      
      // Atualizadores em lote
      updateAccountData: (data) => {
        const currentState = get();
        const hasChanges = Object.keys(data).some(key => 
          currentState[key as keyof typeof currentState] !== data[key as keyof typeof data]
        );
        if (hasChanges) {
          set((state) => ({ ...state, ...data }), false, 'updateAccountData');
        }
      },
      
      updateChainData: (data) => {
        const currentState = get();
        const hasChanges = Object.keys(data).some(key => 
          currentState[key as keyof typeof currentState] !== data[key as keyof typeof data]
        );
        if (hasChanges) {
          set((state) => ({ ...state, ...data }), false, 'updateChainData');
        }
      },
    }),
    {
      name: 'wallet-store',
      enabled: import.meta.env.DEV,
    }
  )
);

// Seletores utilitários
export const useWalletAddress = () => useWalletStore((state) => state.address);
export const useWalletConnected = () => useWalletStore((state) => state.isConnected);
export const useWalletConnecting = () => useWalletStore((state) => state.isConnecting);
export const useWalletBalance = () => useWalletStore((state) => state.balance);
export const useWalletChain = () => useWalletStore((state) => ({
  chainId: state.chainId,
  chainName: state.chainName,
  chainIconUrl: state.chainIconUrl,
  isWrongNetwork: state.isWrongNetwork,
}));

// Selector para dados completos da conta
export const useWalletAccount = () => useWalletStore((state) => ({
  address: state.address,
  balance: state.balance,
  ensName: state.ensName,
  displayName: state.displayName,
  isConnected: state.isConnected,
}));

// Selector para status de conexão
export const useWalletStatus = () => useWalletStore((state) => ({
  isConnected: state.isConnected,
  isConnecting: state.isConnecting,
  isWrongNetwork: state.isWrongNetwork,
})); 