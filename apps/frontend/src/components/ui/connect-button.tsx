import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  ChevronDown, 
  Copy, 
  ExternalLink, 
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWalletSync } from '@/hooks/useWalletSync';

interface CustomConnectButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  showBalance?: boolean;
  showChain?: boolean;
}

export const CustomConnectButton: React.FC<CustomConnectButtonProps> = ({
  className,
  variant = 'default',
  size = 'default',
  showBalance = true,
  showChain = true,
}) => {
  // Hook removido - agora usando useWalletSync dentro do render

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        // Sincronizar com o store Zustand usando o hook personalizado
        useWalletSync({ account, chain, mounted });

        // Não renderizar até estar montado
        if (!mounted) {
          return (
            <Button
              variant={variant}
              size={size}
              disabled
              className={cn("min-w-[120px]", className)}
            >
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </Button>
          );
        }

        // Estado desconectado
        if (!account || !chain) {
          return (
            <Button
              onClick={openConnectModal}
              variant={variant}
              size={size}
              className={cn(
                "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105",
                className
              )}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Connect Wallet
            </Button>
          );
        }

        // Rede não suportada
        if (chain.unsupported) {
          return (
            <Button
              onClick={openChainModal}
              variant="destructive"
              size={size}
              className={cn(
                "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg",
                className
              )}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Wrong Network
            </Button>
          );
        }

        // Estado conectado
        return (
          <div className={cn("flex items-center gap-2", className)}>
            {/* Botão da rede */}
            {showChain && (
              <Button
                onClick={openChainModal}
                variant="outline"
                size={size}
                className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  {chain.hasIcon && chain.iconUrl && (
                    <div
                      className="w-4 h-4 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800"
                      style={{
                        background: chain.iconBackground,
                      }}
                    >
                      <img
                        alt={chain.name ?? 'Chain icon'}
                        src={chain.iconUrl}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {chain.name}
                  </span>
                  <CheckCircle className="h-3 w-3 text-green-500" />
                </div>
              </Button>
            )}

            {/* Botão da conta */}
            <Button
              onClick={openAccountModal}
              variant="outline"
              size={size}
              className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 min-w-[140px]"
            >
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600"></div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {account.displayName}
                  </span>
                  {showBalance && account.displayBalance && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {account.displayBalance}
                    </span>
                  )}
                </div>
                <ChevronDown className="h-3 w-3 text-gray-400" />
              </div>
            </Button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

// Componente compacto para header
export const CompactConnectButton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <CustomConnectButton
      className={className}
      variant="outline"
      size="sm"
      showBalance={false}
      showChain={false}
    />
  );
};

// Componente completo para páginas
export const FullConnectButton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <CustomConnectButton
      className={className}
      variant="default"
      size="default"
      showBalance={true}
      showChain={true}
    />
  );
};

export default CustomConnectButton; 