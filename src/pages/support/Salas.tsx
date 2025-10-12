import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWhatsAppChats, getWhatsAppMessages, sendWhatsAppMessage, WhatsAppChat, WhatsAppMessage } from '../../lib/whatsapp-wwebjs';
import { toast } from 'sonner';
import { LogOut, Search, MoreVertical, MessageCircle, Users, AlertCircle, Loader2 } from 'lucide-react';
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

const SalasPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supportUser, setSupportUser] = useState<any>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const supportUserData = sessionStorage.getItem('support_user');
    
    if (!supportUserData) {
      toast.error('Sessão expirada. Faça login novamente.');
      navigate('/support-login');
      return;
    }

    const user = JSON.parse(supportUserData);
    setSupportUser(user);
    loadContacts();
  }, [navigate]);

  const loadContacts = async () => {
    setIsLoading(true);
    setError(null);
    setContacts([]);

    try {
      const supportUserData = sessionStorage.getItem('support_user');
      if (!supportUserData) {
        setError('Sessão expirada. Faça login novamente.');
        setIsLoading(false);
        navigate('/support-login');
        return;
      }

      const user = JSON.parse(supportUserData);
      const rooms = JSON.parse(sessionStorage.getItem('support_rooms') || '[]');

      if (!rooms || rooms.length === 0) {
        setError('Nenhuma sala de atendimento encontrada. Entre em contato com o administrador.');
        setIsLoading(false);
        return;
      }

      const adminOwnerId = rooms[0].admin_owner_id;

      // Buscar chats diretamente via WWebJS
      try {
        const chats = await getWhatsAppChats(adminOwnerId);
        
        if (chats && chats.length > 0) {
          // Converter formato WWebJS para formato esperado
          const formattedContacts = chats.map((chat: WhatsAppChat) => ({
            id: chat.id,
            profilePicUrl: chat.profilePicUrl,
            pushName: chat.pushName || chat.name,
            name: chat.name,
            lastMessage: chat.lastMessage,
            unreadCount: chat.unreadCount || 0
          }));
          
          setContacts(formattedContacts);
        } else {
          setError('Nenhum contato encontrado. O administrador pode não ter WhatsApp conectado.');
        }
      } catch (err: any) {
        console.error('Erro ao buscar chats:', err);
        if (err.message.includes('Sessão não está pronta')) {
          setError('Nenhuma conta WhatsApp está conectada. Informe o administrador responsável para realizar a conexão no painel de administração.');
        } else {
          setError(err.message || 'Erro ao buscar contatos do WhatsApp.');
        }
      }
    } catch (err) {
      console.error('Erro ao buscar contatos:', err);
      setError('Ocorreu um erro ao buscar os dados. Verifique sua conexão e tente novamente.');
    }

    setIsLoading(false);
  };

  const filteredContacts = contacts.filter(contact => {
    const name = contact.pushName || contact.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Lista de Contatos */}
      <div className="w-full md:w-[420px] border-r border-border flex flex-col bg-card">
        {/* Header */}
        <div className="h-16 bg-card border-b border-border px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {supportUser?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{supportUser?.full_name}</span>
              <span className="text-xs text-muted-foreground">{supportUser?.matricula}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadContacts()}
              disabled={isLoading}
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                sessionStorage.removeItem('support_user');
                navigate('/support-login');
              }}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contatos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Carregando contatos...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center space-y-4 max-w-sm">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Erro ao carregar</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button onClick={() => loadContacts()} variant="outline">
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

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
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-3">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  Selecione um contato para visualizar as mensagens
                </p>
                <p className="text-sm text-muted-foreground">
                  A visualização completa de mensagens será implementada em breve
                </p>
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
                <p className="text-xs text-muted-foreground">
                  {contacts.length} {contacts.length === 1 ? 'contato disponível' : 'contatos disponíveis'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalasPage;