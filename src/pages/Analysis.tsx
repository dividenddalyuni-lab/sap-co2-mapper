import { useApp } from "@/context/AppContext";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import clymaiqLogo from "@/assets/clymaiq-logo-full.png";

export default function AnalysisPage() {
  const { analysisStep } = useApp();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 2, 95));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(155,35%,10%)] flex items-center justify-center">
      <div className="text-center space-y-8 max-w-md w-full px-8">
        <div className="relative mx-auto w-[320px] overflow-hidden rounded-xl bg-white/95 px-4 py-3">
          <img src={clymaiqLogo} alt="CLYMAIQ ESG Platform" className="w-full h-auto object-contain relative z-0" />
          {/* Light sweep moving in one direction across the logo */}
          <div className="pointer-events-none absolute inset-0 z-10 animate-logo-sweep">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary/50 to-transparent blur-md" />
          </div>
        </div>

        <p className="text-white/50 text-sm">KI-Analyse läuft</p>

        <div className="space-y-3">
          <Progress value={progress} className="h-2 bg-white/10" />
          <p className="text-sm text-primary font-medium min-h-[1.5rem]">
            {analysisStep}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-4">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Claude AI</span>
          <span className="text-white/10">•</span>
          <span className="text-[10px] text-white/30 uppercase tracking-wider">GHG Protocol</span>
        </div>
      </div>
    </div>
  );
}
