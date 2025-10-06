import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { AdminLayout } from "./components/admin/AdminLayout";
import LandingPage from "./pages/LandingPage";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SupportLogin from "./pages/SupportLogin";
import AdminLogin from "./pages/AdminLogin";
import Setup from "./pages/Setup";
import Dashboard from "./pages/admin/Dashboard";
import WhatsAppConnection from "./pages/admin/WhatsAppConnection";
import AIMemory from "./pages/admin/AIMemory";
import AIChat from "./pages/admin/AIChat";
import SupportUsers from "./pages/admin/SupportUsers";
import ManageSupport from "./pages/admin/ManageSupport";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";
import UsersManagement from "./pages/admin/UsersManagement";
import RoomsList from "./pages/support/RoomsList";
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
            <Route path="/" element={<LandingPage />} />
            <Route path="/cadastro" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/painel" element={<DashboardPage />} />
            <Route path="/support-login" element={<SupportLogin />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminLayout><Dashboard /></AdminLayout>} />
            <Route path="/admin/users" element={<AdminLayout><UsersManagement /></AdminLayout>} />
            <Route path="/admin/whatsapp" element={<AdminLayout><WhatsAppConnection /></AdminLayout>} />
            <Route path="/admin/ai-memory" element={<AdminLayout><AIMemory /></AdminLayout>} />
            <Route path="/admin/ai-chat" element={<AdminLayout><AIChat /></AdminLayout>} />
            <Route path="/admin/support-users" element={<AdminLayout><SupportUsers /></AdminLayout>} />
            <Route path="/admin/support" element={<AdminLayout><ManageSupport /></AdminLayout>} />
            <Route path="/admin/reports" element={<AdminLayout><Reports /></AdminLayout>} />
            <Route path="/admin/settings" element={<AdminLayout><Settings /></AdminLayout>} />
            <Route path="/support/rooms" element={<RoomsList />} />
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
