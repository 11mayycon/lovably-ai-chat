import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bot, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

const Setup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState(false);

  useEffect(() => {
    checkForAdmin();
  }, []);

  const checkForAdmin = async () => {
    try {
      // Check if any admin exists
      const data = await apiClient.request('GET', '/admin/check-exists');
      setAdminExists(data.exists);
    } catch (error) {
      console.error("Error checking for admin:", error);
    } finally {
      setChecking(false);
    }
  };

  const createFirstAdmin = async () => {
    setLoading(true);
    try {
      const data = await apiClient.createFirstAdmin(
        "maiconsillva2025@gmail.com",
        "1285041"
      );

      if (data.success) {
        toast.success("Administrador criado com sucesso!");
        setTimeout(() => {
          navigate("/admin/login");
        }, 2000);
      } else {
        toast.error(data.error || "Erro ao criar administrador");
      }
    } catch (error: any) {
      console.error("Error creating admin:", error);
      toast.error("Erro ao criar administrador. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Bot className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Verificando sistema...</p>
        </div>
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 animate-fade-in">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
          <div>
            <h2 className="text-2xl font-bold">Sistema Configurado</h2>
            <p className="text-muted-foreground mt-2">
              O administrador já foi criado anteriormente
            </p>
          </div>
          <Button onClick={() => navigate("/admin/login")} className="bg-gradient-primary">
            IR PARA LOGIN
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-primary rounded-2xl">
              <Bot className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Configuração Inicial</h1>
          <p className="text-muted-foreground mt-2">
            ISA 2.5 - Sistema de Atendimento Inteligente
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Criar Primeiro Administrador</h2>
          <p className="text-sm text-muted-foreground">
            Para começar a usar o sistema, você precisa criar o primeiro usuário
            administrador.
          </p>

          <div className="bg-background border border-border rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Email:</span>
              <span className="text-sm text-muted-foreground">
                maiconsillva2025@gmail.com
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Senha:</span>
              <span className="text-sm text-muted-foreground">••••••••</span>
            </div>
          </div>

          <Button
            onClick={createFirstAdmin}
            disabled={loading}
            className="w-full h-12 text-lg font-semibold bg-gradient-primary"
          >
            {loading ? "CRIANDO..." : "CRIAR ADMINISTRADOR"}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Powered by InovaPro Technology
        </p>
      </div>
    </div>
  );
};

export default Setup;
