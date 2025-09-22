import React from 'react';

import NetworkUtilization from '@/components/NetworkUtilization';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const NetworkMetrics: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
         <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Métricas da Rede
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitoramento em tempo real da utilização e performance da rede blockchain
          </p>
        </div>
        
        <NetworkUtilization refreshInterval={15000} />
      </main>

      <Footer />
    </div>
  );
};

export default NetworkMetrics; 