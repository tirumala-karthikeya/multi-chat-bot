
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BotProvider } from "./context/BotContext";
import Dashboard from "./components/Dashboard";
import ChatView from "./pages/ChatView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BotProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat/:botCode" element={<ChatView />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </BotProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
