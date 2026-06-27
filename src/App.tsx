import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/context/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import UploadPage from "@/pages/Upload";
import AnalysisPage from "@/pages/Analysis";
import DashboardPage from "@/pages/Dashboard";
import CSRDReportPage from "@/pages/CSRDReport";
import AnomaliesPage from "@/pages/Anomalies";
import AIAssistantPage from "@/pages/AIAssistant";
import SavingsPage from "@/pages/Savings";
import SupplierChatPage from "@/pages/SupplierChat";
import KalenderPage from "@/pages/Kalender";

const queryClient = new QueryClient();

function ScreenRouter() {
  const { screen } = useApp();

  if (screen === "analysis") return <AnalysisPage />;

  return (
    <AppLayout>
      {screen === "upload" && <UploadPage />}
      {screen === "dashboard" && <DashboardPage />}
      {screen === "csrd-report" && <CSRDReportPage />}
      {screen === "anomalies" && <AnomaliesPage />}
      {screen === "ai-assistant" && <AIAssistantPage />}
      {screen === "savings" && <SavingsPage />}
      {screen === "supplier-chat" && <SupplierChatPage />}
      {screen === "kalender" && <KalenderPage />}
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <ScreenRouter />
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
