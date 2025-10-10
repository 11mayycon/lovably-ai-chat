import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  userRole: "admin" | "support" | "super_admin" | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "support" | "super_admin" | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await apiClient.getCurrentUser();
      setUser(data.user);
      setUserRole(data.role);
    } catch (error) {
      console.error('Error checking auth:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const data = await apiClient.login(email, password);
      
      if (!data.token || !data.user) {
        throw new Error("Erro ao fazer login");
      }

      localStorage.setItem('token', data.token);
      setUser(data.user);
      setUserRole(data.role);

      // Navigate based on role
      if (data.role === "admin" || data.role === "super_admin") {
        navigate("/admin/dashboard");
      } else if (data.role === "support") {
        navigate("/support/select-room");
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    await apiClient.logout();
    setUser(null);
    setUserRole(null);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, userRole, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
