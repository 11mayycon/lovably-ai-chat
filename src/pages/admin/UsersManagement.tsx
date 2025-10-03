import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, UserPlus, Lock, Unlock, Calendar, RefreshCw, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Subscription {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  status: string;
  expires_at: string | null;
  created_at: string;
}

const UsersManagement = () => {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<"admin" | "support">("admin");

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return 0;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleCreateAdmin = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-admin", {
        body: {
          email: newAdminEmail,
          password: newAdminPassword,
          role: newAdminRole,
        },
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Administrador criado com sucesso",
      });

      setNewAdminEmail("");
      setNewAdminPassword("");
      loadSubscriptions();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleBlock = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "expired" : "active";
      
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: newStatus })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Usuário ${newStatus === "expired" ? "bloqueado" : "desbloqueado"}`,
      });

      loadSubscriptions();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRenewSubscription = async (userId: string, currentExpiry: string | null) => {
    try {
      const baseDate = currentExpiry ? new Date(currentExpiry) : new Date();
      const now = new Date();
      const expiryDate = baseDate > now ? baseDate : now;
      expiryDate.setDate(expiryDate.getDate() + 30);

      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          expires_at: expiryDate.toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Assinatura renovada por 30 dias",
      });

      loadSubscriptions();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelSubscription = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Assinatura cancelada",
      });

      loadSubscriptions();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Administrador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Administrador</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                />
              </div>
              <div>
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                />
              </div>
              <div>
                <Label>Função</Label>
                <Select value={newAdminRole} onValueChange={(v) => setNewAdminRole(v as "admin" | "support")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="support">Suporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateAdmin} className="w-full">
                Criar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {subscriptions.map((sub) => {
          const daysRemaining = calculateDaysRemaining(sub.expires_at);
          const isExpired = daysRemaining <= 0;

          return (
            <Card key={sub.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <div>
                    <div className="text-lg">{sub.full_name || "Sem nome"}</div>
                    <div className="text-sm text-muted-foreground">{sub.email}</div>
                  </div>
                  <Badge variant={sub.status === "active" && !isExpired ? "default" : "destructive"}>
                    {sub.status === "active" && !isExpired ? "Ativa" : "Expirada"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {isExpired
                        ? "Assinatura expirada"
                        : `${daysRemaining} dias restantes`}
                    </span>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleBlock(sub.user_id, sub.status)}
                    >
                      {sub.status === "active" ? (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Bloquear
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4 mr-2" />
                          Desbloquear
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRenewSubscription(sub.user_id, sub.expires_at)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Renovar +30 dias
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancelSubscription(sub.user_id)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default UsersManagement;