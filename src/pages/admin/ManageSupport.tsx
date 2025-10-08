import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Users, MessageSquare, Settings, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

// Types from Supabase
type SupportRoom = Database['public']['Tables']['support_rooms']['Row'];
type SupportUser = Database['public']['Tables']['support_users']['Row'];
type RoomMember = Database['public']['Tables']['room_members']['Row'];
type WhatsAppConnection = Database['public']['Tables']['whatsapp_connections']['Row'];

// Additional interfaces
interface EvolutionInstance {
  instanceName: string;
  status: 'connected' | 'connecting' | 'disconnected';
  qrCode?: string;
}

const ManageSupport = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<(SupportRoom & { member_count: number; message_count: number })[]>([]);
  const [supportUsers, setSupportUsers] = useState<SupportUser[]>([]);
  const [evolutionInstances, setEvolutionInstances] = useState<EvolutionInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    description: '',
    max_members: 50,
    support_user_id: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSupportRooms(),
        loadSupportUsers(),
        loadEvolutionInstances()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Carregar salas de suporte
  const loadSupportRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('support_rooms')
        .select(`
          *,
          room_members(count),
          attendances(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const roomsWithCounts = data?.map(room => ({
        ...room,
        member_count: room.room_members?.[0]?.count || 0,
        message_count: room.attendances?.[0]?.count || 0
      })) || [];

      setRooms(roomsWithCounts);
    } catch (error) {
      console.error('Erro ao carregar salas:', error);
      throw error;
    }
  };

  const loadSupportUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('support_users')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setSupportUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários de suporte:', error);
      throw error;
    }
  };

  // Carregar conexões WhatsApp
  const loadEvolutionInstances = async () => {
    try {
      // Carregar conexões WhatsApp do banco
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*');
      
      if (error) throw error;
      
      // Converter para formato EvolutionInstance
      const instances: EvolutionInstance[] = data?.map(conn => ({
        instanceName: conn.instance_name,
        status: conn.status === 'connected' ? 'connected' : 'disconnected',
        qrCode: conn.qr_code || undefined
      })) || [];
      
      setEvolutionInstances(instances);
    } catch (error) {
      console.error('Erro ao carregar instâncias Evolution:', error);
      // Fallback para instâncias mockadas se houver erro
      setEvolutionInstances([
        { instanceName: 'default', status: 'connected' },
        { instanceName: 'backup', status: 'disconnected' }
      ]);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoom.name.trim() || !newRoom.support_user_id) {
      toast.error('Nome da sala e usuário de suporte são obrigatórios');
      return;
    }

    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('support_rooms')
        .insert({
          name: newRoom.name.trim(),
          description: newRoom.description.trim() || null,
          max_members: newRoom.max_members,
          support_user_id: newRoom.support_user_id,
          admin_owner_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Sala de suporte criada com sucesso!');
      setIsDialogOpen(false);
      setNewRoom({
        name: '',
        description: '',
        max_members: 50,
        support_user_id: ''
      });
      
      await loadSupportRooms();
    } catch (error: any) {
      console.error('Erro ao criar sala:', error);
      toast.error(error.message || 'Erro ao criar sala de suporte');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    setDeleting(roomId);
    try {
      const { error } = await supabase
        .from('support_rooms')
        .delete()
        .eq('id', roomId);

      if (error) throw error;

      toast.success('Sala excluída com sucesso!');
      await loadSupportRooms();
    } catch (error: any) {
      console.error('Erro ao excluir sala:', error);
      toast.error(error.message || 'Erro ao excluir sala');
    } finally {
      setDeleting(null);
    }
  };

  const handleRefreshData = async () => {
    setRefreshing(true);
    try {
      await loadData();
      toast.success('Dados atualizados com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar dados');
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusBadge = (status: string | boolean) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      connected: 'default',
      connecting: 'outline',
      disconnected: 'destructive'
    } as const;

    // Handle boolean status from is_active field
    const statusStr = typeof status === 'boolean' ? (status ? 'active' : 'inactive') : status;

    return (
      <Badge variant={variants[statusStr as keyof typeof variants] || 'secondary'}>
        {statusStr === 'active' || status === true ? 'Ativa' : 
         statusStr === 'inactive' || status === false ? 'Inativa' :
         statusStr === 'connected' ? 'Conectada' :
         statusStr === 'connecting' ? 'Conectando' : 'Desconectada'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando dados...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Salas de Suporte</h1>
          <p className="text-muted-foreground">
            Gerencie salas de suporte, usuários e conexões WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshData}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Sala
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Criar Nova Sala de Suporte</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="name">Nome da Sala *</Label>
                  <Input
                    id="name"
                    value={newRoom.name}
                    onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                    placeholder="Digite o nome da sala"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={newRoom.description}
                    onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                    placeholder="Descrição opcional da sala"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="support_user">Usuário de Suporte *</Label>
                  <Select
                    value={newRoom.support_user_id}
                    onValueChange={(value) => setNewRoom({ ...newRoom, support_user_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {supportUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="max_members">Máximo de Membros</Label>
                  <Input
                    id="max_members"
                    type="number"
                    min="1"
                    max="500"
                    value={newRoom.max_members}
                    onChange={(e) => setNewRoom({ ...newRoom, max_members: parseInt(e.target.value) || 50 })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={creating}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateRoom} disabled={creating}>
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar Sala
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Salas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salas Ativas</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rooms.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rooms.reduce((total, room) => total + (room.member_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instâncias Evolution</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {evolutionInstances.filter(i => i.status === 'connected').length}/{evolutionInstances.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Support Rooms Table */}
      <Card>
        <CardHeader>
          <CardTitle>Salas de Suporte</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Usuário de Suporte</TableHead>
                <TableHead>Membros</TableHead>
                <TableHead>Máx. Membros</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">{room.name}</TableCell>
                  <TableCell>{room.description || '-'}</TableCell>
                  <TableCell>
                    {supportUsers.find(u => u.id === room.support_user_id)?.full_name || 'N/A'}
                  </TableCell>
                  <TableCell>{room.member_count}</TableCell>
                  <TableCell>{room.max_members}</TableCell>
                  <TableCell>
                     {getStatusBadge('active')}
                   </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={deleting === room.id}
                        >
                          {deleting === room.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a sala "{room.name}"? 
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteRoom(room.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Evolution Instances */}
      <Card>
        <CardHeader>
          <CardTitle>Instâncias Evolution API</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Instância</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>QR Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evolutionInstances.map((instance) => (
                <TableRow key={instance.instanceName}>
                  <TableCell className="font-medium">{instance.instanceName}</TableCell>
                  <TableCell>
                    {getStatusBadge(instance.status)}
                  </TableCell>
                  <TableCell>
                    {instance.qrCode ? (
                      <Button variant="outline" size="sm">
                        Ver QR Code
                      </Button>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageSupport;
