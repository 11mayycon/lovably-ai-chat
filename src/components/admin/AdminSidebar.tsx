import { Link, useLocation } from "react-router-dom";
import { Bot, LayoutDashboard, MessageSquare, Brain, Users, BarChart3, Settings, LogOut, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: MessageSquare, label: "Conectar WhatsApp", path: "/admin/whatsapp" },
  { icon: Brain, label: "Memória da IA", path: "/admin/memory" },
  { icon: Users, label: "Gerenciar Suporte", path: "/admin/support" },
  { icon: BarChart3, label: "Relatórios", path: "/admin/reports" },
  { icon: Settings, label: "Configurações", path: "/admin/settings" },
];

export const AdminSidebar = () => {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="w-64 h-screen bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-primary rounded-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">ISA 2.5</h1>
            <p className="text-xs text-muted-foreground">InovaPro Tech</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-foreground hover:bg-accent"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle */}
      <div className="p-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDarkMode(!darkMode)}
          className="w-full justify-start gap-3"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>Tema {darkMode ? "Claro" : "Escuro"}</span>
        </Button>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
            A
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Administrador</p>
            <p className="text-xs text-muted-foreground">admin@empresa.com</p>
          </div>
        </div>
        <Button variant="destructive" size="sm" className="w-full justify-start gap-3">
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </Button>
      </div>
    </div>
  );
};
