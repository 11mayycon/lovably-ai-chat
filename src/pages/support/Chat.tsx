
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, ArrowLeft, BrainCircuit, Loader2, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { databaseClient } from "@/lib/database-client";
import { whatsappService } from "@/lib/whatsapp-service";
import { supabase } from "@/integrations/supabase/client";
import { ConnectionStatus } from "@/components/chat/ConnectionStatus";

const Chat = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [whatsappContacts, setWhatsappContacts] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [supportUser, setSupportUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const scrollAreaRef = useRef<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (selectedContact) {
      loadMessages();
    }
  }, [selectedContact]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [chatMessages]);

  const loadUserData = async () => {
    try {
      const userStr = sessionStorage.getItem("support_user");
      if (!userStr) {
        toast.error("Sessão expirada");
        navigate("/");
        return;
      }

      const user = JSON.parse(userStr);
      setSupportUser(user);
      
      // Carregar contatos do WhatsApp
      await loadWhatsAppContacts();
      
      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do usuário");
      navigate("/");
    }
  };

  const loadWhatsAppContacts = async () => {
    try {
      // Primeiro sincronizar contatos do WhatsApp
      await syncWhatsAppContacts();

      // Depois carregar contatos do banco
      const { data: whatsappContactsData, error } = await supabase
        .from('whatsapp_contacts')
        .select(`
          *,
          whatsapp_connections!inner(
            instance_name,
            status
          )
        `)
        .eq('whatsapp_connections.status', 'connected')
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error("Erro ao carregar contatos:", error);
        throw error;
      }

      // Adicionar contato fixo do INOVAPRO AI
      const inovaproContact = {
        id: "groq-ai",
        name: "🤖 INOVAPRO AI",
        phone: "ai-assistant",
        profilePicUrl: null,
        isGroup: false,
        isAI: true,
        lastSeen: null,
        isWhatsApp: false
      };

      // Transformar e combinar contatos
      const mappedContacts = (whatsappContactsData || []).map((contact: any) => ({
        id: contact.id,
        name: contact.contact_name,
        phone: contact.contact_phone,
        profilePicUrl: contact.profile_pic_url,
        isGroup: contact.is_group,
        isWhatsApp: true,
        lastSeen: contact.last_message_at,
        instanceName: contact.whatsapp_connections.instance_name,
        whatsappConnectionId: contact.whatsapp_connection_id,
        isAI: false,
      }));

      const allContacts = [inovaproContact, ...mappedContacts];
      setWhatsappContacts(allContacts);
      
      console.log(`Carregados ${mappedContacts.length} contatos do WhatsApp`);
    } catch (error) {
      console.error("Erro ao carregar contatos:", error);
      // Em caso de erro, adicionar apenas o contato do INOVAPRO AI
      const inovaproContact = {
        id: "groq-ai",
        name: "🤖 INOVAPRO AI",
        phone: "ai-assistant",
        profilePicUrl: null,
        isGroup: false,
        isAI: true,
        lastSeen: null,
        isWhatsApp: false
      };
      setWhatsappContacts([inovaproContact]);
    }
  };

  const syncWhatsAppContacts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-whatsapp-contacts');
      
      if (error) {
        console.error('Erro ao sincronizar contatos:', error);
        return;
      }

      console.log('Contatos sincronizados:', data);
    } catch (error) {
      console.error('Erro ao sincronizar contatos:', error);
    }
  };

  const loadMessages = async () => {
    if (!selectedContact?.id) return;
    try {
      // Para o Groq AI, não há mensagens persistidas - começar conversa vazia
      if (selectedContact.id === "groq-ai") {
        setChatMessages([{
          id: 'welcome',
          content: 'Olá! Sou o INOVAPRO AI. Como posso ajudá-lo hoje? Posso fornecer dicas de atendimento, sugerir respostas ou esclarecer dúvidas sobre nossos produtos e serviços.',
          sender_type: 'ai',
          created_at: new Date().toISOString()
        }]);
        return;
      }

      // Para contatos do WhatsApp, carregar mensagens via API local
      if (selectedContact.isWhatsApp) {
        const messages = await databaseClient.getWhatsAppMessages(selectedContact.id);
        setChatMessages(messages);
        return;
      }

      // Para atendimentos tradicionais, carregar mensagens via API local
      const messages = await databaseClient.getAttendanceMessages(selectedContact.id);
      setChatMessages(messages);
    } catch (error) {
      console.error('Error loading messages:', error);
      setChatMessages([]);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedContact?.id || isSending) return;
    setIsSending(true);
    
    try {
      // Adicionar mensagem do agente visualmente
      const userMessage = {
        id: Date.now().toString(),
        content: message,
        sender_type: 'agent',
        created_at: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, userMessage]);

      // Para o Groq AI - usar API local
      if (selectedContact.id === "groq-ai") {
        try {
          const aiResponse = await databaseClient.sendAIMessage(message);
          const aiMessage = {
            id: (Date.now() + 1).toString(),
            content: aiResponse.content || 'Obrigado pela sua mensagem! Estou aqui para ajudar com qualquer dúvida sobre atendimento ao cliente.',
            sender_type: 'ai',
            created_at: new Date().toISOString()
          };
          setChatMessages(prev => [...prev, aiMessage]);
        } catch (error) {
          // Fallback para resposta simulada
          const aiMessage = {
            id: (Date.now() + 1).toString(),
            content: 'Obrigado pela sua mensagem! Estou aqui para ajudar com qualquer dúvida sobre atendimento ao cliente.',
            sender_type: 'ai',
            created_at: new Date().toISOString()
          };
          setChatMessages(prev => [...prev, aiMessage]);
        }
        
        setMessage('');
        return;
      }

      // Para contatos do WhatsApp
      if (selectedContact.isWhatsApp) {
        // Enviar mensagem via Evolution API
        const result = await whatsappService.sendMessage(
          selectedContact.instanceName,
          selectedContact.phone,
          message
        );

        if (result.success) {
          // Também salvar no banco local
          await databaseClient.sendWhatsAppMessage(selectedContact.id, message);
          setMessage('');
          toast.success('Mensagem enviada via WhatsApp');
        } else {
          throw new Error(result.error || 'Falha ao enviar mensagem via WhatsApp');
        }
        return;
      }

      // Para atendimentos tradicionais
      await databaseClient.sendAttendanceMessage(selectedContact.id, message);
      setMessage("");
      toast.success("Mensagem enviada");
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectContact = async (contact: any) => {
    setSelectedContact(contact);
    await loadMessages();
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Status de Conexão */}
      <ConnectionStatus onReconnect={loadWhatsAppContacts} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar de Contatos */}
        <div className="w-96 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Contatos</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/support-login")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
            {supportUser && (
              <div className="text-sm text-muted-foreground mb-3">
                Logado como: <span className="font-semibold text-foreground">{supportUser.full_name}</span>
              </div>
            )}
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-2">
                Atendimentos ({whatsappContacts.length})
              </h3>
              {whatsappContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Carregando contatos...
                </div>
              ) : (
                whatsappContacts.map((contact) => (
                  <Card 
                    key={contact.id} 
                    className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedContact?.id === contact.id ? "border-primary bg-primary/5" : ""
                    }`} 
                    onClick={() => handleSelectContact(contact)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 relative">
                        {contact.isAI ? (
                          <BrainCircuit className="w-5 h-5 text-primary" />
                        ) : contact.isWhatsApp ? (
                          <>
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <MessageCircle className="w-3 h-3 text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                          </>
                        ) : (
                          <MessageCircle className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm block truncate">{contact.name}</span>
                          {contact.isWhatsApp && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                              WhatsApp
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.isAI ? 'Assistente Virtual' : contact.phone}
                          {contact.isWhatsApp && contact.instanceName && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              • {contact.instanceName}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Área de Chat */}
        <div className="flex-1 flex flex-col">
          {selectedContact ? (
            <>
              {/* Header do Chat */}
              <div className="h-16 border-b border-border px-6 flex items-center justify-between bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedContact.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedContact.isAI ? 'Assistente Virtual' : selectedContact.phone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Área de Mensagens */}
              <ScrollArea className="flex-1 p-6 bg-muted/20" ref={scrollAreaRef}>
                <div className="space-y-4 mb-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Inicie uma conversa enviando uma mensagem</p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender_type === 'agent' ? "justify-end" : "justify-start"}`}>
                        <div className={`flex gap-3 max-w-[70%] ${msg.sender_type === 'agent' ? "flex-row-reverse" : ""}`}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                            {msg.sender_type === 'ai' ? (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-primary" />
                              </div>
                            ) : msg.sender_type === 'agent' ? (
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
                            <div className={`rounded-2xl px-4 py-2 ${
                              msg.sender_type === 'agent' 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-card text-foreground"
                            }`}>
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
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Input de Mensagem */}
              <div className="border-t border-border p-4 bg-card space-y-3">
                <div className="flex items-center gap-3">
                  <Input 
                    placeholder="Digite sua mensagem..." 
                    value={message} 
                    onChange={(e) => setMessage(e.target.value)} 
                    onKeyPress={(e) => e.key === "Enter" && handleSend()} 
                    className="flex-1" 
                    disabled={isSending} 
                  />
                  <Button 
                    onClick={handleSend} 
                    className="bg-gradient-primary" 
                    disabled={isSending}
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Selecione um contato para iniciar uma conversa</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
