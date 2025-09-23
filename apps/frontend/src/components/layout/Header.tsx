import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, Moon, Sun, Globe, ChevronDown, X, Home, Blocks, ArrowUpRight, Zap, Users, Activity, Eye, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { CacheIndicator } from '@/components/ui/cache-indicator';
import { CompactConnectButton } from '@/components/ui/connect-button';
import { AuthButton } from '@/components/auth/AuthButton';

import { API_BASE_URL } from '@/services/api';

// Interfaces para tipos de dados da API

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  // Modo escuro removido - apenas modo claro
  const [selectedNetwork, setSelectedNetwork] = useState('MainNet');
  const [selectedLanguage, setSelectedLanguage] = useState('EN');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Detectar a rota atual
  useEffect(() => {
    const updateCurrentPath = () => {
      const newPath = window.location.pathname;
      setCurrentPath(newPath);

    };

    // Atualizar no carregamento inicial
    updateCurrentPath();

    // Escutar mudanças de rota
    window.addEventListener('popstate', updateCurrentPath);
    window.addEventListener('hashchange', updateCurrentPath);

    // Verificar periodicamente para SPAs (React Router)
    const interval = setInterval(updateCurrentPath, 100);

    // Observar mudanças no DOM para SPAs
    const observer = new MutationObserver(updateCurrentPath);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('popstate', updateCurrentPath);
      window.removeEventListener('hashchange', updateCurrentPath);
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  // Função para verificar se um item está ativo
  const isActiveRoute = (path: string) => {
    if (path === '/') {
      return currentPath === '/' || currentPath === '';
    }

    // Casos especiais para rotas dinâmicas
    if (path === '/blocks') {
      return currentPath.startsWith('/block') || currentPath.startsWith('/blocks/');
    }

    if (path === '/transactions') {
      return currentPath.startsWith('/transactions') || currentPath.startsWith('/tx/');
    }

    if (path === '/accounts') {
      return currentPath.startsWith('/accounts') || currentPath.startsWith('/account/');
    }

    if (path === '/events') {
      return currentPath.startsWith('/events') || currentPath.startsWith('/event/');
    }

    return currentPath.startsWith(path);
  };

  // Função para obter classes do item de navegação
  const getNavItemClasses = (path: string) => {
    const baseClasses = "text-sm font-medium transition-colors duration-300 relative group py-2";
    const activeClasses = "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300";
    const inactiveClasses = "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400";

    return `${baseClasses} ${isActiveRoute(path) ? activeClasses : inactiveClasses}`;
  };

  // Função para obter classes da linha indicadora
  const getIndicatorClasses = (path: string) => {
    if (isActiveRoute(path)) {
      return "absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600";
    }
    return "absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 group-hover:w-full transition-all duration-300";
  };

  // Forçar modo claro
  useEffect(() => {
    const htmlElement = document.documentElement;
    htmlElement.classList.remove('dark');
    htmlElement.classList.add('light');
  }, []);

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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    // Prevent scrolling when menu is open
    document.body.style.overflow = !isMobileMenuOpen ? 'hidden' : 'auto';
  };

  // Close mobile menu on route change
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo section - make it smaller on mobile */}
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-200">
                <img
                  src="/Logo.png"
                  alt="BesuScan"
                  className="w-[100%] h-[80px] rounded-xl object-contain flex-shrink-0 p-4"
                />
              </Link>
            </div>

            {/* Search Bar - Original Etherscan style for desktop */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-8">
              <form onSubmit={handleSearch} className="relative group w-full">
                <div className="relative bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 shadow-sm hover:shadow-md w-full">
                  {isSearching ? (
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  )}
                  <Input
                    type="text"
                    placeholder="Search by Address / Txn Hash / Block / Token..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={isSearching}
                    className="pl-12 h-12 bg-transparent border-0 focus:ring-0 focus:outline-none rounded-xl text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 w-full disabled:opacity-50"
                  />
                </div>
              </form>
            </div>

            {/* Controls - Modify for mobile */}
            <div className="flex items-center space-x-2 md:space-x-3">
              {/* Network Selector - Hide on mobile */}
              {/* <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 rounded-lg text-gray-900 dark:text-white">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      {selectedNetwork}
                      <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 rounded-xl shadow-xl">
                    <DropdownMenuItem onClick={() => setSelectedNetwork('MainNet')} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      MainNet
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedNetwork('TestNet')} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                      TestNet
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedNetwork('DevNet')} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                      DevNet
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div> */}

              {/* Language Selector - Hide on mobile */}
              {/* <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-10 px-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 rounded-lg">
                      <Globe className="h-4 w-4 mr-1 text-gray-600 dark:text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">{selectedLanguage}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 rounded-xl shadow-xl">
                    <DropdownMenuItem onClick={() => setSelectedLanguage('EN')} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white">
                      🇺🇸 English
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedLanguage('PT')} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white">
                      🇧🇷 Português
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedLanguage('ES')} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white">
                      🇪🇸 Español
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div> */}

              {/* Theme toggle removido - apenas modo claro */}

              {/* Auth Button */}
              <div className="hidden md:block">
                <AuthButton />
              </div>

              {/* Connect Wallet - Hide on mobile */}
              <div className="hidden md:block">
                <CompactConnectButton className="h-10" />
              </div>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileMenu}
                className="md:hidden h-8 w-8 px-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {isMobileMenuOpen ? (
                  <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Menu className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                )}
              </Button>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8 py-4 border-t border-gray-100 dark:border-gray-800">
            <a
              href="/"
              className={getNavItemClasses('/')}
            >
              Home
              <div className={getIndicatorClasses('/')}></div>
            </a>
            <a
              href="/blocks"
              className={getNavItemClasses('/blocks')}
            >
              Blocks
              <div className={getIndicatorClasses('/blocks')}></div>
            </a>
            <a
              href="/transactions"
              className={getNavItemClasses('/transactions')}
            >
              Transactions
              <div className={getIndicatorClasses('/transactions')}></div>
            </a>
            <a
              href="/accounts"
              className={getNavItemClasses('/accounts')}
            >
              Accounts
              <div className={getIndicatorClasses('/accounts')}></div>
            </a>
            <a
              href="/validators"
              className={getNavItemClasses('/validators')}
            >
              Validators
              <div className={getIndicatorClasses('/validators')}></div>
            </a>
            <a
              href="/events"
              className={getNavItemClasses('/events')}
            >
              Events
              <div className={getIndicatorClasses('/events')}></div>
            </a>
            <a
              href="/contracts"
              className={getNavItemClasses('/contracts')}
            >
              Smart Contracts
              <div className={getIndicatorClasses('/contracts')}></div>
            </a>
            {/* <a
              href="/apis"
              className={getNavItemClasses('/apis')}
            >
              APIs
              <div className={getIndicatorClasses('/apis')}></div>
            </a>
            <a
              href="/charts"
              className={getNavItemClasses('/charts')}
            >
              Charts & Stats
              <div className={getIndicatorClasses('/charts')}></div>
            </a> */}
          </nav>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={toggleMobileMenu}>
          <div
            className="fixed inset-y-0 right-0 w-64 bg-white dark:bg-gray-900 shadow-xl p-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile Search */}
            <div className="mb-6">
              <form onSubmit={handleSearch} className="relative">
                <div className="relative bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                  {isSearching ? (
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  )}
                  <Input
                    type="text"
                    placeholder="Search by Address / Txn Hash..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={isSearching}
                    className="pl-10 h-10 bg-transparent border-0 focus:ring-0 focus:outline-none disabled:opacity-50 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  />
                </div>
              </form>
            </div>

            {/* Mobile Navigation Links */}
            <nav className="flex flex-col space-y-4">
              <a href="/" className={`${getNavItemClasses('/')} block`}>
                Home
              </a>
              <a href="/blocks" className={`${getNavItemClasses('/blocks')} block`}>
                Blocks
              </a>
              <a href="/transactions" className={`${getNavItemClasses('/transactions')} block`}>
                Transactions
              </a>
              <a href="/accounts" className={`${getNavItemClasses('/accounts')} block`}>
                Accounts
              </a>
              <a href="/validators" className={`${getNavItemClasses('/validators')} block`}>
                Validators
              </a>
              <a href="/events" className={`${getNavItemClasses('/events')} block`}>
                Events
              </a>
              <a href="/contracts" className={`${getNavItemClasses('/contracts')} block`}>
                Smart Contracts
              </a>
              <a href="/apis" className={`${getNavItemClasses('/apis')} block`}>
                APIs
              </a>
              <a href="/charts" className={`${getNavItemClasses('/charts')} block`}>
                Charts & Stats
              </a>
            </nav>

            {/* Mobile Network & Language Selectors */}
            <div className="mt-6 space-y-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      {selectedNetwork}
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                  <DropdownMenuItem onClick={() => setSelectedNetwork('MainNet')} className="text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    MainNet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedNetwork('TestNet')} className="text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                    TestNet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedNetwork('DevNet')} className="text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                    DevNet
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      {selectedLanguage}
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                  <DropdownMenuItem onClick={() => setSelectedLanguage('EN')} className="text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    🇺🇸 English
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedLanguage('PT')} className="text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    🇧🇷 Português
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedLanguage('ES')} className="text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    🇪🇸 Español
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="space-y-2">
                <AuthButton />
                <CompactConnectButton className="w-full" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
