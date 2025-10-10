import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, CheckCircle, Calendar, Users, TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  iaAtendendo: number;
  finalizados: number;
  ultimos15Dias: number;
  agentesOnline: number;
  aguardando: number;
  emAtendimento: number;
  finalizadosHoje: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    iaAtendendo: 0,
    finalizados: 0,
    ultimos15Dias: 0,
    agentesOnline: 0,
    aguardando: 0,
    emAtendimento: 0,
    finalizadosHoje: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Buscar atendimentos ativos pela IA
      const { count: iaAtendendo } = await supabase
        .from('attendances')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress')
        .eq('assigned_to', 'ai');

      // Buscar atendimentos finalizados (total)
      const { count: finalizados } = await supabase
        .from('attendances')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'finished');

      // Buscar atendimentos dos últimos 15 dias
      const quinzeDiasAtras = new Date();
      quinzeDiasAtras.setDate(quinzeDiasAtras.getDate() - 15);
      const { count: ultimos15Dias } = await supabase
        .from('attendances')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', quinzeDiasAtras.toISOString());

      // Buscar agentes online (assumindo que existe uma tabela support_users)
      const { count: agentesOnline } = await supabase
        .from('support_users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Buscar atendimentos aguardando
      const { count: aguardando } = await supabase
        .from('attendances')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting');

      // Buscar atendimentos em atendimento
      const { count: emAtendimento } = await supabase
        .from('attendances')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');

      // Buscar atendimentos finalizados hoje
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const { count: finalizadosHoje } = await supabase
        .from('attendances')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'finished')
        .gte('finished_at', hoje.toISOString());

      // Buscar atividades recentes
      const { data: activityData } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        iaAtendendo: iaAtendendo || 0,
        finalizados: finalizados || 0,
        ultimos15Dias: ultimos15Dias || 0,
        agentesOnline: agentesOnline || 0,
        aguardando: aguardando || 0,
        emAtendimento: emAtendimento || 0,
        finalizadosHoje: finalizadosHoje || 0,
      });

      setActivities(activityData || []);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'há alguns segundos';
    if (diffInSeconds < 3600) return `há ${Math.floor(diffInSeconds / 60)} minutos`;
    if (diffInSeconds < 86400) return `há ${Math.floor(diffInSeconds / 3600)} horas`;
    return `há ${Math.floor(diffInSeconds / 86400)} dias`;
  };

  const dashboardStats = [
    {
      title: "IA ATENDENDO",
      value: loading ? "..." : stats.iaAtendendo.toString(),
      description: "clientes agora",
      icon: Bot,
      trend: "+23%",
      trendUp: true,
      color: "primary",
    },
    {
      title: "FINALIZADOS",
      value: loading ? "..." : stats.finalizados.toLocaleString('pt-BR'),
      description: "atendimentos",
      icon: CheckCircle,
      trend: "+15%",
      trendUp: true,
      color: "success",
    },
    {
      title: "ÚLTIMOS 15 DIAS",
      value: loading ? "..." : stats.ultimos15Dias.toString(),
      description: "atendimentos",
      icon: Calendar,
      trend: "-8%",
      trendUp: false,
      color: "warning",
    },
    {
      title: "SUPORTE ONLINE",
      value: loading ? "..." : stats.agentesOnline.toString(),
      description: "agentes",
      icon: Users,
      trend: stats.agentesOnline > 0 ? "Todos ativos" : "Nenhum ativo",
      trendUp: stats.agentesOnline > 0,
      color: "secondary",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do seu sistema de atendimento
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="relative overflow-hidden group hover:shadow-lg transition-shadow">
              <div className={`absolute top-0 left-0 w-1 h-full bg-${stat.color}`} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg bg-${stat.color}/10`}>
                    <Icon className={`w-5 h-5 text-${stat.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <p className="text-sm text-muted-foreground">{stat.description}</p>
                  <div className="flex items-center gap-1 pt-2">
                    {stat.trendUp ? (
                      <TrendingUp className="w-4 h-4 text-success" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    )}
                    <span className={`text-sm font-medium ${stat.trendUp ? "text-success" : "text-destructive"}`}>
                      {stat.trend}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts and Activities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Atendimentos nos Últimos 15 Dias</CardTitle>
            <CardDescription>Comparativo entre IA e Suporte Humano</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center border-2 border-dashed border-border rounded-lg">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Gráfico de linha será exibido aqui</p>
                <p className="text-xs mt-1">Integração com biblioteca de gráficos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center text-muted-foreground py-8">Carregando...</div>
            ) : activities.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">Nenhuma atividade recente</div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div key={index} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{activity.type}</span>{" "}
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimeAgo(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status dos Atendimentos</CardTitle>
            <CardDescription>Distribuição atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-sm">Aguardando</span>
                </div>
                <span className="font-bold">{loading ? "..." : stats.aguardando}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm">Em Atendimento</span>
                </div>
                <span className="font-bold">{loading ? "..." : stats.emAtendimento}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-sm">Finalizados Hoje</span>
                </div>
                <span className="font-bold">{loading ? "..." : stats.finalizadosHoje}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Taxa de Resolução</CardTitle>
            <CardDescription>Últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Resolvidos pela IA</span>
                  <span className="font-bold">
                    {loading ? "..." : stats.finalizados > 0 ? Math.round((stats.iaAtendendo / stats.finalizados) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-primary transition-all" 
                    style={{ 
                      width: stats.finalizados > 0 ? `${Math.round((stats.iaAtendendo / stats.finalizados) * 100)}%` : '0%' 
                    }} 
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Resolvidos pelo Suporte</span>
                  <span className="font-bold">
                    {loading ? "..." : stats.finalizados > 0 ? Math.round(((stats.emAtendimento - stats.iaAtendendo) / stats.finalizados) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-secondary transition-all" 
                    style={{ 
                      width: stats.finalizados > 0 ? `${Math.round(((stats.emAtendimento - stats.iaAtendendo) / stats.finalizados) * 100)}%` : '0%' 
                    }} 
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Não Resolvidos</span>
                  <span className="font-bold">
                    {loading ? "..." : stats.finalizados > 0 ? Math.round((stats.aguardando / stats.finalizados) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-destructive transition-all" 
                    style={{ 
                      width: stats.finalizados > 0 ? `${Math.round((stats.aguardando / stats.finalizados) * 100)}%` : '0%' 
                    }} 
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
