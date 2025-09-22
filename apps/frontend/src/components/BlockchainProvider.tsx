import { useEffect } from 'react';
import { useBlockchainPolling } from '../stores/blockchainStore';

interface BlockchainProviderProps {
  children: React.ReactNode;
}

export const BlockchainProvider: React.FC<BlockchainProviderProps> = ({ children }) => {
  const { startPolling, cleanup } = useBlockchainPolling();

  useEffect(() => {
    // Iniciar polling quando o componente monta
    startPolling();

    // Cleanup quando desmonta
    return () => {
      cleanup();
    };
  }, [startPolling, cleanup]);

  // Parar polling quando a página perde foco (otimização)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cleanup();
      } else {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startPolling, cleanup]);

  return <>{children}</>;
}; 