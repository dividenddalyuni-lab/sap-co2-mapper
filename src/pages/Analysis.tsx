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
        <div className="relative mx-auto rounded-xl bg-white/95 px-5 py-4 inline-flex items-center gap-3">
          {/* Custom inline infinity icon with energy stream tracing the exact path */}
          <svg viewBox="0 0 100 50" className="w-[68px] h-[34px]" fill="none">
            <defs>
              <linearGradient id="energyTrail" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(155 65% 35%)" stopOpacity="0" />
                <stop offset="55%" stopColor="hsl(155 75% 45%)" stopOpacity="1" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
              </linearGradient>
              <filter id="energyGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Base infinity stroke (dark green) */}
            <path
              d="M 50 25 C 50 5 8 5 8 25 C 8 45 50 45 50 25 C 50 5 92 5 92 25 C 92 45 50 45 50 25"
              stroke="hsl(155 50% 25%)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Energy trail flowing along the exact same figure-8 */}
            <path
              d="M 50 25 C 50 5 8 5 8 25 C 8 45 50 45 50 25 C 50 5 92 5 92 25 C 92 45 50 45 50 25"
              stroke="url(#energyTrail)"
              strokeWidth="2.8"
              strokeLinecap="round"
              filter="url(#energyGlow)"
              pathLength={100}
              strokeDasharray="14 100"
              className="animate-energy-flow"
            />
          </svg>
          <div className="flex flex-col leading-none text-left">
            <span className="text-[22px] font-bold tracking-wide text-[hsl(155,40%,15%)]">CLYMA<span className="font-extrabold">IQ</span></span>
            <span className="text-[11px] text-[hsl(155,15%,35%)] tracking-wide">ESG Platform</span>
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
