import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, LogOut, MessageCircle, Phone, Loader2, BrainCircuit, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const ChatNew = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [whatsappContacts, setWhatsappContacts] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [supportUser, setSupportUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

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
      // Buscar contatos do WhatsApp via Evolution API
      const { data, error } = await supabase.functions.invoke("get-whatsapp-contacts", {
        body: { instanceName: "ISA_FRONTEND" },
      });

      if (error) throw error;

      if (data?.success) {
        // Adicionar contato fixo do INOVAPRO AI
        const inovaproContact = {
          id: "groq-ai",
          name: "🤖 INOVAPRO AI",
          phone: "ai-assistant",
          profilePicUrl: null,
          isGroup: false,
          isAI: true,
          lastSeen: null
        };

        setWhatsappContacts([inovaproContact, ...data.contacts]);
      } else {
        console.error("Erro ao carregar contatos:", data?.error);
        // Adicionar apenas o contato do INOVAPRO AI se não conseguir carregar os outros
        const inovaproContact = {
          id: "groq-ai",
          name: "🤖 INOVAPRO AI",
          phone: "ai-assistant",
          profilePicUrl: null,
          isGroup: false,
          isAI: true,
          lastSeen: null
        };
        setWhatsappContacts([inovaproContact]);
      }
    } catch (error) {
      console.error("Erro ao carregar contatos do WhatsApp:", error);
      // Em caso de erro, adicionar apenas o contato do INOVAPRO AI
      const inovaproContact = {
        id: "groq-ai",
        name: "🤖 INOVAPRO AI",
        phone: "ai-assistant",
        profilePicUrl: null,
        isGroup: false,
        isAI: true,
        lastSeen: null
      };
      setWhatsappContacts([inovaproContact]);
    }
  };

  const handleContactSelect = (contact: any) => {
    setSelectedContact(contact);
    setChatMessages([]);
    
    if (contact.isAI) {
      // Mensagem de boas-vindas para o AI
      setChatMessages([{
        id: 'welcome',
        content: 'Olá! Sou o INOVAPRO AI. Como posso ajudá-lo hoje? Posso fornecer dicas de atendimento, sugerir respostas ou esclarecer dúvidas sobre nossos produtos e serviços.',
        sender: 'assistant',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedContact || isSending) return;

    const userMessage = {
      id: Date.now().toString(),
      content: message.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    const currentMessage = message.trim();
    setMessage("");
    setIsSending(true);
    setIsTyping(true);

    try {
      if (selectedContact.isAI) {
        // Enviar para o Groq AI
        const { data, error } = await supabase.functions.invoke("ai-direct-chat", {
          body: { 
            message: currentMessage,
            contextChat: chatMessages.slice(-6).map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.content
            }))
          },
        });

        if (error) throw error;

        if (data?.success) {
          const aiMessage = {
            id: (Date.now() + 1).toString(),
            content: data.reply,
            sender: 'assistant',
            timestamp: new Date().toISOString()
          };
          setChatMessages(prev => [...prev, aiMessage]);
        } else {
          throw new Error(data?.error || "Erro ao enviar mensagem para IA");
        }
      } else {
        // Aqui seria implementada a lógica para enviar mensagem via WhatsApp
        // Por enquanto, apenas simular uma resposta
        toast.info("Funcionalidade de WhatsApp em desenvolvimento");
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const TypingIndicator = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 p-3"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-white/70">Carregando interface...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 text-white overflow-hidden">
      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #7c3aed, #ec4899);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #8b5cf6, #f472b6);
        }
      `}</style>

      <div className="flex h-screen">
        {/* Sidebar de Contatos */}
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-96 backdrop-blur-xl bg-white/5 border-r border-white/10 flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <motion.h2 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-bold text-xl bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent"
              >
                Atendimentos
              </motion.h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/support-login")}
                className="text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
            {supportUser && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="backdrop-blur-md bg-white/5 rounded-xl p-3 border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {supportUser.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{supportUser.full_name}</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-white/70">Online</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
          
          {/* Lista de Contatos */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              <motion.h3 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm font-semibold text-white/70 px-2 mb-4"
              >
                Contatos Disponíveis ({whatsappContacts.length})
              </motion.h3>
              <AnimatePresence>
                {whatsappContacts.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8 text-white/50 text-sm"
                  >
                    Carregando contatos...
                  </motion.div>
                ) : (
                  whatsappContacts.map((contact, index) => (
                    <motion.div
                      key={contact.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card 
                        className={`p-4 cursor-pointer transition-all duration-300 backdrop-blur-md border border-white/10 hover:border-white/20 hover:shadow-xl hover:shadow-indigo-500/20 ${
                          selectedContact?.id === contact.id 
                            ? "bg-gradient-to-r from-indigo-500/20 to-pink-500/20 border-pink-400/50 shadow-lg shadow-pink-500/25" 
                            : "bg-white/5 hover:bg-gradient-to-r hover:from-indigo-500/10 hover:to-pink-500/10"
                        }`} 
                        onClick={() => handleContactSelect(contact)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                              {contact.isAI ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                >
                                  <BrainCircuit className="w-6 h-6 text-white" />
                                </motion.div>
                              ) : (
                                <User className="w-6 h-6 text-white" />
                              )}
                            </div>
                            {contact.isAI && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse border-2 border-white"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white truncate">{contact.name}</p>
                            <p className="text-xs text-white/60 truncate">
                              {contact.isAI ? 'Assistente Virtual' : contact.phone}
                            </p>
                          </div>
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="text-white/40"
                          >
                            {contact.isAI ? (
                              <BrainCircuit className="w-5 h-5" />
                            ) : (
                              <MessageCircle className="w-5 h-5" />
                            )}
                          </motion.div>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </motion.div>

        {/* Área de Chat */}
        <div className="flex-1 flex flex-col">
          {selectedContact ? (
            <>
              {/* Header do Chat */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="backdrop-blur-xl bg-white/5 border-b border-white/10 p-6"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-pink-500 flex items-center justify-center">
                      {selectedContact.isAI ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        >
                          <BrainCircuit className="w-6 h-6 text-white" />
                        </motion.div>
                      ) : (
                        <User className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">{selectedContact.name}</h3>
                    <p className="text-sm text-white/60">
                      {selectedContact.isAI ? 'Assistente Virtual • Online' : selectedContact.phone}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Área de Mensagens */}
              <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
                <div className="space-y-4 mb-4">
                  <AnimatePresence>
                    {chatMessages.map((msg, index) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        className={`flex ${msg.sender === 'user' ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex gap-3 max-w-[80%] ${msg.sender === 'user' ? "flex-row-reverse" : ""}`}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                            {msg.sender === 'assistant' ? (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-white" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                                <User className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className={`rounded-2xl px-4 py-3 backdrop-blur-md border transition-all duration-300 ${
                              msg.sender === 'user'
                                ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400/30 text-white shadow-lg shadow-cyan-500/20"
                                : "bg-gradient-to-r from-pink-500/20 to-violet-500/20 border-pink-400/30 text-white shadow-lg shadow-pink-500/20"
                            }`}
                          >
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                            <p className="text-xs text-white/50 mt-2">
                              {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </motion.div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {/* Indicador de digitação */}
                  <AnimatePresence>
                    {isTyping && <TypingIndicator />}
                  </AnimatePresence>
                </div>
              </ScrollArea>

              {/* Campo de Entrada */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 backdrop-blur-xl bg-white/5 border-t border-white/10"
              >
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite sua mensagem..."
                      disabled={isSending}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-2xl px-4 py-3 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:bg-white/15 transition-all duration-300 backdrop-blur-md"
                    />
                    <motion.div
                      className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-cyan-400 to-pink-400 opacity-0 pointer-events-none"
                      animate={{ opacity: message.trim() ? 0.3 : 0 }}
                      style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude' }}
                    />
                  </div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!message.trim() || isSending}
                      className="bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 text-white rounded-2xl px-6 py-3 shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <motion.div
                          whileHover={{ x: 2 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Send className="w-5 h-5" />
                        </motion.div>
                      )}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </>
          ) : (
            /* Estado Inicial */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex items-center justify-center"
            >
              <div className="text-center max-w-md">
                <motion.div
                  animate={{ 
                    rotate: [0, 360],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                    scale: { duration: 2, repeat: Infinity }
                  }}
                  className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-cyan-500 to-pink-500 flex items-center justify-center"
                >
                  <MessageCircle className="w-12 h-12 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-4 bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
                  Bem-vindo ao ISA 2.5
                </h3>
                <p className="text-white/60 leading-relaxed">
                  Selecione um contato na barra lateral para iniciar uma conversa ou interagir com nosso assistente IA.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatNew;