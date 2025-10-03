import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Paperclip, Smile, ArrowLeft, CheckCircle, Users, Clock, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AISuggestion } from "@/components/chat/AISuggestion";
import { QuickReplies } from "@/components/chat/QuickReplies";
import { TransferDialog } from "@/components/chat/TransferDialog";
import { ObservationsPanel } from "@/components/chat/ObservationsPanel";

const Chat = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [waitingClients, setWaitingClients] = useState<any[]>([]);
  const [myAttendances, setMyAttendances] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [currentAttendance, setCurrentAttendance] = useState<any>(null);
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, today: 0, avgRating: 0 });

  useEffect(() => {
    loadRoomData();
    loadAttendances();
    loadMyAttendances();
    loadStats();
    subscribeToAttendances();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadMessages();
      subscribeToMessages();
    }
  }, [selectedClient]);

  const loadRoomData = () => {
    const roomData = sessionStorage.getItem('current_room');
    if (roomData) {
      setCurrentRoom(JSON.parse(roomData));
    }
  };

  const loadAttendances = async () => {
    try {
      const roomData = sessionStorage.getItem('current_room');
      if (!roomData) return;

      const room = JSON.parse(roomData);

      // Buscar apenas atendimentos aguardando (fila global da sala)
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('room_id', room.id)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setWaitingClients(data || []);
    } catch (error) {
      console.error('Error loading attendances:', error);
    }
  };

  const loadMyAttendances = async () => {
    try {
      const supportData = sessionStorage.getItem('support_user');
      if (!supportData) return;

      const supportUser = JSON.parse(supportData);

      // Buscar meus atendimentos em andamento
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('agent_id', supportUser.id)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false });

      if (error) throw error;
      setMyAttendances(data || []);
    } catch (error) {
      console.error('Error loading my attendances:', error);
    }
  };

  const loadStats = async () => {
    try {
      const supportData = sessionStorage.getItem('support_user');
      if (!supportData) return;

      const supportUser = JSON.parse(supportData);
      const today = new Date().toISOString().split('T')[0];

      // Total de atendimentos finalizados
      const { count: total } = await supabase
        .from('attendances')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', supportUser.id)
        .eq('status', 'finished');

      // Atendimentos de hoje
      const { count: todayCount } = await supabase
        .from('attendances')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', supportUser.id)
        .eq('status', 'finished')
        .gte('finished_at', `${today}T00:00:00`);

      // Média de avaliações
      const { data: ratings } = await supabase
        .from('attendances')
        .select('rating')
        .eq('agent_id', supportUser.id)
        .not('rating', 'is', null);

      const avgRating = ratings && ratings.length > 0
        ? ratings.reduce((acc, r) => acc + (r.rating || 0), 0) / ratings.length
        : 0;

      setStats({
        total: total || 0,
        today: todayCount || 0,
        avgRating: Math.round(avgRating * 10) / 10
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const subscribeToAttendances = () => {
    const channel = supabase
      .channel('attendances-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendances'
        },
        () => {
          loadAttendances();
          loadMyAttendances();
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadMessages = async () => {
    if (!selectedClient) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('attendance_id', selectedClient)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChatMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `attendance_id=eq.${selectedClient}`
        },
        (payload) => {
          setChatMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedClient) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('messages').insert({
        attendance_id: selectedClient,
        sender_type: 'agent',
        sender_id: user.id,
        content: message
      });

      if (error) throw error;

      setMessage("");
      toast.success("Mensagem enviada!");
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Erro ao enviar mensagem");
    }
  };

  const handleAttend = async (attendanceId: string) => {
    try {
      const supportData = sessionStorage.getItem('support_user');
      if (!supportData) return;

      const supportUser = JSON.parse(supportData);

      const { error } = await supabase
        .from('attendances')
        .update({
          status: 'in_progress',
          agent_id: supportUser.id,
          assigned_to: 'agent',
          started_at: new Date().toISOString()
        })
        .eq('id', attendanceId);

      if (error) throw error;

      const attendance = waitingClients.find(c => c.id === attendanceId);
      setSelectedClient(attendanceId);
      setCurrentAttendance({ ...attendance, status: 'in_progress' });
      toast.success("Atendimento iniciado!");
      loadAttendances();
      loadMyAttendances();
    } catch (error) {
      console.error('Error starting attendance:', error);
      toast.error("Erro ao iniciar atendimento");
    }
  };

  const handleFinalize = async () => {
    if (!selectedClient || !currentAttendance) return;

    try {
      const { error: updateError } = await supabase
        .from('attendances')
        .update({
          status: 'finished',
          finished_at: new Date().toISOString()
        })
        .eq('id', selectedClient);

      if (updateError) throw updateError;

      // Enviar mensagem de avaliação via WhatsApp
      const { error: whatsappError } = await supabase.functions.invoke('evolution', {
        body: {
          action: 'sendMessage',
          number: currentAttendance.client_phone,
          message: `Obrigado por entrar em contato! 😊\n\nPor favor, avalie nosso atendimento de 1 a 10:\n\n1️⃣ - Péssimo\n5️⃣ - Regular\n🔟 - Excelente\n\nSua opinião é muito importante para nós! 🌟`
        }
      });

      if (whatsappError) {
        console.error('Error sending WhatsApp message:', whatsappError);
      }

      toast.success("Atendimento finalizado! Avaliação enviada ao cliente.");
      setSelectedClient(null);
      setCurrentAttendance(null);
      loadAttendances();
      loadMyAttendances();
      loadStats();
    } catch (error) {
      console.error('Error finalizing:', error);
      toast.error("Erro ao finalizar atendimento");
    }
  };

  const handleUseSuggestion = (text: string) => {
    setMessage(text);
  };

  const handleTransferComplete = () => {
    setSelectedClient(null);
    setCurrentAttendance(null);
    loadAttendances();
    loadMyAttendances();
  };

  const isAttendanceFinished = currentAttendance?.status === 'finished';

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Queue */}
      <div className="w-96 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Atendimentos</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/support/rooms")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
          {currentRoom && (
            <div className="text-sm text-muted-foreground mb-3">
              Sala: <span className="font-semibold text-foreground">{currentRoom.name}</span>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Card className="p-3">
              <div className="flex flex-col items-center">
                <Users className="w-4 h-4 text-primary mb-1" />
                <span className="text-xl font-bold">{stats.total}</span>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex flex-col items-center">
                <Clock className="w-4 h-4 text-success mb-1" />
                <span className="text-xl font-bold">{stats.today}</span>
                <span className="text-xs text-muted-foreground">Hoje</span>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex flex-col items-center">
                <Star className="w-4 h-4 text-warning mb-1" />
                <span className="text-xl font-bold">{stats.avgRating}</span>
                <span className="text-xs text-muted-foreground">Média</span>
              </div>
            </Card>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {/* Meus Atendimentos */}
          {myAttendances.length > 0 && (
            <div className="p-2 space-y-2 border-b border-border pb-4">
              <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-2">
                Meus Atendimentos ({myAttendances.length})
              </h3>
              {myAttendances.map((client) => (
                <Card
                  key={client.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedClient === client.id ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    setSelectedClient(client.id);
                    setCurrentAttendance(client);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full mt-1 bg-success animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">{client.client_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(client.started_at || client.created_at).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {client.client_phone}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Fila de Espera */}
          <div className="p-2 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-2">
              Fila de Espera ({waitingClients.length})
            </h3>
            {waitingClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum cliente aguardando
              </div>
            ) : (
              waitingClients.map((client) => (
                <Card
                  key={client.id}
                  className="p-4 transition-all hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full mt-1 bg-warning" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">{client.client_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(client.created_at).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mb-2">
                        {client.initial_message || client.client_phone}
                      </p>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleAttend(client.id)}
                      >
                        Atender Cliente
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedClient && currentAttendance ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-border px-6 flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                  {currentAttendance.client_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold">{currentAttendance.client_name}</h3>
                  <p className="text-xs text-muted-foreground">{currentAttendance.client_phone}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <TransferDialog
                  attendanceId={selectedClient}
                  clientName={currentAttendance.client_name}
                  onTransferComplete={handleTransferComplete}
                />
                <Button onClick={handleFinalize} variant="outline" size="sm">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Finalizar
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4 mb-4">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.sender_type === "agent" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.sender_type === "system" ? (
                      <div className="w-full text-center">
                        <span className="inline-block px-4 py-2 bg-muted rounded-full text-sm text-muted-foreground">
                          {msg.content}
                        </span>
                      </div>
                    ) : (
                      <div
                        className={`flex gap-3 max-w-[70%] ${
                          msg.sender_type === "agent" ? "flex-row-reverse" : ""
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                          {msg.sender_type === "ai" ? (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Bot className="w-4 h-4 text-primary" />
                            </div>
                          ) : msg.sender_type === "agent" ? (
                            <div className="w-8 h-8 rounded-full bg-gradient-secondary flex items-center justify-center text-white text-sm font-bold">
                              A
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
                              msg.sender_type === "agent"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <span className="text-xs text-muted-foreground mt-1 block px-2">
                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* AI Suggestion & Observations */}
              <div className="space-y-3">
                <AISuggestion
                  messages={chatMessages}
                  attendanceId={selectedClient}
                  onUseSuggestion={handleUseSuggestion}
                />
                <ObservationsPanel
                  attendanceId={selectedClient}
                  currentObservations={currentAttendance.observations}
                />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-border p-4 bg-card space-y-3">
              {isAttendanceFinished ? (
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4" />
                    <span>Atendimento finalizado</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <QuickReplies onUseReply={handleUseSuggestion} />
                  </div>
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
                </>
              )}
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
