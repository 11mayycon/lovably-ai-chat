import { NavLink, useLocation } from "react-router-dom";
import { Bot, LayoutDashboard, MessageSquare, Brain, Users, BarChart3, Settings, LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: MessageSquare, label: "Conectar WhatsApp", path: "/admin/whatsapp" },
  { icon: Brain, label: "Memória da IA", path: "/admin/ai-memory" },
  { icon: Users, label: "Usuários de Suporte", path: "/admin/support-users" },
  { icon: Users, label: "Gerenciar Salas", path: "/admin/support" },
  { icon: BarChart3, label: "Relatórios", path: "/admin/reports" },
  { icon: Settings, label: "Configurações", path: "/admin/settings" },
];

export const AdminSidebar = () => {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { open } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      {/* Logo */}
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="p-2 bg-gradient-primary rounded-lg flex-shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
          {open && (
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">ISA 2.5</h1>
              <p className="text-xs text-muted-foreground truncate">InovaPro Tech</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Menu Items */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <NavLink to={item.path}>
                        <Icon />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {/* Theme Toggle */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              tooltip={`Tema ${theme === "dark" ? "Claro" : "Escuro"}`}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
              <span>Tema {theme === "dark" ? "Claro" : "Escuro"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator />

        {/* User Profile */}
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user?.email?.[0].toUpperCase() || "A"}
              </div>
              {open && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs truncate">Administrador</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              )}
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sair">
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
