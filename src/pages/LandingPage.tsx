import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Clock, Zap, BarChart3, MessageSquare, Shield, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Bot,
      title: "IA Avançada",
      description: "Powered by Inovapro AI",
      color: "text-blue-500"
    },
    {
      icon: Clock,
      title: "Suporte 24/7",
      description: "Atendimento ininterrupto",
      color: "text-green-500"
    },
    {
      icon: Zap,
      title: "Ultra Rápido",
      description: "Respostas instantâneas",
      color: "text-yellow-500"
    },
    {
      icon: MessageSquare,
      title: "WhatsApp",
      description: "Integração completa",
      color: "text-emerald-500"
    }
  ];

  const benefits = [
    { icon: Shield, text: "Segurança e privacidade garantidas" },
    { icon: BarChart3, text: "Análises e relatórios em tempo real" },
    { icon: Sparkles, text: "Aprendizado contínuo com IA" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl top-0 -left-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl bottom-0 -right-48 animate-pulse delay-700"></div>
        <div className="absolute w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <Bot className="w-8 h-8 text-blue-400 animate-pulse" />
            <span className="text-2xl font-bold text-white">ISA 2.5</span>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/login')}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Entrar
          </Button>
        </div>

        <div className="max-w-6xl mx-auto space-y-16">
          {/* Hero Section */}
          <div className="text-center space-y-6 animate-fade-in">
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-sm px-4 py-1">
              <Sparkles className="w-3 h-3 mr-1 inline" />
              Powered by Inovapro AI
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
              Atendimento Inteligente
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                24 Horas por Dia
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto">
              Revolucione seu atendimento ao cliente com inteligência artificial de última geração
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6 text-center space-y-3">
                  <div className={`w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center ${feature.color}`}>
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{feature.title}</h3>
                  <p className="text-sm text-slate-400">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main CTA Card */}
          <Card className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 border-blue-500/30 backdrop-blur-md overflow-hidden animate-fade-in">
            <CardContent className="p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  <div className="space-y-4">
                    {benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center backdrop-blur-sm">
                          <benefit.icon className="w-5 h-5 text-blue-300" />
                        </div>
                        <span className="text-white text-lg">{benefit.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-white">R$ 59,90</span>
                      <span className="text-xl text-slate-400">/mês</span>
                    </div>
                    <p className="text-sm text-slate-400">
                      🔥 Oferta especial de lançamento • Cancele quando quiser
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Button 
                    size="lg" 
                    className="w-full text-lg h-16 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 transition-all duration-300 hover:scale-105"
                    onClick={() => navigate('/cadastro')}
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Começar Agora
                  </Button>

                  <div className="text-center text-sm text-slate-400">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Ativação instantânea • Sem burocracia
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-8 items-center opacity-60 animate-fade-in">
            <div className="flex items-center gap-2 text-slate-400">
              <Shield className="w-5 h-5" />
              <span className="text-sm">Pagamento Seguro</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Bot className="w-5 h-5" />
              <span className="text-sm">IA Inovapro</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-5 h-5" />
              <span className="text-sm">Suporte 24/7</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;