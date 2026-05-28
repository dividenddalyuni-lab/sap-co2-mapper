import { useApp } from "@/context/AppContext";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import clymaiqLogo from "@/assets/clymaiq-logo-full.png";



export default function AnalysisPage() {
  const { analysisStep } = useApp();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 5, 95));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(155,35%,10%)] flex items-center justify-center">
      <div className="text-center space-y-8 max-w-md w-full px-8">
        <div className="relative mx-auto w-[320px] rounded-xl bg-white/95 px-4 py-3">
          <img src={clymaiqLogo} alt="CLYMAIQ ESG Platform" className="w-full h-auto object-contain relative z-0" />
          {/* Energy stream overlay tracing the infinity icon */}
          <svg
            className="pointer-events-none absolute z-10"
            style={{ left: "5.5%", top: "15%", width: "36%", height: "67%" }}
            viewBox="0 0 100 50"
            preserveAspectRatio="none"
            fill="none"
          >
            <defs>
              <linearGradient id="energyTrail" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(155 75% 45%)" stopOpacity="0" />
                <stop offset="55%" stopColor="hsl(155 80% 50%)" stopOpacity="1" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
              </linearGradient>
              <filter id="energyGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d="M 50 25 C 50 5 8 5 8 25 C 8 45 50 45 50 25 C 50 5 92 5 92 25 C 92 45 50 45 50 25"
              stroke="url(#energyTrail)"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#energyGlow)"
              pathLength={100}
              strokeDasharray="14 100"
              className="animate-energy-flow"
            />
          </svg>
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
