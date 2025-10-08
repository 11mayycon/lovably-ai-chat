import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabasePublic } from "@/lib/supabase-public-client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, UserCheck, UserX, IdCard } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function SupportUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    matricula: "",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabasePublic
        .from("support_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.full_name || !formData.email || !formData.matricula) {
      toast.error("Nome, email e matrícula são obrigatórios");
      return;
    }

    try {
      if (editingUser) {
        const { error } = await supabasePublic
          .from("support_users")
          .update({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            matricula: formData.matricula,
          })
          .eq("id", editingUser.id);

        if (error) throw error;
        toast.success("Usuário atualizado com sucesso!");
      } else {
        const { error } = await supabasePublic
          .from("support_users")
          .insert({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            matricula: formData.matricula,
          });

        if (error) throw error;
        toast.success("Usuário criado com sucesso!");
      }

      setIsCreateOpen(false);
      setEditingUser(null);
      setFormData({ full_name: "", email: "", phone: "", matricula: "" });
      loadUsers();
    } catch (error: any) {
      console.error("Erro ao salvar usuário:", error);
      if (error.code === "23505") {
        toast.error("Email ou matrícula já cadastrados");
      } else {
        toast.error("Erro ao salvar usuário");
      }
    }
  };

  const toggleActive = async (user: any) => {
    try {
      const { error } = await supabasePublic
        .from("support_users")
        .update({ is_active: !user.is_active })
        .eq("id", user.id);

      if (error) throw error;
      toast.success(`Usuário ${!user.is_active ? "ativado" : "desativado"} com sucesso!`);
      loadUsers();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status do usuário");
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

    try {
      const { error } = await supabasePublic
        .from("support_users")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Usuário excluído com sucesso!");
      loadUsers();
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      toast.error("Erro ao excluir usuário");
    }
  };

  const openEditDialog = (user: any) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || "",
      matricula: user.matricula,
    });
    setIsCreateOpen(true);
  };

  const closeDialog = () => {
    setIsCreateOpen(false);
    setEditingUser(null);
    setFormData({ full_name: "", email: "", phone: "", matricula: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Usuários de Suporte
          </h1>
          <p className="text-muted-foreground">
            Gerencie os usuários que podem acessar as salas de atendimento
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="lg" onClick={() => setEditingUser(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Editar Usuário" : "Criar Novo Usuário"}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? "Atualize as informações do usuário de suporte"
                  : "Crie um novo usuário para acessar as salas de atendimento"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input
                  id="full_name"
                  placeholder="João Silva"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@empresa.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="matricula">Matrícula *</Label>
                <Input
                  id="matricula"
                  placeholder="ABC123"
                  value={formData.matricula}
                  onChange={(e) => setFormData({ ...formData, matricula: e.target.value.toUpperCase() })}
                />
                <p className="text-xs text-muted-foreground">
                  Será usada para login nas salas de atendimento
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {editingUser ? "Atualizar" : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            {users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando usuários...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <IdCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Nenhum usuário cadastrado ainda</p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Usuário
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || "-"}</TableCell>
                    <TableCell>
                      <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                        {user.matricula}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={() => toggleActive(user)}
                        />
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? (
                            <>
                              <UserCheck className="w-3 h-3 mr-1" />
                              Ativo
                            </>
                          ) : (
                            <>
                              <UserX className="w-3 h-3 mr-1" />
                              Inativo
                            </>
                          )}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteUser(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
