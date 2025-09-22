// Configuração de endpoints RPC para diferentes ambientes
export const RPC_CONFIG = {
    name: 'Besu',
    chainId: 1337,
    explorer: 'https://besuscan.hubweb3.com',
    // Desenvolvimento: usar proxy local para evitar mixed-content
    development: {
        primary: '/rpc',    // Usar proxy local
        fallback: [],       // Removido fallback local
    },

    // Localhost: usar proxy local também
    localhost: {
        primary: '/rpc',    // Usar proxy local
        fallback: [],
    },

    // Produção: usar proxy local
    production: {
        primary: '/rpc',    // Usar proxy local
        fallback: [],
    },

    // Configuração da rede
    network: {
        chainId: 1337,
        name: 'HubWeb3 Besu Network',
        currency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        explorer: 'https://besuscan.hubweb3.com',
    }
};

// Função para obter URLs RPC baseadas no ambiente
export const getRpcUrls = () => {
    // Verificar variáveis de ambiente
    const useLocalRpc = import.meta.env.VITE_USE_LOCAL_RPC === 'true';
    const customRpcUrl = import.meta.env.VITE_RPC_URL;
    const isDev = import.meta.env.DEV;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // NOVA LÓGICA: Detectar se estamos em um ambiente Docker/desenvolvimento
    const isDockerEnv = import.meta.env.DOCKER_ENV === 'true';
    const nodeEnv = import.meta.env.NODE_ENV;
    const mode = import.meta.env.MODE;

    let config;

    // 1. Custom RPC URL
    // 2. VITE_USE_LOCAL_RPC=true
    // 3. Docker environment com NODE_ENV=development
    // 4. Localhost detection
    // 5. DEV mode
    // 6. Production (padrão)

    if (customRpcUrl) {
        return {
            default: { http: [customRpcUrl] },
            public: { http: [customRpcUrl] },
        };
    } else if (useLocalRpc) {
        config = RPC_CONFIG.localhost;
    } else if (isDockerEnv && nodeEnv === 'development') {
        config = RPC_CONFIG.localhost;
    } else if (isLocalhost) {
        config = RPC_CONFIG.localhost;
    } else if (isDev || mode === 'development') {
        config = RPC_CONFIG.development;
    } else {
        config = RPC_CONFIG.production;
    }

    const urls = [config.primary, ...config.fallback].filter(Boolean);

    return {
        default: { http: urls },
        public: { http: urls },
    };
};

// Função para testar conectividade RPC
export const testRpcConnection = async (url: string): Promise<boolean> => {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_chainId',
                params: [],
                id: 1,
            }),
        });

        if (!response.ok) return false;

        const data = await response.json();
        return data.result !== undefined;
    } catch (error) {
        console.warn(`RPC test failed for ${url}:`, error);
        return false;
    }
};
