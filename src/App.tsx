import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import Inventory from "@/pages/Inventory";
import Warehouses from "@/pages/Warehouses";
import Shipments from "@/pages/Shipments";
import TrendRadar from "@/pages/TrendRadar";
import Orders from "@/pages/Orders";
import AIAgent from "@/pages/AIAgent";
import Costing from "@/pages/Costing";
import SettingsPage from "@/pages/SettingsPage";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/warehouses" element={<Warehouses />} />
        <Route path="/shipments" element={<Shipments />} />
        <Route path="/trends" element={<TrendRadar />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/ai-agent" element={<AIAgent />} />
        <Route path="/costing" element={<Costing />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
