import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, UserPlus, Lock, Unlock, Calendar, RefreshCw, Trash2 } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


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
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<"admin" | "support">("admin");
  const [planName, setPlanName] = useState("");
  const [planDays, setPlanDays] = useState<number>(30);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar usuários",
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
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleCreateAdmin = async () => {
    if (!newAdminName || !newAdminEmail || !newAdminPassword) {
      toast({
        title: "Erro de validação",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    try {
      const { error } = await supabase.functions.invoke("create-admin", {
        body: {
          full_name: newAdminName,
          email: newAdminEmail,
          password: newAdminPassword,
          role: newAdminRole,
          planName,
          days: planDays,
        },
      });

      if (error) throw new Error(error.message);

      toast({
        title: "Sucesso",
        description: "Administrador criado com sucesso!",
      });
      
      setNewAdminName("");
      setNewAdminEmail("");
      setNewAdminPassword("");
      loadSubscriptions();
    } catch (error: any) {
      toast({
        title: "Erro ao criar administrador",
        description: `Falha na chamada da função: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAdmin = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke("delete-admin", {
        body: { userId },
      });

      if (error) throw new Error(error.message);

      toast({
        title: "Sucesso",
        description: "Administrador excluído com sucesso.",
      });

      loadSubscriptions();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
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
        description: `Usuário ${newStatus === "expired" ? "bloqueado" : "desbloqueado"}.`,
      });

      loadSubscriptions();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
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
        description: "Assinatura renovada por mais 30 dias.",
      });

      loadSubscriptions();
    } catch (error: any) {
      toast({
        title: "Erro ao renovar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Carregando usuários...</div>;
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
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="Nome completo do usuário"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="email@dominio.com"
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Senha forte"
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
          const isExpired = sub.status !== 'active' || daysRemaining <= 0;

          return (
            <Card key={sub.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <div>
                    <div className="text-lg font-semibold">{sub.full_name || "Sem nome"}</div>
                    <div className="text-sm text-muted-foreground">{sub.email}</div>
                  </div>
                  <Badge variant={isExpired ? "destructive" : "default"}>
                    {isExpired ? "Expirada" : "Ativa"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center text-muted-foreground gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {isExpired
                        ? "Assinatura inativa ou expirada"
                        : `${daysRemaining} dias restantes`}
                    </span>
                  </div>

                  <div className="flex gap-2 flex-wrap pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleBlock(sub.user_id, sub.status)}
                    >
                      {sub.status === "active" ? (
                        <><Lock className="w-4 h-4 mr-2" />Bloquear</>
                      ) : (
                        <><Unlock className="w-4 h-4 mr-2" />Desbloquear</>
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
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso irá excluir permanentemente o 
                            administrador <span className="font-bold">{sub.email}</span> e todos os seus dados
                            associados do sistema.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteAdmin(sub.user_id)}>
                            Sim, excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

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
