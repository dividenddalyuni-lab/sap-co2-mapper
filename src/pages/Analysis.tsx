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
        <div className="relative mx-auto w-[320px] rounded-xl bg-white/95 px-4 py-3">
          <img src={clymaiqLogo} alt="CLYMAIQ ESG Platform" className="w-full h-auto object-contain relative z-0" />
          {/* Energy stream flowing along the infinity curve of the icon */}
          <svg
            className="pointer-events-none absolute z-10"
            style={{ left: "5%", top: "18%", width: "40%", height: "64%" }}
            viewBox="0 0 200 100"
            preserveAspectRatio="none"
            fill="none"
          >
            <defs>
              <linearGradient id="energyTrail" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                <stop offset="55%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
              </linearGradient>
              <filter id="energyGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Full infinity / figure-8 path traversing both loops */}
            <path
              d="M 50 50 C 50 18 18 18 18 50 C 18 82 50 82 50 50 C 50 18 82 18 82 50 C 82 82 50 82 50 50"
              stroke="url(#energyTrail)"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#energyGlow)"
              pathLength={100}
              strokeDasharray="18 100"
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
