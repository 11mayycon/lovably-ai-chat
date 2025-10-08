import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabasePublic } from "@/lib/supabase-public-client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: "admin" | "support" | "super_admin" | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "support" | "super_admin" | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabasePublic.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user roles
          setTimeout(async () => {
            const { data: rolesData } = await supabasePublic
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id);
            
            if (rolesData && rolesData.length > 0) {
              const roles = rolesData.map(r => r.role);
              const role = roles.includes("super_admin") 
                ? "super_admin" 
                : roles.includes("admin")
                ? "admin"
                : roles.includes("support")
                ? "support"
                : null;
              setUserRole(role);
            } else {
              setUserRole(null);
            }
          }, 0);
        } else {
          setUserRole(null);
        }
      }
    );

    // Check for existing session
    supabasePublic.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        supabasePublic
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .then(({ data: rolesData }) => {
            if (rolesData && rolesData.length > 0) {
              const roles = rolesData.map(r => r.role);
              const role = roles.includes("super_admin") 
                ? "super_admin" 
                : roles.includes("admin")
                ? "admin"
                : roles.includes("support")
                ? "support"
                : null;
              setUserRole(role);
            } else {
              setUserRole(null);
            }
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabasePublic.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    // Fetch all user roles (user may have multiple roles)
    const { data: rolesData } = await supabasePublic
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    if (!rolesData || rolesData.length === 0) {
      toast.error("Usuário sem permissões atribuídas");
      await supabasePublic.auth.signOut();
      return;
    }

    // Prioritize super_admin, then admin, then support
    const roles = rolesData.map(r => r.role);
    const role = roles.includes("super_admin") 
      ? "super_admin" 
      : roles.includes("admin")
      ? "admin"
      : roles.includes("support")
      ? "support"
      : null;

    if (!role) {
      toast.error("Usuário sem permissões válidas");
      await supabasePublic.auth.signOut();
      return;
    }

    setUserRole(role);

    // Navigate based on role
    if (role === "admin" || role === "super_admin") {
      navigate("/admin/dashboard");
    } else if (role === "support") {
      navigate("/support/select-room");
    }
  };

  const signOut = async () => {
    await supabasePublic.auth.signOut();
    setUserRole(null);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, signIn, signOut, loading }}>
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
