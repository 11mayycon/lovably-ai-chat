import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Bot, User, Send, Paperclip, Smile, ArrowLeft, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Chat = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>("1");

  const waitingClients = [
    { id: "1", name: "Maria Silva", message: "Preciso de ajuda com meu pedido", time: "2 min", status: "waiting" },
    { id: "2", name: "João Santos", message: "Qual o prazo?", time: "Em atendimento", status: "active" },
  ];

  const chatMessages = [
    { type: "ai", text: "Olá! Como posso ajudar?", time: "10:32" },
    { type: "client", text: "Qual o prazo de entrega?", time: "10:33" },
    { type: "ai", text: "Deixa eu transferir você para um especialista...", time: "10:34" },
    { type: "system", text: "AGENTE CARLOS ENTROU NA CONVERSA", time: "10:35" },
    { type: "agent", text: "Olá João! O prazo é de 3 dias úteis.", time: "10:36" },
    { type: "client", text: "Obrigado!", time: "10:37" },
  ];

  const handleSend = () => {
    if (!message.trim()) return;
    toast.success("Mensagem enviada!");
    setMessage("");
  };

  const handleFinalize = () => {
    toast.success("Atendimento finalizado!");
    setSelectedClient(null);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Queue */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Fila de Atendimentos</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/support/select-room")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Sala: <span className="font-semibold text-foreground">Atendimento Geral</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {waitingClients.map((client) => (
            <Card
              key={client.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedClient === client.id ? "border-primary bg-primary/5" : ""
              }`}
              onClick={() => setSelectedClient(client.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-3 h-3 rounded-full mt-1 ${
                  client.status === "active" ? "bg-success animate-pulse" : "bg-warning"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{client.name}</span>
                    <span className="text-xs text-muted-foreground">{client.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{client.message}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedClient ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-border px-6 flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                  J
                </div>
                <div>
                  <h3 className="font-semibold">João Santos</h3>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
              </div>
              <Button onClick={handleFinalize} variant="outline" size="sm">
                <CheckCircle className="w-4 h-4 mr-2" />
                Finalizar Atendimento
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.type === "agent" ? "justify-end" : "justify-start"}`}
                >
                  {msg.type === "system" ? (
                    <div className="w-full text-center">
                      <span className="inline-block px-4 py-2 bg-muted rounded-full text-sm text-muted-foreground">
                        {msg.text}
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`flex gap-3 max-w-[70%] ${
                        msg.type === "agent" ? "flex-row-reverse" : ""
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                        {msg.type === "ai" ? (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                        ) : msg.type === "agent" ? (
                          <div className="w-8 h-8 rounded-full bg-gradient-secondary flex items-center justify-center text-white text-sm font-bold">
                            C
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            msg.type === "agent"
                              ? "bg-primary text-primary-foreground"
                              : msg.type === "ai"
                              ? "bg-secondary/10 text-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <p className="text-sm">{msg.text}</p>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1 block px-2">
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-border p-4 bg-card">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon">
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Smile className="w-5 h-5" />
                </Button>
                <Input
                  placeholder="Digite sua mensagem..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  className="flex-1"
                />
                <Button onClick={handleSend} className="bg-gradient-primary">
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Selecione um cliente para iniciar o atendimento</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
