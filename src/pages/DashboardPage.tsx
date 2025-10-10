import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api-client";
import { AlertCircle, CheckCircle, Calendar } from "lucide-react";

interface Subscription {
  status: string;
  expires_at: string | null;
  full_name: string;
  email: string;
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [renewLoading, setRenewLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadSubscription();
  }, [user]);

  const loadSubscription = async () => {
    try {
      const data = await apiClient.request('GET', `/subscriptions/${user?.id}`);
      setSubscription(data);

      // Calculate days remaining
      if (data.expires_at) {
        const expiryDate = new Date(data.expires_at);
        const today = new Date();
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysRemaining(diffDays);
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    setRenewLoading(true);
    try {
      // Redirect to Stripe payment link
      const paymentUrl = `https://buy.stripe.com/aFa6oIfC9du3fs008Z83C02?client_reference_id=${user?.id}&prefilled_email=${encodeURIComponent(subscription?.email || '')}`;
      window.location.href = paymentUrl;
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível processar a renovação",
        variant: "destructive",
      });
    } finally {
      setRenewLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  const isActive = subscription?.status === "active";
  const isExpired = daysRemaining <= 0;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl py-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Painel ISA 2.5</h1>
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações da Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="text-lg font-medium">{subscription?.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-lg font-medium">{subscription?.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status da Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3">
              {isActive && !isExpired ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <Badge className="bg-green-500">Ativa</Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="w-6 h-6 text-destructive" />
                  <Badge variant="destructive">
                    {isExpired ? "Expirada" : subscription?.status}
                  </Badge>
                </>
              )}
            </div>

            {isActive && !isExpired && (
              <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Dias restantes</p>
                  <p className="text-2xl font-bold">{daysRemaining} dias</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleRenew}
              disabled={renewLoading}
              className="w-full"
              size="lg"
            >
              {renewLoading
                ? "Processando..."
                : isExpired
                ? "Renovar Assinatura"
                : "Adicionar 30 dias"}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              {isExpired
                ? "Sua assinatura expirou. Renove para continuar usando o ISA 2.5."
                : "Renove antes do vencimento e ganhe mais 30 dias."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
