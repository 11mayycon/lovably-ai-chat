import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

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
    // Register listener first to avoid missing auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Defer to avoid potential deadlocks
        setTimeout(() => {
          fetchUserRole(session.user!.id);
        }, 0);
      } else {
        setUserRole(null);
      }
    });

    checkAuth();

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserRole(session.user.id);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;

      const roles = (data ?? []).map((r: any) => r.role) as ("admin" | "support" | "super_admin")[];
      const resolvedRole = roles.includes("super_admin")
        ? "super_admin"
        : roles.includes("admin")
        ? "admin"
        : roles.includes("support")
        ? "support"
        : null;

      setUserRole(resolvedRole);
      return resolvedRole;
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error("Erro ao fazer login");

    // Resolve role and navigate
    const resolvedRole = await fetchUserRole(data.user.id);

    if (resolvedRole === "admin" || resolvedRole === "super_admin") {
      navigate("/admin/dashboard", { replace: true });
    } else if (resolvedRole === "support") {
      navigate("/support/select-room", { replace: true });
    } else {
      throw new Error("Usuário sem permissões adequadas");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
