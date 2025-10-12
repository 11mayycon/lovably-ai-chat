import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, IdCard, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SupportLogin = () => {
  const navigate = useNavigate();
  const [matricula, setMatricula] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!matricula.trim()) {
      toast.error("Digite sua matrícula");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('support-login', {
        body: { matricula: matricula.trim().toUpperCase() }
      });

      if (error || !data?.success) {
        toast.error(data?.error || "Não foi possível validar sua matrícula");
        return;
      }

      const supportUser = data.supportUser;
      const rooms = data.rooms;

      if (!rooms || rooms.length === 0) {
        toast.error("Nenhuma sala vinculada à sua matrícula");
        return;
      }

      // Salvar informações na sessão
      sessionStorage.setItem("support_user", JSON.stringify(supportUser));
      sessionStorage.setItem("support_rooms", JSON.stringify(rooms || []));

      toast.success(`Bem-vindo(a), ${supportUser.full_name}!`);
      navigate("/support/salas");
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      toast.error("Erro ao acessar o sistema");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Bot className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">ISA 2.5</h1>
                <p className="text-sm text-white/80">Powered by InovaPro Technology</p>
              </div>
            </div>

            <div className="space-y-6 mt-16">
              <h2 className="text-4xl font-bold leading-tight">
                Atendimento<br />Inteligente 24/7
              </h2>
              <p className="text-lg text-white/90">
                Acesse suas salas de atendimento e gerencie os clientes
                de forma eficiente com suporte da inteligência artificial.
              </p>

              <div className="flex flex-col gap-4 mt-12">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <IdCard className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold">Acesso Rápido</p>
                    <p className="text-sm text-white/80">Entre com sua matrícula</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold">IA Integrada</p>
                    <p className="text-sm text-white/80">Assistência em tempo real</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-sm text-white/60">
            © 2025 InovaPro Technology. Todos os direitos reservados.
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="p-3 bg-gradient-primary rounded-xl">
                <Bot className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="inline-flex items-center justify-center p-3 bg-secondary/10 rounded-full mb-4">
              <IdCard className="w-8 h-8 text-secondary" />
            </div>
            <h2 className="text-3xl font-bold">Login do Suporte</h2>
            <p className="text-muted-foreground mt-2">
              Acesse suas salas de atendimento
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="matricula">Matrícula</Label>
                <Input
                  id="matricula"
                  type="text"
                  placeholder="Digite sua matrícula"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                  className="h-12 text-base"
                  maxLength={20}
                  disabled={loading}
                  autoFocus
                />
                <p className="text-sm text-muted-foreground">
                  Digite sua matrícula para acessar as salas vinculadas ao seu suporte.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-lg font-semibold bg-gradient-secondary hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <IdCard className="w-5 h-5 mr-2" />
                  ENTRAR
                </>
              )}
            </Button>
          </form>

          {/* Admin Link */}
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Acesso administrativo
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate("/admin/login")}
              className="w-full"
            >
              <Shield className="w-4 h-4 mr-2" />
              Sou Administrador
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Precisa de ajuda? Entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SupportLogin;
