import { createContext, useContext } from "react";
import { BookingLine, ClaudeResponse, CalculatedLine, AppScreen } from "@/lib/types";
import { AIProvider } from "@/lib/ai-provider";

export interface AppState {
  screen: AppScreen;
  setScreen: (s: AppScreen) => void;
  bookingLines: BookingLine[];
  setBookingLines: (lines: BookingLine[]) => void;
  claudeResponse: ClaudeResponse | null;
  calculatedLines: CalculatedLine[];
  apiKey: string;
  setApiKey: (key: string) => void;
  provider: AIProvider;
  setProvider: (p: AIProvider) => void;
  isAnalyzing: boolean;
  analysisStep: string;
  startAnalysis: (useMock?: boolean) => Promise<void>;
  resetAnalysis: () => void;
}

export const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export const ANALYSIS_STEPS = [
  "Buchungszeilen werden eingelesen...",
  "KI klassifiziert Emissionskategorien...",
  "Anomalien werden geprüft...",
  "Emissionsfaktoren werden zugeordnet...",
  "CO₂ wird berechnet nach GHG Protocol...",
  "Datenqualität wird bewertet...",
  "CSRD-Report wird erstellt...",
];
