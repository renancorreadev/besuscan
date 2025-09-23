
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BlockchainProvider } from "./components/BlockchainProvider";
import { Web3Provider } from "./components/providers/Web3Provider";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./components/auth/AuthProvider";
import Index from "./pages/Index";
import Transactions from "./pages/Transactions";
import Transaction from "./pages/Transaction";
import Accounts from "./pages/Accounts";
import Account from "./pages/Account";
import SmartContracts from "./pages/SmartContracts";
import SmartContract from "./pages/smart-contract";
import Blocks from "./pages/Blocks";
import Block from "./pages/Block";
import Events from "./pages/Events";
import Event from "./pages/Event";
import Validators from "./pages/Validators";
import NotFound from "./pages/NotFound";
import NetworkMetrics from "./pages/NetworkMetrics";
import Login from "./pages/Login";
import Register from "./pages/Register";
// import ChatButton from "./components/chat/ChatButton";

const queryClient = new QueryClient();

const App = () => (
  <Web3Provider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <BlockchainProvider>
            <div className="min-h-screen w-full">
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Rotas públicas - login e registro */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Todas as outras rotas são protegidas - requerem autenticação */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } />
                  <Route path="/transactions" element={
                    <ProtectedRoute>
                      <Transactions />
                    </ProtectedRoute>
                  } />
                  <Route path="/tx" element={
                    <ProtectedRoute>
                      <Transactions />
                    </ProtectedRoute>
                  } />
                  <Route path="/tx/:hash" element={
                    <ProtectedRoute>
                      <Transaction />
                    </ProtectedRoute>
                  } />
                  <Route path="/transaction/:hash" element={
                    <ProtectedRoute>
                      <Transaction />
                    </ProtectedRoute>
                  } />
                  <Route path="/accounts" element={
                    <ProtectedRoute>
                      <Accounts />
                    </ProtectedRoute>
                  } />
                  <Route path="/account/:address" element={
                    <ProtectedRoute>
                      <Account />
                    </ProtectedRoute>
                  } />
                  <Route path="/address/:address" element={
                    <ProtectedRoute>
                      <Account />
                    </ProtectedRoute>
                  } />
                  <Route path="/smart-contracts" element={
                    <ProtectedRoute>
                      <SmartContracts />
                    </ProtectedRoute>
                  } />
                  <Route path="/contracts" element={
                    <ProtectedRoute>
                      <SmartContracts />
                    </ProtectedRoute>
                  } />
                  <Route path="/smart-contract/:address" element={
                    <ProtectedRoute>
                      <SmartContract />
                    </ProtectedRoute>
                  } />
                  <Route path="/contract/:address" element={
                    <ProtectedRoute>
                      <SmartContract />
                    </ProtectedRoute>
                  } />
                  <Route path="/blocks" element={
                    <ProtectedRoute>
                      <Blocks />
                    </ProtectedRoute>
                  } />
                  <Route path="/block/:number" element={
                    <ProtectedRoute>
                      <Block />
                    </ProtectedRoute>
                  } />
                  <Route path="/events" element={
                    <ProtectedRoute>
                      <Events />
                    </ProtectedRoute>
                  } />
                  <Route path="/event/:id" element={
                    <ProtectedRoute>
                      <Event />
                    </ProtectedRoute>
                  } />
                  <Route path="/validators" element={
                    <ProtectedRoute>
                      <Validators />
                    </ProtectedRoute>
                  } />
                  <Route path="/validator/:address" element={
                    <ProtectedRoute>
                      <Validators />
                    </ProtectedRoute>
                  } />
                  <Route path="/network-metrics" element={
                    <ProtectedRoute>
                      <NetworkMetrics />
                    </ProtectedRoute>
                  } />

                  {/* Rotas protegidas - requerem autenticação de admin */}
                  <Route path="/admin" element={
                    <ProtectedRoute requireAdmin={true}>
                      <div className="p-8">
                        <h1 className="text-2xl font-bold">Painel Administrativo</h1>
                        <p className="text-muted-foreground">Esta é uma área restrita para administradores.</p>
                      </div>
                    </ProtectedRoute>
                  } />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={
                    <ProtectedRoute>
                      <NotFound />
                    </ProtectedRoute>
                  } />
                </Routes>
              </BrowserRouter>

              {/* Floating Chat Button - Available on all pages */}
              {/* <ChatButton /> */}
            </div>
          </BlockchainProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </Web3Provider>
);

export default App;
