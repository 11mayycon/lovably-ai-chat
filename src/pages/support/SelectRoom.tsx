import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Bell, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const SelectRoom = () => {
  const navigate = useNavigate();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  const rooms = [
    { id: "1", name: "Atendimento Geral", online: 5, waiting: 3, color: "primary" },
    { id: "2", name: "Suporte Técnico", online: 2, waiting: 1, color: "secondary" },
    { id: "3", name: "Vendas", online: 0, waiting: 0, color: "tertiary" },
  ];

  const handleEnterRoom = () => {
    if (!password) {
      toast.error("Digite a senha da sala");
      return;
    }

    toast.success("Entrando na sala...");
    navigate("/support/chat");
  };

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <Card
              key={room.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
              onClick={() => setSelectedRoom(room.id)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg bg-${room.color}/10`}>
                    <Users className={`w-5 h-5 text-${room.color}`} />
                  </div>
                  {room.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Membros online</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${room.online > 0 ? "bg-success animate-pulse" : "bg-destructive"}`} />
                    <span className="font-bold">{room.online}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Aguardando</span>
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-warning" />
                    <span className="font-bold">{room.waiting}</span>
                  </div>
                </div>

                <Button className={`w-full bg-gradient-${room.color}`}>
                  ENTRAR
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Password Dialog */}
      <Dialog open={!!selectedRoom} onOpenChange={() => setSelectedRoom(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Sala: {rooms.find(r => r.id === selectedRoom)?.name}
            </DialogTitle>
            <DialogDescription>
              Digite a senha para entrar na sala
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha de Acesso</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite a senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleEnterRoom()}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setSelectedRoom(null)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleEnterRoom} className="flex-1 bg-gradient-primary">
              Entrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SelectRoom;
