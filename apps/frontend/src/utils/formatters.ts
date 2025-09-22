export const formatNumber = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null) return '0';
  
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  
  if (isNaN(numValue)) return '0';
  
  return numValue.toLocaleString('pt-BR');
};

export const formatTimestamp = (timestamp: string | number): string => {
  if (!timestamp) return 'N/A';
  
  let date: Date;
  
  // Se for número (Unix timestamp), converter para Date
  if (typeof timestamp === 'number') {
    date = new Date(timestamp * 1000); // Unix timestamp está em segundos
  } else {
    // Se for string ISO
    date = new Date(timestamp);
  }
  
  if (isNaN(date.getTime())) return 'N/A';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s atrás`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m atrás`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h atrás`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d atrás`;
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months}mo atrás`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years}a atrás`;
  }
}; 