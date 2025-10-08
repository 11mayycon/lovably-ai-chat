
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, ArrowLeft, CheckCircle, Users, Clock, Star, BrainCircuit, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TransferDialog } from "@/components/chat/TransferDialog";

const Chat = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [roomMembers, setRoomMembers] = useState<any[]>([]);
  const [waitingClients, setWaitingClients] = useState<any[]>([]);
  const [myAttendances, setMyAttendances] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, today: 0, avgRating: 0 });
  const scrollAreaRef = useRef<any>(null);

  useEffect(() => {
    const roomData = sessionStorage.getItem('current_room');
    if (roomData) {
      const room = JSON.parse(roomData);
      setCurrentRoom(room);
      loadInitialData(room.id);
      const subscriptionChannel = subscribeToChanges(room.id);
      return () => {
        supabase.removeChannel(subscriptionChannel);
      };
    } else {
      navigate('/support/rooms');
    }
  }, [navigate]);

  useEffect(() => {
    let messageChannel: any;
    if (selectedContact) {
      loadMessages();
      messageChannel = subscribeToMessages();
    }
    return () => {
      if (messageChannel) {
        supabase.removeChannel(messageChannel);
      }
    };
  }, [selectedContact]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [chatMessages]);

  const loadInitialData = (roomId: string) => {
    loadRoomMembers(roomId);
    loadAttendances(roomId);
    loadMyAttendances();
    loadStats();
  };

  const loadRoomMembers = async (roomId: string) => {
    try {
      const supportData = sessionStorage.getItem('support_user');
      if (!supportData) return;
      const supportUser = JSON.parse(supportData);

      const { data, error } = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', roomId);

      if (error) throw error;
      // Filter: Show only non-bot members except the current user
      setRoomMembers(data?.filter(m => m.user_id !== supportUser.id && !(m as any).is_bot) || []);
    } catch (error) {
      console.error('Error loading room members:', error);
    }
  };

  const loadAttendances = async (roomId: string) => {
    try {
      const { data, error } = await supabase.from('attendances').select('*').eq('room_id', roomId).eq('status', 'waiting').order('created_at', { ascending: true });
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

      // Load regular attendances
      const { data: regularAttendances, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('agent_id', supportUser.id)
        .eq('status', 'in_progress')
        .not('client_phone', 'eq', 'bot_chat')
        .order('started_at', { ascending: false });

      if (error) throw error;

      // Load AI bot contact for this room
      const roomData = sessionStorage.getItem('current_room');
      if (roomData) {
        const room = JSON.parse(roomData);
        
        // Check if there's an existing bot chat
        const { data: existingBotChat, error: botChatError } = await supabase
          .from('attendances')
          .select('*')
          .eq('room_id', room.id)
          .eq('agent_id', supportUser.id)
          .eq('client_phone', 'bot_chat')
          .maybeSingle();

        if (!botChatError && existingBotChat) {
          // Add the existing bot chat to attendances
          setMyAttendances([existingBotChat, ...(regularAttendances || [])]);
        } else {
          // Create a virtual bot contact that appears as a client
          const virtualBotContact = {
            id: `bot_${room.id}`,
            room_id: room.id,
            agent_id: supportUser.id,
            client_name: 'Assistente IA',
            client_phone: 'bot_chat',
            status: 'available',
            assigned_to: 'agent',
            started_at: new Date().toISOString(),
            is_virtual_bot: true
          };
          
          setMyAttendances([virtualBotContact, ...(regularAttendances || [])]);
        }
      } else {
        setMyAttendances(regularAttendances || []);
      }
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

      const { count: total } = await supabase.from('attendances').select('*', { count: 'exact', head: true }).eq('agent_id', supportUser.id).eq('status', 'finished');
      const { count: todayCount } = await supabase.from('attendances').select('*', { count: 'exact', head: true }).eq('agent_id', supportUser.id).eq('status', 'finished').gte('finished_at', `${today}T00:00:00`);
      const { data: ratings } = await supabase.from('attendances').select('rating').eq('agent_id', supportUser.id).not('rating', 'is', null);
      
      const avgRating = ratings && ratings.length > 0 ? ratings.reduce((acc, r) => acc + (r.rating || 0), 0) / ratings.length : 0;
      setStats({ total: total || 0, today: todayCount || 0, avgRating: Math.round(avgRating * 10) / 10 });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const subscribeToChanges = (roomId: string) => {
    const channel = supabase.channel('attendances-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendances', filter: `room_id=eq.${roomId}` }, () => {
        loadAttendances(roomId);
        loadMyAttendances();
        loadStats();
      }).subscribe();
    return channel;
  };

  const loadMessages = async () => {
    if (!selectedContact?.id) return;
    try {
      const { data, error } = await supabase.from('messages').select('*').eq('attendance_id', selectedContact.id).order('created_at', { ascending: true });
      if (error) throw error;
      setChatMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!selectedContact?.id) return null;
    const channel = supabase.channel('messages-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `attendance_id=eq.${selectedContact.id}` }, 
      (payload) => setChatMessages(prev => [...prev, payload.new]))
      .subscribe();
    return channel;
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedContact?.id || isSending) return;
    setIsSending(true);
    try {
      const supportData = sessionStorage.getItem('support_user');
      if (!supportData) return;
      const supportUser = JSON.parse(supportData);

      const messagePayload = { attendance_id: selectedContact.id, sender_type: 'agent' as const, sender_id: supportUser.id, content: message };
      const { error: insertError } = await supabase.from('messages').insert(messagePayload);
      if (insertError) throw insertError;
      setMessage("");

      if (selectedContact.client_phone === 'bot_chat') {
        const { error: funcError } = await supabase.functions.invoke('groq-message-handler', { body: { attendance_id: selectedContact.id } });
        if (funcError) {
          toast.error("A IA não pôde responder.");
          console.error("Function invocation error:", funcError);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  const handleAttendClient = async (attendanceId: string) => {
    try {
      const supportData = sessionStorage.getItem('support_user');
      if (!supportData) return;
      const supportUser = JSON.parse(supportData);
      const { error } = await supabase.from('attendances').update({ status: 'in_progress', agent_id: supportUser.id, started_at: new Date().toISOString() }).eq('id', attendanceId);
      if (error) throw error;
      const attendance = waitingClients.find(c => c.id === attendanceId);
      setSelectedContact({ ...attendance, status: 'in_progress' });
      toast.success("Atendimento iniciado!");
    } catch (error) {
      toast.error("Erro ao iniciar atendimento");
    }
  };

  const handleSelectContact = (contact: any) => setSelectedContact(contact);

  const handleSelectBot = async (botMember: any) => {
    try {
      const supportData = sessionStorage.getItem('support_user');
      const roomData = sessionStorage.getItem('current_room');
      if (!supportData || !roomData) return;
      const supportUser = JSON.parse(supportData);
      const room = JSON.parse(roomData);

      let { data: existing, error: findError } = await supabase.from('attendances').select('*').eq('room_id', room.id).eq('agent_id', supportUser.id).eq('client_phone', 'bot_chat').maybeSingle();
      if (findError) throw findError;

      if (existing) {
        setSelectedContact(existing);
      } else {
        const { data: newChat, error: createError } = await supabase.from('attendances').insert({ room_id: room.id, agent_id: supportUser.id, client_name: botMember.full_name, client_phone: 'bot_chat', status: 'in_progress', assigned_to: 'agent', started_at: new Date().toISOString() }).select().single();
        if (createError) throw createError;
        setSelectedContact(newChat);
      }
    } catch (error) {
      toast.error("Não foi possível iniciar conversa com o assistente.");
    }
  };

  const handleFinalize = async () => {
    if (!selectedContact?.id) return;
    try {
      await supabase.from('attendances').update({ status: 'finished', finished_at: new Date().toISOString() }).eq('id', selectedContact.id);
      toast.success("Atendimento finalizado!");
      setSelectedContact(null);
    } catch (error) {
      toast.error("Erro ao finalizar atendimento");
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <div className="w-96 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Atendimentos</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/support/rooms")}><ArrowLeft className="w-4 h-4" /></Button>
          </div>
          {currentRoom && <div className="text-sm text-muted-foreground mb-3">Sala: <span className="font-semibold text-foreground">{currentRoom.name}</span></div>}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Card className="p-3 flex flex-col items-center"><Users className="w-4 h-4 text-primary mb-1" /><span className="text-xl font-bold">{stats.total}</span><span className="text-xs text-muted-foreground">Total</span></Card>
            <Card className="p-3 flex flex-col items-center"><Clock className="w-4 h-4 text-success mb-1" /><span className="text-xl font-bold">{stats.today}</span><span className="text-xs text-muted-foreground">Hoje</span></Card>
            <Card className="p-3 flex flex-col items-center"><Star className="w-4 h-4 text-warning mb-1" /><span className="text-xl font-bold">{stats.avgRating}</span><span className="text-xs text-muted-foreground">Média</span></Card>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {roomMembers.length > 0 && (
            <div className="p-2 space-y-2 border-b border-border pb-4">
              <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-2">Membros da Sala ({roomMembers.length})</h3>
              {roomMembers.map((member) => (
                <Card key={member.user_id} className={`p-4 cursor-pointer transition-all hover:shadow-md ${selectedContact?.client_phone === 'bot_chat' ? "border-primary bg-primary/5" : ""}`} onClick={() => handleSelectBot(member)}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><BrainCircuit className="w-5 h-5 text-primary" /></div>
                    <div className="flex-1 min-w-0"><span className="font-semibold text-sm">{member.full_name}</span><p className="text-xs text-muted-foreground truncate">{member.is_bot ? 'Assistente Virtual' : 'Membro'}</p></div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {myAttendances.length > 0 && (
            <div className="p-2 space-y-2 border-b border-border pb-4">
              <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-2">Meus Atendimentos ({myAttendances.length})</h3>
              {myAttendances.map((client) => (
                <Card key={client.id} className={`p-4 cursor-pointer transition-all hover:shadow-md ${selectedContact?.id === client.id ? "border-primary bg-primary/5" : ""}`} onClick={() => handleSelectContact(client)}>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full mt-1 bg-success animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1"><span className="font-semibold text-sm">{client.client_name}</span><span className="text-xs text-muted-foreground">{new Date(client.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>
                      <p className="text-xs text-muted-foreground truncate">{client.client_phone}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          <div className="p-2 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-2">Fila de Espera ({waitingClients.length})</h3>
            {waitingClients.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">Nenhum cliente aguardando</div> : 
              waitingClients.map((client) => (
                <Card key={client.id} className="p-4 transition-all hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full mt-1 bg-warning" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1"><span className="font-semibold text-sm">{client.client_name}</span><span className="text-xs text-muted-foreground">{new Date(client.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>
                      <p className="text-xs text-muted-foreground truncate mb-2">{client.initial_message || client.client_phone}</p>
                      <Button size="sm" className="w-full" onClick={() => handleAttendClient(client.id)}>Atender Cliente</Button>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </ScrollArea>
      </div>
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            <div className="h-16 border-b border-border px-6 flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">{selectedContact.client_name.charAt(0).toUpperCase()}</div>
                <div><h3 className="font-semibold">{selectedContact.client_name}</h3><p className="text-xs text-muted-foreground">{selectedContact.client_phone !== 'bot_chat' ? selectedContact.client_phone : 'Assistente Virtual'}</p></div>
              </div>
              {selectedContact.client_phone !== 'bot_chat' && (
                <div className="flex gap-2">
                  <TransferDialog attendanceId={selectedContact.id} clientName={selectedContact.client_name} onTransferComplete={() => setSelectedContact(null)} />
                  <Button onClick={handleFinalize} variant="outline" size="sm"><CheckCircle className="w-4 h-4 mr-2" />Finalizar</Button>
                </div>
              )}
            </div>
            <ScrollArea className="flex-1 p-6 bg-muted/20" ref={scrollAreaRef}>
              <div className="space-y-4 mb-4">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'agent' ? "justify-end" : "justify-start"}`}>
                    <div className={`flex gap-3 max-w-[70%] ${msg.sender_type === 'agent' ? "flex-row-reverse" : ""}`}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                        {msg.sender_type === 'ai' ? <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="w-4 h-4 text-primary" /></div>
                         : msg.sender_type === 'agent' ? <div className="w-8 h-8 rounded-full bg-gradient-secondary flex items-center justify-center text-white text-sm font-bold">A</div>
                         : <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><User className="w-4 h-4" /></div>}
                      </div>
                      <div>
                        <div className={`rounded-2xl px-4 py-2 ${msg.sender_type === 'agent' ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}><p className="text-sm whitespace-pre-wrap">{msg.content}</p></div>
                        <span className="text-xs text-muted-foreground mt-1 block px-2">{new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="border-t border-border p-4 bg-card space-y-3">
              <div className="flex items-center gap-3">
                <Input placeholder="Digite sua mensagem..." value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === "Enter" && handleSend()} className="flex-1" disabled={isSending} />
                <Button onClick={handleSend} className="bg-gradient-primary" disabled={isSending}>{isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center"><div className="text-center text-muted-foreground"><Bot className="w-16 h-16 mx-auto mb-4 opacity-50" /><p>Selecione um cliente ou membro para conversar</p></div></div>
        )}
      </div>
    </div>
  );
};
export default Chat;
