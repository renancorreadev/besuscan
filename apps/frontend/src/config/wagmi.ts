import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { defineChain, http } from 'viem'
import { RPC_CONFIG, getRpcUrls } from './rpc'

// Definir a rede Hyperledger Besu customizada
const besuNetwork = defineChain({
  id: RPC_CONFIG.network.chainId,
  name: RPC_CONFIG.network.name,
  nativeCurrency: RPC_CONFIG.network.currency,
  rpcUrls: getRpcUrls(),
  blockExplorers: {
    default: {
      name: 'BesuScan',
      url: RPC_CONFIG.network.explorer,
    },
  },
  contracts: {},
})

// Configuração do RainbowKit
export const config = getDefaultConfig({
  appName: 'BesuScan Explorer',
  projectId: 'besu-explorer',
  chains: [besuNetwork],
  transports: {
    [besuNetwork.id]: http(getRpcUrls().default.http[0], {
      timeout: 30000,
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  ssr: false,
})
