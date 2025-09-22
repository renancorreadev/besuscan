export const formatAddress = (addr: string | undefined) => {
  if (!addr) return 'Unknown';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export const formatBalance = (balance: string) => {
  const num = parseFloat(balance);
  if (isNaN(num)) return '0 ETH';

  // Convert from Wei to ETH
  const ethValue = num / 1e18;

  if (ethValue >= 1000000) return `${(ethValue / 1000000).toFixed(2)}M ETH`;
  if (ethValue >= 1000) return `${(ethValue / 1000).toFixed(2)}K ETH`;
  return `${ethValue.toFixed(4)} ETH`;
};

export const formatTimeAgo = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
};

export const formatNumber = (num: number | string | undefined) => {
  if (num === undefined || num === null) return '0';
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(value)) return '0';
  return value.toLocaleString();
};

export const getComplianceColor = (status: string) => {
  switch (status) {
    case 'compliant':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
    case 'non_compliant':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700';
    case 'under_review':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700';
  }
};

export const getRiskScoreColor = (score: number) => {
  if (score <= 2) return 'text-green-600 dark:text-green-400';
  if (score <= 5) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

export const copyToClipboard = async (text: string) => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for browsers that don't support the Clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    console.log('Endereço copiado:', text); // Para debug

    // Visual feedback - usando um approach mais simples
    // Você pode implementar um toast notification aqui se desejar

  } catch (err) {
    console.error('Falha ao copiar:', err);
  }
};

export const getMethodBadgeClass = (methodName: string) => {
  const method = methodName.toLowerCase();
  if (method.includes('transfer')) return 'method-badge-transfer';
  if (method.includes('approve')) return 'method-badge-approve';
  if (method.includes('swap')) return 'method-badge-swap';
  if (method.includes('mint')) return 'method-badge-mint';
  if (method.includes('burn')) return 'method-badge-burn';
  return 'glass-badge-info';
};

export const getInvolvementBadgeClass = (involvement: string) => {
  switch (involvement) {
    case 'emitter':
      return 'glass-badge-warning';
    case 'participant':
      return 'glass-badge-info';
    case 'recipient':
      return 'glass-badge-success';
    default:
      return 'glass-badge-neutral';
  }
}; 