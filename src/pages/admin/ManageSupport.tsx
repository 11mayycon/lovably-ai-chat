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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Users, Lock, Eye, EyeOff, Edit, Trash2, Circle } from "lucide-react";

export default function ManageSupport() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: "",
    password: "",
    description: "",
    max_members: 10,
  });

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("support_rooms")
        .select(`
          *,
          room_members (
            user_id,
            is_online,
            profiles (full_name, email)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error("Erro ao carregar salas:", error);
      toast.error("Erro ao carregar salas");
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async () => {
    if (!newRoom.name || !newRoom.password) {
      toast.error("Nome e senha são obrigatórios");
      return;
    }

    try {
      const { error } = await supabase
        .from("support_rooms")
        .insert({
          name: newRoom.name,
          password: newRoom.password,
          description: newRoom.description,
          max_members: newRoom.max_members,
        });

      if (error) throw error;

      toast.success("Sala criada com sucesso!");
      setIsCreateOpen(false);
      setNewRoom({ name: "", password: "", description: "", max_members: 10 });
      loadRooms();
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
      loadRooms();
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
            Gerenciar Suporte
          </h1>
          <p className="text-muted-foreground">
            Crie e gerencie salas de atendimento para sua equipe
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
                Configure uma nova sala de atendimento para sua equipe
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
                <Label htmlFor="password">Senha de Acesso *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha para entrar na sala"
                    value={newRoom.password}
                    onChange={(e) => setNewRoom({ ...newRoom, password: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
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
              <Button onClick={createRoom}>
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
              <p className="text-muted-foreground mb-4">Nenhuma sala criada ainda</p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Sala
              </Button>
            </CardContent>
          </Card>
        ) : (
          rooms.map((room) => {
            const onlineMembers = getOnlineMembers(room);
            const isOnline = onlineMembers.length > 0;

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
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Lock className="w-4 h-4" />
                        <span>Senha</span>
                      </div>
                      <p className="font-mono">••••••••</p>
                    </div>

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
                  </div>

                  {onlineMembers.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Membros Online:</p>
                      <div className="flex flex-wrap gap-2">
                        {onlineMembers.map((member: any) => (
                          <Badge key={member.user_id} variant="secondary">
                            {member.profiles?.full_name || member.profiles?.email || "Agente"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}