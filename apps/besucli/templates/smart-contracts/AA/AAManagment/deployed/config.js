// Configuração do Sistema AA Banking Deployado
// Rede: Besu Local (Chain ID: 1337)
// Data: 25 de Janeiro de 2025

export const AA_BANKING_CONFIG = {
    network: {
        name: "Besu Local",
        chainId: 1337,
        rpcUrl: "http://144.22.179.183",
        blockExplorer: "http://144.22.179.183:3000"
    },

    contracts: {
        entryPoint: "0xdB226C0C56fDE2A974B11bD3fFc481Da9e803912",
        bankManager: "0xF60AA2e36e214F457B625e0CF9abd89029A0441e",
        accountImplementation: "0x524db0420D1B8C3870933D1Fddac6bBaa63C2Ca6",
        kycAmlValidator: "0x8D5C581dEc763184F72E9b49E50F4387D35754D8",
        transactionLimits: "0x3416B85fDD6cC143AEE2d3cCD7228d7CB22b564a",
        multiSigValidator: "0x29209C1392b7ebe91934Ee9Ef4C57116761286F8",
        socialRecovery: "0xF6757ee0d75AE430Ec148850c16aA1F0e8e35e59",
        auditLogger: "0x6C59E8111D3D59512e39552729732bC09549daF8"
    },

    roles: {
        deployer: "0xB40061C7bf8394eb130Fcb5EA06868064593BFAa",
        bankAdmin: "0xB40061C7bf8394eb130Fcb5EA06868064593BFAa",
        complianceOfficer: "0xB40061C7bf8394eb130Fcb5EA06868064593BFAa",
        riskManager: "0xB40061C7bf8394eb130Fcb5EA06868064593BFAa"
    },

    limits: {
        daily: "10000000000000000000000", // 10,000 ETH
        weekly: "50000000000000000000000", // 50,000 ETH
        monthly: "200000000000000000000000", // 200,000 ETH
        transaction: "5000000000000000000000", // 5,000 ETH
        multiSigThreshold: "10000000000000000000000" // 10,000 ETH
    },

    riskThresholds: {
        low: 20,
        medium: 50,
        high: 80,
        critical: 100
    },

    velocity: {
        limit: 10,
        window: 3600, // 1 hora em segundos
        kycValidity: 31536000 // 365 dias em segundos
    }
};

// ABI básico para interação
export const AABANK_MANAGER_ABI = [
    "function totalAccounts() view returns (uint256)",
    "function activeAccounts() view returns (uint256)",
    "function globalLimits() view returns (uint256,uint256,uint256,uint256,uint256)",
    "function getSystemStats() view returns (uint256,uint256,uint256,uint256)",
    "function createAccount(address owner, bytes32 bankId) returns (address)",
    "function getAccountInfo(address account) view returns (tuple(address owner, bytes32 bankId, bool isActive, uint256 createdAt))"
];

export const KYC_AML_VALIDATOR_ABI = [
    "function validateKYC(address user, bytes calldata kycData) returns (bool)",
    "function validateAML(address user, uint256 amount) returns (bool)",
    "function getRiskScore(address user) view returns (uint256)",
    "function isKYCValid(address user) view returns (bool)"
];

export const TRANSACTION_LIMITS_ABI = [
    "function checkLimits(address user, uint256 amount) view returns (bool)",
    "function getDailyUsage(address user) view returns (uint256)",
    "function getWeeklyUsage(address user) view returns (uint256)",
    "function getMonthlyUsage(address user) view returns (uint256)"
];

// Funções utilitárias
export const utils = {
    // Converter wei para ETH
    weiToEth: (wei) => {
        return (parseInt(wei) / Math.pow(10, 18)).toFixed(4);
    },

    // Converter ETH para wei
    ethToWei: (eth) => {
        return (parseFloat(eth) * Math.pow(10, 18)).toString();
    },

    // Verificar se endereço é válido
    isValidAddress: (address) => {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    },

    // Formatar endereço para exibição
    formatAddress: (address) => {
        if (!address) return "";
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
};

export default AA_BANKING_CONFIG;
