import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { AdminLayout } from "./components/admin/AdminLayout";
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import Dashboard from "./pages/admin/Dashboard";
import WhatsAppConnection from "./pages/admin/WhatsAppConnection";
import AIMemory from "./pages/admin/AIMemory";
import SupportUsers from "./pages/admin/SupportUsers";
import ManageSupport from "./pages/admin/ManageSupport";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";
import SelectRoom from "./pages/support/SelectRoom";
import Chat from "./pages/support/Chat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/setup" replace />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/dashboard" element={<AdminLayout><Dashboard /></AdminLayout>} />
            <Route path="/admin/whatsapp" element={<AdminLayout><WhatsAppConnection /></AdminLayout>} />
            <Route path="/admin/ai-memory" element={<AdminLayout><AIMemory /></AdminLayout>} />
            <Route path="/admin/support-users" element={<AdminLayout><SupportUsers /></AdminLayout>} />
            <Route path="/admin/support" element={<AdminLayout><ManageSupport /></AdminLayout>} />
            <Route path="/admin/reports" element={<AdminLayout><Reports /></AdminLayout>} />
            <Route path="/admin/settings" element={<AdminLayout><Settings /></AdminLayout>} />
            <Route path="/support/select-room" element={<SelectRoom />} />
            <Route path="/support/chat" element={<Chat />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
