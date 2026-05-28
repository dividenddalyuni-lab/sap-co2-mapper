import { Leaf } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

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
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto animate-logo-drift">
          <Leaf className="w-10 h-10 text-primary" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white mb-2">CLYMAIQ</h1>
          <p className="text-white/40 text-sm">KI-Analyse läuft</p>
        </div>

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
