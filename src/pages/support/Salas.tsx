import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { LogOut, Search, MoreVertical, MessageCircle, Users, AlertCircle, Loader2, Send, Sparkles, CornerDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Contact {
  id: string;
  profilePicUrl?: string;
  pushName?: string;
  name?: string;
  lastMessage?: {
    body: string;
    timestamp: number;
  };
  unreadCount?: number;
}

interface Message {
  id: { id: string };
  body: string;
  fromMe: boolean;
  timestamp: number;
}

const SalasPage: React.FC = () => {
  const navigate = useNavigate();
  const [socket, setSocket] = useState<import('socket.io-client').Socket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supportUser, setSupportUser] = useState<any>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supportUserData = sessionStorage.getItem('support_user');
    if (!supportUserData) {
      toast.error('Sessão expirada. Faça login novamente.');
      navigate('/support-login');
      return;
    }
    const user = JSON.parse(supportUserData);
    setSupportUser(user);

    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
      newSocket.emit('get-contacts');
    });

    newSocket.on('contacts', (contacts) => {
      setContacts(contacts);
    });

    newSocket.on('message', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    newSocket.on('chats', (chats) => {
      setMessages(chats);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedContact) {
      socket?.emit('get-chats', selectedContact.id);
    }
  }, [selectedContact, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedContact) {
      socket?.emit('send-message', { to: selectedContact.id, message: newMessage });
      setNewMessage('');
      setAiResponse('');
    }
  };

  const handleGenerateAiResponse = async () => {
    if (!selectedContact) return;

    const recentMessages = messages.slice(-5).map(msg => `${msg.fromMe ? 'You' : 'Contact'}: ${msg.body}`).join('\n');

    try {
      const response = await fetch('http://localhost:3001/generate-ai-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation: recentMessages }),
      });
      const data = await response.json();
      setAiResponse(data.response);
    } catch (error) {
      console.error('Error generating AI response:', error);
      toast.error('Erro ao gerar resposta da IA.');
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const name = contact.pushName || contact.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-full md:w-[420px] border-r border-border flex flex-col bg-card">
        {/* ... (header and search remain the same) ... */}
        {/* Contacts List */}
        {!isLoading && !error && (
          <ScrollArea className="flex-1">
            {filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'Nenhum contato encontrado' : 'Nenhum contato disponível'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`flex items-center gap-3 p-3 hover:bg-accent cursor-pointer transition-colors ${
                      selectedContact?.id === contact.id ? 'bg-accent' : ''
                    }`}
                  >
                    <Avatar className="h-12 w-12">
                      {contact.profilePicUrl ? (
                        <AvatarImage src={contact.profilePicUrl} alt={contact.pushName || contact.name} />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(contact.pushName || contact.name || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm truncate">
                          {contact.pushName || contact.name || 'Sem nome'}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(contact.lastMessage?.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-muted-foreground truncate flex-1">
                          {contact.lastMessage?.body || 'Sem mensagens'}
                        </p>
                        {contact.unreadCount && contact.unreadCount > 0 ? (
                          <Badge variant="default" className="h-5 min-w-5 rounded-full px-1.5">
                            {contact.unreadCount}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-card border-b border-border px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  {selectedContact.profilePicUrl ? (
                    <AvatarImage src={selectedContact.profilePicUrl} alt={selectedContact.pushName || selectedContact.name} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(selectedContact.pushName || selectedContact.name || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">
                    {selectedContact.pushName || selectedContact.name || 'Sem nome'}
                  </h2>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Search className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-4 py-2 rounded-lg max-w-lg ${msg.fromMe ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                      <p>{msg.body}</p>
                      <span className="text-xs opacity-75 float-right mt-1">{formatTimestamp(msg.timestamp)}</span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 bg-card border-t border-border">
              {aiResponse && (
                <div className="bg-accent p-2 rounded-md mb-2 text-sm">
                  <p className="text-muted-foreground">Sugestão da IA:</p>
                  <p>{aiResponse}</p>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setNewMessage(aiResponse);
                    setAiResponse('');
                  }}>
                    <CornerDownLeft className="w-4 h-4 mr-2" /> Usar esta resposta
                  </Button>
                </div>
              )}
              <div className="relative">
                <Input
                  placeholder="Digite uma mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="pr-24"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Button size="icon" variant="ghost" onClick={handleGenerateAiResponse}>
                    <Sparkles className="w-5 h-5" />
                  </Button>
                  <Button size="icon" onClick={handleSendMessage}>
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4 max-w-md">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">ISA 2.5 - Atendimento</h2>
                <p className="text-muted-foreground">
                  Selecione um contato da lista para iniciar uma conversa
                </p>
              </div>
              <div className="pt-4">
                <div className="flex-1 overflow-y-auto">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className={`flex items-center p-3 cursor-pointer hover:bg-gray-700 ${selectedContact?.id === contact.id ? 'bg-gray-700' : ''}`}
                      onClick={() => setSelectedContact(contact)}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-600 mr-3"></div>
                      <div className="flex-1">
                        <div className="font-semibold">{contact.name}</div>
                        <div className="text-sm text-gray-400">{contact.lastMessage?.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalasPage;