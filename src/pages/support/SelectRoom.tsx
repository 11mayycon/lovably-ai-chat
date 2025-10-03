import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Bell, IdCard, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SelectRoom = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [matricula, setMatricula] = useState("");
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("support_rooms")
        .select(`
          *,
          support_users (
            id,
            full_name,
            matricula
          ),
          room_members (
            is_online
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

  const handleEnterRoom = async () => {
    if (!matricula.trim()) {
      toast.error("Digite sua matrícula");
      return;
    }

    if (!selectedRoom) return;

    try {
      setAuthenticating(true);

      // Verificar se a matrícula corresponde ao usuário da sala
      const { data: supportUser, error: userError } = await supabase
        .from("support_users")
        .select("*")
        .eq("matricula", matricula.toUpperCase())
        .eq("is_active", true)
        .single();

      if (userError || !supportUser) {
        toast.error("Matrícula não encontrada ou usuário inativo");
        return;
      }

      // Verificar se o usuário tem acesso a esta sala
      if (selectedRoom.support_user_id !== supportUser.id) {
        toast.error("Você não tem acesso a esta sala");
        return;
      }

      // Salvar informações do usuário de suporte na sessão
      sessionStorage.setItem("support_user", JSON.stringify(supportUser));
      sessionStorage.setItem("current_room", JSON.stringify(selectedRoom));

      toast.success(`Bem-vindo(a), ${supportUser.full_name}!`);
      navigate("/support/chat");
    } catch (error) {
      console.error("Erro ao autenticar:", error);
      toast.error("Erro ao entrar na sala");
    } finally {
      setAuthenticating(false);
    }
  };

  const getOnlineMembers = (room: any) => {
    return room.room_members?.filter((m: any) => m.is_online).length || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-8 animate-fade-in">
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => navigate("/login")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Login
          </Button>
          <h1 className="text-4xl font-bold mb-2">Selecione sua Sala</h1>
          <p className="text-muted-foreground">
            Escolha a sala de suporte que deseja acessar
          </p>
        </div>

        {rooms.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhuma sala disponível no momento
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => {
              const onlineMembers = getOnlineMembers(room);
              const colors = ["primary", "secondary", "tertiary"];
              const color = colors[rooms.indexOf(room) % colors.length];

              return (
                <Card
                  key={room.id}
                  className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
                  onClick={() => setSelectedRoom(room)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg bg-${color}/10`}>
                        <Users className={`w-5 h-5 text-${color}`} />
                      </div>
                      {room.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {room.support_users && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Responsável:</span>
                        <p className="font-medium">{room.support_users.full_name}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Membros online</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${onlineMembers > 0 ? "bg-success animate-pulse" : "bg-destructive"}`} />
                        <span className="font-bold">{onlineMembers}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Aguardando</span>
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-warning" />
                        <span className="font-bold">0</span>
                      </div>
                    </div>

                    <Button className={`w-full bg-gradient-${color}`}>
                      ENTRAR
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Matricula Dialog */}
      <Dialog open={!!selectedRoom} onOpenChange={() => setSelectedRoom(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IdCard className="w-5 h-5" />
              Sala: {selectedRoom?.name}
            </DialogTitle>
            <DialogDescription>
              Digite sua matrícula para entrar na sala
            </DialogDescription>
          </DialogHeader>

          {selectedRoom?.support_users && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-sm text-muted-foreground mb-1">Responsável pela sala:</p>
              <p className="font-medium">{selectedRoom.support_users.full_name}</p>
              <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                {selectedRoom.support_users.matricula}
              </code>
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="matricula">Matrícula</Label>
              <Input
                id="matricula"
                placeholder="Digite sua matrícula"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === "Enter" && handleEnterRoom()}
                disabled={authenticating}
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Apenas o responsável pela sala pode acessá-la
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedRoom(null);
                setMatricula("");
              }} 
              className="flex-1"
              disabled={authenticating}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleEnterRoom} 
              className="flex-1 bg-gradient-primary"
              disabled={authenticating}
            >
              {authenticating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SelectRoom;
