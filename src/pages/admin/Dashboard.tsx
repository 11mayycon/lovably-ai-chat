import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, CheckCircle, Calendar, Users, TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react";

const Dashboard = () => {
  const stats = [
    {
      title: "IA ATENDENDO",
      value: "47",
      description: "clientes agora",
      icon: Bot,
      trend: "+23%",
      trendUp: true,
      color: "primary",
    },
    {
      title: "FINALIZADOS",
      value: "1.284",
      description: "atendimentos",
      icon: CheckCircle,
      trend: "+15%",
      trendUp: true,
      color: "success",
    },
    {
      title: "ÚLTIMOS 15 DIAS",
      value: "892",
      description: "atendimentos",
      icon: Calendar,
      trend: "-8%",
      trendUp: false,
      color: "warning",
    },
    {
      title: "SUPORTE ONLINE",
      value: "12",
      description: "agentes",
      icon: Users,
      trend: "Todos ativos",
      trendUp: true,
      color: "secondary",
    },
  ];

  const recentActivities = [
    { agent: "Carlos", action: "aceitou atendimento #1847", time: "há 2 minutos" },
    { agent: "IA", action: "finalizou atendimento com Maria", time: "há 5 minutos" },
    { agent: "Sistema", action: "Novo cliente: João Silva", time: "há 8 minutos" },
    { agent: "Ana", action: "transferiu para sala Técnico", time: "há 12 minutos" },
    { agent: "IA", action: "iniciou conversa com Pedro", time: "há 15 minutos" },
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
            {stats.map((stat) => {
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
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{activity.agent}</span>{" "}
                          {activity.action}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
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
                    <span className="font-bold">18</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-sm">Em Atendimento</span>
                    </div>
                    <span className="font-bold">47</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-success" />
                      <span className="text-sm">Finalizados Hoje</span>
                    </div>
                    <span className="font-bold">156</span>
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
                      <span className="font-bold">76%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-primary w-3/4 transition-all" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Resolvidos pelo Suporte</span>
                      <span className="font-bold">18%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-secondary w-[18%] transition-all" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Não Resolvidos</span>
                      <span className="font-bold">6%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-destructive w-[6%] transition-all" />
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
