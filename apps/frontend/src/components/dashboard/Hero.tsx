import React, { useState } from 'react';
import { Search, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_BASE_URL } from '@/services/api';

const Hero = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const isSmartContract = async (address: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/${address}/is-contract`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.success && data.is_contract;
    } catch (err) {
      console.error('Failed to check contract status:', err);
      return false;
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    const searchValue = searchQuery.trim();
    
    try {
      // Detectar tipo de busca e redirecionar para página específica
      if (searchValue.startsWith('0x') && searchValue.length === 66) {
        // É um hash de transação (64 caracteres + 0x) - redirecionar para página da transação
        window.location.href = `/tx/${searchValue}`;
      } else if (searchValue.startsWith('0x') && searchValue.length === 42) {
        // É um endereço (40 caracteres + 0x) - verificar se é um contrato
        const isContract = await isSmartContract(searchValue);
        if (isContract) {
          // É um smart contract - redirecionar para página de contratos
          window.location.href = `/smart-contract/${searchValue}`;
        } else {
          // É uma conta EOA - redirecionar para página da conta
          window.location.href = `/account/${searchValue}`;
        }
      } else if (/^\d+$/.test(searchValue)) {
        // É um número de bloco - redirecionar para página do bloco
        const blockNumber = parseInt(searchValue);
        if (blockNumber >= 0) {
          window.location.href = `/block/${blockNumber}`;
        }
      } else {
        // Busca genérica - redirecionar para transações com busca
        window.location.href = `/transactions?search=${encodeURIComponent(searchValue)}`;
      }
    } catch (err) {
      console.error('Erro na busca:', err);
      // Em caso de erro, redirecionar para transações
      window.location.href = `/transactions?search=${encodeURIComponent(searchValue)}`;
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative overflow-hidden py-16 md:py-24">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-5xl mx-auto">
          {/* Enhanced Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 mb-8 animate-fade-in hover:scale-105 transition-transform duration-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Live QBFT Consensus</span>
          </div>

          {/* Main heading with Etherscan style */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Hyperledger Besu
            </span>
            <br />
            <span className="text-gray-900 dark:text-white">Block Explorer</span>
          </h1>
          
          {/* Enhanced subtitle */}
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto animate-fade-in leading-relaxed" style={{ animationDelay: '0.2s' }}>
            The leading Hyperledger Besu blockchain explorer with real-time QBFT consensus monitoring, 
            transaction tracking, and network analytics
          </p>

          {/* Enhanced Search section with Etherscan styling */}
          <div className="max-w-3xl mx-auto mb-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <form onSubmit={handleSearch} className="relative">
              <div className="relative bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-2xl p-2 shadow-lg hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 group">
                <div className="flex items-center">
                  <div className="relative flex-1">
                    {isSearching ? (
                      <div className="absolute left-6 top-1/2 transform -translate-y-1/2 h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin z-10"></div>
                    ) : (
                      <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10" />
                    )}
                    <Input
                      type="text"
                      placeholder="Search by Address / Txn Hash / Block / Token..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={isSearching}
                      className="pl-16 pr-6 h-14 bg-transparent border-0 focus:ring-0 focus:outline-none text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 text-base font-medium disabled:opacity-50"
                    />
                  </div>
                  <Button 
                    type="submit"
                    disabled={isSearching}
                    className="h-12 px-8 mr-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isSearching ? (
                      <>
                        <div className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Hero;
