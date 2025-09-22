export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const truncateAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

export const formatEther = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0 ETH';
  
  if (num === 0) return '0 ETH';
  
  // Convert from wei to ether
  const ether = num / 1e18;
  
  if (ether < 0.0001) {
    return `${(ether * 1e6).toFixed(2)} μETH`;
  } else if (ether < 0.1) {
    return `${(ether * 1e3).toFixed(4)} mETH`;
  } else {
    return `${ether.toFixed(4)} ETH`;
  }
};

export const formatNumber = (value: number): string => {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(2)}K`;
  }
  return value.toLocaleString();
};

export const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  
  if (diff < 60) {
    return `${Math.floor(diff)}s ago`;
  } else if (diff < 3600) {
    return `${Math.floor(diff / 60)}m ago`;
  } else if (diff < 86400) {
    return `${Math.floor(diff / 3600)}h ago`;
  } else if (diff < 2592000) {
    return `${Math.floor(diff / 86400)}d ago`;
  } else {
    return `${Math.floor(diff / 2592000)}mo ago`;
  }
};

export const validateAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const validateInput = (value: string, type: string): { valid: boolean; error?: string } => {
  if (!value.trim()) {
    return { valid: false, error: 'Campo obrigatório' };
  }
  
  switch (type) {
    case 'address':
      if (!validateAddress(value)) {
        return { valid: false, error: 'Endereço Ethereum inválido' };
      }
      break;
    case 'uint256':
    case 'uint':
      if (!/^\d+$/.test(value)) {
        return { valid: false, error: 'Deve ser um número inteiro positivo' };
      }
      break;
    case 'bool':
      if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
        return { valid: false, error: 'Deve ser true, false, 1 ou 0' };
      }
      break;
    case 'bytes32':
      if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
        return { valid: false, error: 'Deve ser um hash de 32 bytes (66 caracteres começando com 0x)' };
      }
      break;
  }
  
  return { valid: true };
};

export const getInputPlaceholder = (type: string): string => {
  switch (type) {
    case 'address':
      return '0x742d35Cc6634C0532925a3b8D0c9e8b72d0c0000';
    case 'uint256':
    case 'uint':
      return '1000000000000000000';
    case 'bool':
      return 'true';
    case 'string':
      return 'Digite o texto aqui';
    case 'bytes32':
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    default:
      return `Digite o valor ${type}`;
  }
};

export const getInputHelperText = (type: string): string => {
  switch (type) {
    case 'uint256':
      return 'Digite um número inteiro positivo (use wei para ETH: 1 ETH = 1000000000000000000)';
    case 'bool':
      return 'Digite "true", "false", "1", ou "0"';
    case 'address':
      return 'Digite um endereço Ethereum válido (42 caracteres começando com 0x)';
    case 'bytes32':
      return 'Digite um hash de 32 bytes (66 caracteres hexadecimais começando com 0x)';
    case 'string':
      return 'Digite qualquer texto';
    default:
      if (type.includes('[]')) {
        return 'Digite array JSON: ["item1", "item2"] ou separado por vírgula: item1, item2';
      }
      return '';
  }
};

export const formatContractType = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'erc20':
      return 'Token ERC-20';
    case 'erc721':
      return 'NFT ERC-721';
    case 'erc1155':
      return 'Multi-Token ERC-1155';
    case 'proxy':
      return 'Contrato Proxy';
    case 'multisig':
      return 'Multi-Signature';
    default:
      return type;
  }
};

export const getContractTypeColor = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'erc20':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'erc721':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'erc1155':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'proxy':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    case 'multisig':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

export const getFunctionStateMutabilityColor = (stateMutability: string): string => {
  switch (stateMutability) {
    case 'view':
    case 'pure':
      return 'border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300';
    case 'nonpayable':
      return 'border-green-200 dark:border-green-700 text-green-700 dark:text-green-300';
    case 'payable':
      return 'border-red-200 dark:border-red-700 text-red-700 dark:text-red-300';
    default:
      return 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300';
  }
};

export const isReadOnlyFunction = (stateMutability: string): boolean => {
  return stateMutability === 'view' || stateMutability === 'pure';
};

export const isPayableFunction = (stateMutability: string): boolean => {
  return stateMutability === 'payable';
}; 