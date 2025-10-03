import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();

  const benefits = [
    "Atendimento automatizado via WhatsApp",
    "Gestão inteligente de filas",
    "Suporte 24/7 com IA",
    "Relatórios e análises detalhadas",
    "Integração completa",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground">
            Assine o ISA 2.5
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            O sistema de atendimento inteligente que revoluciona a forma como você se conecta com seus clientes
          </p>

          <Card className="border-primary/20">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3 text-left">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-lg">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t space-y-4">
                <div className="text-4xl font-bold text-foreground">
                  R$ 59,90<span className="text-lg text-muted-foreground">/mês</span>
                </div>
                
                <Button 
                  size="lg" 
                  className="w-full text-lg h-14"
                  onClick={() => navigate('/cadastro')}
                >
                  Começar Agora
                </Button>

                <p className="text-sm text-muted-foreground">
                  Cancele quando quiser. Sem compromisso.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/login')}
            >
              Já tem uma conta? Faça login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;