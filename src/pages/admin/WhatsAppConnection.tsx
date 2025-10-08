import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import whatsappService, { WhatsAppInstance, Contact } from '@/lib/whatsapp-service';
import { RefreshCw, Smartphone, Users, CheckCircle, AlertCircle, Loader2, MessageSquare, QrCode, XCircle } from 'lucide-react';

export default function WhatsAppConnection() {
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Verificar se já existe uma instância ativa ao carregar a página
  useEffect(() => {
    checkExistingInstance();
  }, []);

  // Polling para verificar status da instância quando está conectando
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    let timeout: NodeJS.Timeout | undefined;
    
    if (instance?.status === 'connecting') {
      // Verifica a cada 3s
      interval = setInterval(async () => {
        await checkInstanceStatus();
      }, 3000);

      // Mantém o QR code ativo por até 3 minutos antes de sugerir renovação
      timeout = setTimeout(() => {
        toast.info('O QR Code pode ter expirado. Clique em "Gerar QR Code" para renovar.');
      }, 180000); // 3 minutos
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [instance?.status]);

  const checkExistingInstance = async () => {
    try {
      setIsLoading(true);
      
      const existingInstance = whatsappService.getExistingInstance();
      
      if (existingInstance) {
        setInstance(existingInstance);
        
        if (existingInstance.status === 'connected') {
          await loadContacts();
        }
      }
    } catch (error) {
      console.error('Erro ao verificar instância:', error);
      toast.error('Erro ao verificar instância existente');
    } finally {
      setIsLoading(false);
    }
  };

  const checkInstanceStatus = async () => {
    if (!instance?.instanceName) return false;

    try {
      setIsCheckingStatus(true);
      
      const result = await whatsappService.checkInstanceStatus(instance.instanceName);

      if (result.success && result.data?.instance?.state === 'open' && instance.status !== 'connected') {
        setInstance(prev => prev ? { ...prev, status: 'connected' } : null);
        
        toast.success('WhatsApp conectado com sucesso! Sincronizando contatos...');

        await loadContacts();
        return true;
      }
      
      return result.success;
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      return false;
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const generateQRCode = async () => {
    setIsGeneratingQR(true);
    
    try {
      toast.info('Gerando instância do WhatsApp...');

      const result = await whatsappService.createInstance();
      
      if (result.success && result.data?.instance) {
        setInstance(result.data.instance);
        toast.success('QR Code gerado! Escaneie com seu WhatsApp para conectar');
      } else {
        const details = (result as any).body || (result as any).data;
        const status = (result as any).status ? ` (status ${result.status})` : '';
        const extra = details?.message || details?.error || JSON.stringify(details || {});
        toast.error(`Erro ao criar instância${status}: ${result.error || extra}`);
      }
    } catch (error: any) {
      console.error('Erro ao gerar QR Code:', error);
      toast.error(error.message || 'Erro ao gerar QR Code');
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const loadContacts = async () => {
    if (!instance?.instanceName) return;

    setIsLoading(true);
    
    try {
      const contactsList = await whatsappService.getContacts(instance.instanceName);
      
      setContacts(contactsList);
      
      toast.success(`${contactsList.length} contatos sincronizados com sucesso`);
    } catch (error: any) {
      console.error('Erro ao carregar contatos:', error);
      toast.error(error.message || 'Erro ao sincronizar contatos');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshContacts = async () => {
    await loadContacts();
  };

  const disconnectInstance = async () => {
    if (!instance) return;

    try {
      const result = await whatsappService.disconnectInstance(instance.instanceName);

      if (result.success) {
        setInstance(null);
        setContacts([]);

        toast.success('WhatsApp desconectado com sucesso');
      } else {
        throw new Error(result.error || 'Erro ao desconectar instância');
      }
    } catch (error: any) {
      console.error('Erro ao desconectar:', error);
      toast.error(error.message || 'Erro ao desconectar instância');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge>;
      case 'connecting':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Conectando</Badge>;
      default:
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Desconectado</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Conectar WhatsApp</h1>
        <p className="text-gray-600">Integre seu WhatsApp ao sistema de suporte ISA 2.5</p>
      </div>

      {/* Card principal */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Status da Conexão
            {instance && getStatusBadge(instance.status)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-6">
            {!instance ? (
              // Estado inicial - sem instância
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Smartphone className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Conectar WhatsApp</h3>
                  <p className="text-gray-600 mb-4">
                    Clique no botão abaixo para gerar um QR Code e conectar seu WhatsApp
                  </p>
                </div>
                <Button 
                  onClick={generateQRCode} 
                  disabled={isGeneratingQR} 
                  size="lg" 
                  autoFocus
                  className="w-full max-w-xs"
                >
                  {isGeneratingQR ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    'Gerar QR Code'
                  )}
                </Button>
              </div>
            ) : instance.status === 'connecting' && instance.qrCode ? (
              // Estado conectando - mostra QR Code
              <div className="text-center space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Escaneie o QR Code</h3>
                  <p className="text-gray-600 mb-4">
                    Abra o WhatsApp no seu celular e escaneie o código abaixo
                  </p>
                </div>
                <div className="p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm">
                  <img 
                    src={instance.qrCode} 
                    alt="QR Code WhatsApp" 
                    className="w-64 h-64 mx-auto"
                  />
                </div>
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Aguardando leitura do QR Code...</span>
                </div>
                <Button 
                  variant="outline" 
                  onClick={disconnectInstance}
                  className="mt-4"
                >
                  Cancelar Conexão
                </Button>
              </div>
            ) : instance.status === 'connected' ? (
              // Estado conectado - mostra informações da instância
              <div className="text-center space-y-4 w-full">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">WhatsApp Conectado!</h3>
                  <p className="text-gray-600 mb-4">
                    Instância: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{instance.instanceName}</code>
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={refreshContacts} 
                    disabled={isLoading}
                    variant="default"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Atualizar Contatos
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={disconnectInstance}
                  >
                    Desconectar
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Lista de contatos */}
      {instance?.status === 'connected' && contacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Contatos Sincronizados ({contacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sincronizado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">
                        {contact.name || 'Sem nome'}
                      </TableCell>
                      <TableCell>{contact.number}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{contact.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(contact.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
