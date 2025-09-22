import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  optimizeDeps: {
    exclude: ['lovable-tagger'],
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-slot',
      'class-variance-authority',
      'clsx',
      'tailwind-merge'
    ],
    force: mode === 'development'
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "besuscan.com",
      "besuscan.hubweb3.com",
      "147.93.11.54",
      "144.22.179.183"
    ],
    // Adicionar logs detalhados
    hmr: {
      overlay: true,
    },
    // Logs de requisições
    middlewareMode: false,
    // Mostrar logs de proxy
    proxy: {
      '/api/llm-chat': {
        target: 'http://llm-chat:8082',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/llm-chat/, '/api/v1'),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error for /api/llm-chat:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying request to llm-chat:', req.url);
          });
        }
      },
      '/api': {
        target: 'http://api:8080',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying request to API:', req.url);
          });
        }
      },
      '/rpc': {
        target: 'http://144.22.179.183',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/rpc/, ''),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error for RPC:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying request to RPC:', req.url);
            console.log('Proxy target:', proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Proxy response status:', proxyRes.statusCode);
            console.log('Proxy response headers:', proxyRes.headers);
          });
        }
      },
    }
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  publicDir: 'public',
}));
