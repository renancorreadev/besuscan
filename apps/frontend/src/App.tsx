
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BlockchainProvider } from "./components/BlockchainProvider";
import { Web3Provider } from "./components/providers/Web3Provider";
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
import ChatButton from "./components/chat/ChatButton";

const queryClient = new QueryClient();

const App = () => (
  <Web3Provider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BlockchainProvider>
          <div className="min-h-screen w-full">
            <Toaster />
            <Sonner />
            <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/tx" element={<Transactions />} />
            <Route path="/tx/:hash" element={<Transaction />} />
            <Route path="/transaction/:hash" element={<Transaction />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/account/:address" element={<Account />} />
            <Route path="/address/:address" element={<Account />} />
            <Route path="/smart-contracts" element={<SmartContracts />} />
            <Route path="/contracts" element={<SmartContracts />} />
            <Route path="/smart-contract/:address" element={<SmartContract />} />
            <Route path="/contract/:address" element={<SmartContract />} />
            <Route path="/blocks" element={<Blocks />} />
            <Route path="/block/:number" element={<Block />} />
            <Route path="/events" element={<Events />} />
            <Route path="/event/:id" element={<Event />} />
            <Route path="/validators" element={<Validators />} />
            <Route path="/validator/:address" element={<Validators />} />
            <Route path="/network-metrics" element={<NetworkMetrics />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        
        {/* Floating Chat Button - Available on all pages */}
        <ChatButton />
        </div>
      </BlockchainProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </Web3Provider>
);

export default App;
