import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { FileDown, Filter, TrendingUp, Users, Clock, Star } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--tertiary))"];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7");
  const [stats, setStats] = useState({
    total: 0,
    aiResolved: 0,
    humanResolved: 0,
    avgTime: 0,
    satisfaction: 0,
  });
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [agentData, setAgentData] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
  }, [period]);

  const loadReports = async () => {
    try {
      setLoading(true);

      // Buscar atendimentos do período
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));

      const { data: attendances, error } = await supabase
        .from("attendances")
        .select("*")
        .gte("created_at", daysAgo.toISOString());

      if (error) throw error;

      // Calcular estatísticas
      const total = attendances?.length || 0;
      const aiResolved = attendances?.filter((a) => a.assigned_to === "ai").length || 0;
      const humanResolved = attendances?.filter((a) => a.assigned_to === "human").length || 0;

      // Calcular tempo médio (mock)
      const avgTime = 4.5;

      // Calcular satisfação média
      const ratings = attendances?.filter((a) => a.rating).map((a) => a.rating) || [];
      const satisfaction = ratings.length > 0
        ? ratings.reduce((acc, r) => acc + r, 0) / ratings.length
        : 0;

      setStats({
        total,
        aiResolved,
        humanResolved,
        avgTime,
        satisfaction,
      });

      // Gerar dados de linha do tempo (mock)
      const timeline = [];
      for (let i = parseInt(period) - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        timeline.push({
          date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          ia: Math.floor(Math.random() * 30) + 10,
          suporte: Math.floor(Math.random() * 20) + 5,
        });
      }
      setTimelineData(timeline);

      // Gerar dados de agentes (mock)
      setAgentData([
        { name: "Carlos", atendimentos: 87, tempo: 4.2, avaliacao: 4.8 },
        { name: "Ana", atendimentos: 76, tempo: 5.1, avaliacao: 4.9 },
        { name: "João", atendimentos: 65, tempo: 3.8, avaliacao: 4.7 },
        { name: "Maria", atendimentos: 58, tempo: 6.0, avaliacao: 4.6 },
      ]);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
      toast.error("Erro ao carregar relatórios");
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    { name: "IA", value: stats.aiResolved },
    { name: "Suporte", value: stats.humanResolved },
  ];

  const exportPDF = () => {
    toast.info("Exportação para PDF em desenvolvimento");
  };

  const exportExcel = () => {
    toast.info("Exportação para Excel em desenvolvimento");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Relatórios
          </h1>
          <p className="text-muted-foreground">
            Análise detalhada do desempenho do sistema
          </p>
        </div>

        <div className="flex gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={exportPDF}>
            <FileDown className="w-4 h-4 mr-2" />
            PDF
          </Button>

          <Button variant="outline" onClick={exportExcel}>
            <FileDown className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{stats.total}</span>
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Nos últimos {period} dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Resolução IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">
                {stats.total > 0 ? Math.round((stats.aiResolved / stats.total) * 100) : 0}%
              </span>
              <Users className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.aiResolved} atendimentos pela IA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tempo Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{stats.avgTime.toFixed(1)}min</span>
              <Clock className="w-5 h-5 text-secondary" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Por atendimento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Satisfação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{stats.satisfaction.toFixed(1)}</span>
              <Star className="w-5 h-5 text-warning fill-warning" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avaliação média
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Linha - Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Atendimentos nos Últimos {period} Dias</CardTitle>
          <CardDescription>Comparativo entre IA e Suporte Humano</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="ia" stroke="hsl(var(--primary))" strokeWidth={2} name="IA" />
              <Line type="monotone" dataKey="suporte" stroke="hsl(var(--secondary))" strokeWidth={2} name="Suporte" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Gráfico de Pizza */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Atendimentos</CardTitle>
            <CardDescription>IA vs Suporte Humano</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ranking de Agentes */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking de Agentes</CardTitle>
            <CardDescription>Desempenho da equipe</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="atendimentos" fill="hsl(var(--primary))" name="Atendimentos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}