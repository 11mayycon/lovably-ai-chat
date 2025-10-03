import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Bell, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const RoomsList = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [supportUser, setSupportUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserAndRooms();
  }, []);

  const loadUserAndRooms = () => {
    try {
      // Carregar dados da sessão
      const userStr = sessionStorage.getItem("support_user");
      const roomsStr = sessionStorage.getItem("support_rooms");

      if (!userStr || !roomsStr) {
        toast.error("Sessão expirada");
        navigate("/");
        return;
      }

      const user = JSON.parse(userStr);
      const userRooms = JSON.parse(roomsStr);

      setSupportUser(user);
      setRooms(userRooms);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar suas salas");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleEnterRoom = (room: any) => {
    sessionStorage.setItem("current_room", JSON.stringify(room));
    toast.success(`Entrando na sala ${room.name}...`);
    navigate("/support/chat");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("support_user");
    sessionStorage.removeItem("support_rooms");
    sessionStorage.removeItem("current_room");
    toast.success("Logout realizado");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Bem-vindo(a), {supportUser?.full_name}!
            </h1>
            <p className="text-muted-foreground text-lg">
              Selecione uma sala para começar o atendimento
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Matrícula:</span>
              <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                {supportUser?.matricula}
              </code>
            </div>
          </div>

          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Rooms Grid */}
        {rooms.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhuma sala vinculada à sua matrícula
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Entre em contato com o administrador
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room, index) => {
              const colors = ["primary", "secondary", "tertiary"];
              const color = colors[index % colors.length];

              return (
                <Card
                  key={room.id}
                  className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-2 border-2 hover:border-primary"
                  onClick={() => handleEnterRoom(room)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg bg-${color}/10`}>
                        <Users className={`w-6 h-6 text-${color}`} />
                      </div>
                      <span className="flex-1">{room.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {room.description && (
                      <p className="text-sm text-muted-foreground">
                        {room.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Membros online</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <span className="font-bold">0</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Aguardando</span>
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-warning" />
                        <span className="font-bold">0</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button className={`w-full bg-gradient-${color}`}>
                        ENTRAR NA SALA
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomsList;
