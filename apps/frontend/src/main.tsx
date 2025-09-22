import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/index.css'

// Adicionar logs de requisições em desenvolvimento
if (import.meta.env.DEV) {
  console.log('🚀 Frontend iniciado em modo desenvolvimento');
  console.log('📊 Monitorando requisições...');

  // Interceptar requisições para logs
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    console.log('🌐 Requisição fetch:', args[0]);
    return originalFetch.apply(this, args);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
