import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Bot, Headphones, Eye, EyeOff, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const { signIn } = useAuth();
  const [userType, setUserType] = useState<"admin" | "support">("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      await signIn(formData.email, formData.password);
      toast.success("Login realizado com sucesso!");
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.message?.includes("Invalid login credentials")) {
        toast.error("Email ou senha incorretos");
      } else {
        toast.error("Erro ao fazer login. Tente novamente.");
      }
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
                Conecte seu WhatsApp, treine a IA com informações do seu negócio
                e gerencie sua equipe de suporte de forma inteligente.
              </p>
              
              <div className="flex flex-col gap-4 mt-12">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold">Seguro e Confiável</p>
                    <p className="text-sm text-white/80">Dados criptografados end-to-end</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold">IA Personalizada</p>
                    <p className="text-sm text-white/80">Treinada especialmente para seu negócio</p>
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
            <h2 className="text-3xl font-bold">Bem-vindo ao ISA 2.5</h2>
            <p className="text-muted-foreground mt-2">
              Entre com suas credenciais para continuar
            </p>
          </div>

          {/* User Type Toggle */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setUserType("admin")}
              className={`flex-1 p-6 rounded-xl border-2 transition-all ${
                userType === "admin"
                  ? "border-primary bg-primary/5 shadow-lg scale-105"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div
                  className={`p-4 rounded-full ${
                    userType === "admin" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-lg">ADMINISTRADOR</p>
                  <p className="text-xs text-muted-foreground">Acesso total ao sistema</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setUserType("support")}
              className={`flex-1 p-6 rounded-xl border-2 transition-all ${
                userType === "support"
                  ? "border-secondary bg-secondary/5 shadow-lg scale-105"
                  : "border-border hover:border-secondary/50"
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div
                  className={`p-4 rounded-full ${
                    userType === "support" ? "bg-secondary text-secondary-foreground" : "bg-muted"
                  }`}
                >
                  <Headphones className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-lg">SUPORTE</p>
                  <p className="text-xs text-muted-foreground">Atendimento ao cliente</p>
                </div>
              </div>
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email ou Usuário</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="h-12 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, rememberMe: checked as boolean })
                    }
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Manter conectado
                  </label>
                </div>
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                >
                  Esqueceu sua senha?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className={`w-full h-12 text-lg font-semibold transition-opacity ${
                userType === "admin"
                  ? "bg-gradient-primary hover:opacity-90"
                  : "bg-gradient-secondary hover:opacity-90"
              }`}
            >
              {loading ? "ENTRANDO..." : `ENTRAR COMO ${userType === "admin" ? "ADMINISTRADOR" : "SUPORTE"}`}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Ao entrar, você concorda com nossos{" "}
            <button className="text-primary hover:underline">Termos de Serviço</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
