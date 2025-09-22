import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { apiService, BlockResponse } from '../services/api';

interface BlockchainState {
  // Data
  latestBlock: BlockResponse['data'] | null;
  networkStats: any | null;
  
  // UI State
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Intervals
  latestBlockInterval: NodeJS.Timeout | null;
  statsInterval: NodeJS.Timeout | null;
  
  // Actions
  setLatestBlock: (block: BlockResponse['data']) => void;
  setNetworkStats: (stats: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async Actions
  fetchLatestBlock: () => Promise<void>;
  fetchNetworkStats: () => Promise<void>;
  fetchAllData: () => Promise<void>;
  
  // Lifecycle
  startPolling: () => void;
  stopPolling: () => void;
  cleanup: () => void;
}

export const useBlockchainStore = create<BlockchainState>()(
  devtools(
    (set, get) => ({
      // Initial State
      latestBlock: null,
      networkStats: null,
      loading: false,
      error: null,
      lastUpdated: null,
      latestBlockInterval: null,
      statsInterval: null,

      // Sync Actions
      setLatestBlock: (block) =>
        set(
          { 
            latestBlock: block, 
            lastUpdated: new Date(),
            error: null 
          },
          false,
          'setLatestBlock'
        ),

      setNetworkStats: (stats) =>
        set(
          { 
            networkStats: stats, 
            lastUpdated: new Date(),
            error: null 
          },
          false,
          'setNetworkStats'
        ),

      setLoading: (loading) =>
        set({ loading }, false, 'setLoading'),

      setError: (error) =>
        set({ error }, false, 'setError'),

      // Async Actions (bound to store instance)
      fetchLatestBlock: async () => {
        const state = get();
        try {
          const response = await apiService.getLatestBlock();
          
          if (response.success) {
            state.setLatestBlock(response.data);
          } else {
            state.setError('Failed to fetch latest block');
          }
        } catch (err) {
          state.setError(err instanceof Error ? err.message : 'Error fetching latest block');
          console.error('Error fetching latest block:', err);
        }
      },

      fetchNetworkStats: async () => {
        const state = get();
        try {
          // Try dashboard API first for comprehensive data
          const dashboardResponse = await apiService.getDashboardData();
          
          if (dashboardResponse.success && dashboardResponse.data.network_stats) {
            state.setNetworkStats(dashboardResponse.data.network_stats);
            return;
          }
          
          // Fallback to block stats
          const response = await apiService.getBlockStats();
          
          if (response.success) {
            state.setNetworkStats(response.data);
          } else {
            state.setError('Failed to fetch network stats');
          }
        } catch (err) {
          state.setError(err instanceof Error ? err.message : 'Error fetching network stats');
          console.error('Error fetching network stats:', err);
        }
      },

      fetchAllData: async () => {
        const state = get();
        
        try {
          state.setError(null);
          
          if (!state.latestBlock) {
            state.setLoading(true);
          }

          // Fetch both in parallel
          await Promise.all([
            state.fetchLatestBlock(),
            state.fetchNetworkStats(),
          ]);
        } finally {
          state.setLoading(false);
        }
      },

      // Polling Management
      startPolling: () => {
        const state = get();
        
        // Clear existing intervals
        state.stopPolling();
        
        // Initial fetch
        state.fetchAllData();
        
        // Latest block every 3 seconds (frequent, lightweight)
        const latestBlockInterval = setInterval(() => {
          state.fetchLatestBlock();
        }, 3000);
        
        // Network stats every 15 seconds (less frequent, heavier)
        const statsInterval = setInterval(() => {
          state.fetchNetworkStats();
        }, 15000);
        
        set({ 
          latestBlockInterval, 
          statsInterval 
        }, false, 'startPolling');
      },

      stopPolling: () => {
        const { latestBlockInterval, statsInterval } = get();
        
        if (latestBlockInterval) {
          clearInterval(latestBlockInterval);
        }
        
        if (statsInterval) {
          clearInterval(statsInterval);
        }
        
        set({ 
          latestBlockInterval: null, 
          statsInterval: null 
        }, false, 'stopPolling');
      },

      cleanup: () => {
        get().stopPolling();
      },
    }),
    {
      name: 'blockchain-store', // Para DevTools
    }
  )
);

// Hooks otimizados para componentes específicos
export const useLatestBlock = () => ({
  block: useBlockchainStore((state) => state.latestBlock),
  loading: useBlockchainStore((state) => state.loading),
  error: useBlockchainStore((state) => state.error),
  lastUpdated: useBlockchainStore((state) => state.lastUpdated),
});

export const useNetworkStats = () => ({
  stats: useBlockchainStore((state) => state.networkStats),
  loading: useBlockchainStore((state) => state.loading),
  error: useBlockchainStore((state) => state.error),
  lastUpdated: useBlockchainStore((state) => state.lastUpdated),
});

// Hook para controle do polling - apenas retorna as funções
export const useBlockchainPolling = () => ({
  startPolling: useBlockchainStore.getState().startPolling,
  stopPolling: useBlockchainStore.getState().stopPolling,
  cleanup: useBlockchainStore.getState().cleanup,
}); 