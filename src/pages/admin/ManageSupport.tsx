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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Users, Edit, Trash2, Circle, IdCard } from "lucide-react";

export default function ManageSupport() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [supportUsers, setSupportUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: "",
    support_user_id: "",
    description: "",
    max_members: 10,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carregar salas com informações do usuário de suporte
      const { data: roomsData, error: roomsError } = await supabase
        .from("support_rooms")
        .select(`
          *,
          support_users (
            id,
            full_name,
            email,
            matricula,
            phone
          ),
          room_members (
            user_id,
            is_online
          )
        `)
        .order("created_at", { ascending: false });

      if (roomsError) throw roomsError;
      setRooms(roomsData || []);

      // Carregar usuários de suporte ativos
      const { data: usersData, error: usersError } = await supabase
        .from("support_users")
        .select("*")
        .eq("is_active", true)
        .order("full_name");

      if (usersError) throw usersError;
      setSupportUsers(usersData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async () => {
    if (!newRoom.name || !newRoom.support_user_id) {
      toast.error("Nome e usuário são obrigatórios");
      return;
    }

    try {
      // Get current admin user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Verificar se o usuário já tem uma sala
      const existingRoom = rooms.find(r => r.support_user_id === newRoom.support_user_id);
      if (existingRoom) {
        toast.error("Este usuário já possui uma sala atribuída");
        return;
      }

      const { error } = await supabase
        .from("support_rooms")
        .insert({
          name: newRoom.name,
          support_user_id: newRoom.support_user_id,
          description: newRoom.description,
          max_members: newRoom.max_members,
          admin_owner_id: user.id
        });

      if (error) throw error;

      toast.success("Sala criada com sucesso!");
      setIsCreateOpen(false);
      setNewRoom({ name: "", support_user_id: "", description: "", max_members: 10 });
      loadData();
    } catch (error) {
      console.error("Erro ao criar sala:", error);
      toast.error("Erro ao criar sala");
    }
  };

  const deleteRoom = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta sala?")) return;

    try {
      const { error } = await supabase
        .from("support_rooms")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Sala excluída com sucesso!");
      loadData();
    } catch (error) {
      console.error("Erro ao excluir sala:", error);
      toast.error("Erro ao excluir sala");
    }
  };

  const getOnlineMembers = (room: any) => {
    return room.room_members?.filter((m: any) => m.is_online) || [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Gerenciar Salas
          </h1>
          <p className="text-muted-foreground">
            Crie e gerencie salas de atendimento vinculadas aos usuários
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Nova Sala
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Sala</DialogTitle>
              <DialogDescription>
                Selecione um usuário de suporte para vincular à sala
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Sala *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Atendimento Geral"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="support_user">Usuário de Suporte *</Label>
                <Select
                  value={newRoom.support_user_id}
                  onValueChange={(value) => setNewRoom({ ...newRoom, support_user_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportUsers.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Nenhum usuário disponível.
                        <br />
                        Crie usuários em "Usuários de Suporte"
                      </div>
                    ) : (
                      supportUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <span>{user.full_name}</span>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {user.matricula}
                            </code>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  O usuário poderá acessar a sala usando sua matrícula
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_members">Limite de Membros</Label>
                <Input
                  id="max_members"
                  type="number"
                  min="1"
                  max="100"
                  value={newRoom.max_members}
                  onChange={(e) => setNewRoom({ ...newRoom, max_members: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  placeholder="Descrição da sala"
                  value={newRoom.description}
                  onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={createRoom} disabled={supportUsers.length === 0}>
                Criar Sala
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Carregando salas...</p>
            </CardContent>
          </Card>
        ) : rooms.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">Nenhuma sala criada ainda</p>
              {supportUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground mb-4">
                  Crie usuários de suporte primeiro em "Usuários de Suporte"
                </p>
              ) : (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Sala
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          rooms.map((room) => {
            const onlineMembers = getOnlineMembers(room);
            const isOnline = onlineMembers.length > 0;
            const supportUser = room.support_users;

            return (
              <Card key={room.id} className="border-2">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{room.name}</CardTitle>
                        <Badge variant={isOnline ? "default" : "secondary"}>
                          {isOnline ? "Online" : "Offline"}
                        </Badge>
                      </div>
                      {room.description && (
                        <CardDescription>{room.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteRoom(room.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Informações do usuário vinculado */}
                  {supportUser && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <IdCard className="w-5 h-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm mb-2">Usuário Vinculado</p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Nome:</span>
                              <p className="font-medium">{supportUser.full_name}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Matrícula:</span>
                              <p>
                                <code className="px-2 py-1 bg-muted rounded font-mono">
                                  {supportUser.matricula}
                                </code>
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Email:</span>
                              <p className="font-medium">{supportUser.email}</p>
                            </div>
                            {supportUser.phone && (
                              <div>
                                <span className="text-muted-foreground">Telefone:</span>
                                <p className="font-medium">{supportUser.phone}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>Membros</span>
                      </div>
                      <p className="font-medium">
                        {onlineMembers.length}/{room.max_members}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="flex items-center gap-2">
                        <Circle
                          className={`w-2 h-2 ${
                            isOnline ? "fill-success text-success" : "fill-muted text-muted"
                          }`}
                        />
                        <span className="text-sm font-medium">
                          {isOnline ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Criada em</p>
                      <p className="text-sm font-medium">
                        {new Date(room.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
