import React, { useState, useCallback } from "react";
import { BookingLine, ClaudeResponse, CalculatedLine, AppScreen, SupplierSession } from "@/lib/types";
import { calculateEmissions } from "@/lib/co2-utils";
import { callClaudeAPI } from "@/lib/claude-api";
import { buildFallbackResponse } from "@/lib/fallback-classifier";
import { AppContext, ANALYSIS_STEPS } from "./app-context-core";
import { AIProvider } from "@/lib/ai-provider";

export { useApp } from "./app-context-core";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<AppScreen>("upload");
  const [bookingLines, setBookingLines] = useState<BookingLine[]>([]);
  const [claudeResponse, setClaudeResponse] = useState<ClaudeResponse | null>(null);
  const [calculatedLines, setCalculatedLines] = useState<CalculatedLine[]>([]);
  const [provider, setProviderState] = useState<AIProvider>(
    () => ((localStorage.getItem("clymaiq_provider") as AIProvider) || "claude")
  );
  const [apiKey, setApiKeyState] = useState(
    () => localStorage.getItem(`clymaiq_api_key_${provider}`) || ""
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState("");
  const [supplierSession, setSupplierSession] = useState<SupplierSession | null>(null);

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    localStorage.setItem(`clymaiq_api_key_${provider}`, key);
  }, [provider]);

  const setProvider = useCallback((p: AIProvider) => {
    setProviderState(p);
    localStorage.setItem("clymaiq_provider", p);
    // Load the key stored for this provider (if any)
    const storedKey = localStorage.getItem(`clymaiq_api_key_${p}`) || "";
    setApiKeyState(storedKey);
  }, []);

  const startAnalysis = useCallback(async (useMock = false) => {
    setIsAnalyzing(true);
    setScreen("analysis");

    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      setAnalysisStep(ANALYSIS_STEPS[stepIndex % ANALYSIS_STEPS.length]);
      stepIndex++;
    }, 550);

    try {
      // 1) Always compute emissions deterministically via Spend-Based EEIO
      const eeio = buildFallbackResponse(bookingLines);
      let response: ClaudeResponse = eeio;

      // 2) Optionally enrich anomalies + data quality via AI provider
      if (!useMock && apiKey) {
        try {
          const ai = await callClaudeAPI(provider, apiKey, bookingLines);
          response = {
            zeilen: eeio.zeilen,
            anomalien: ai.anomalien?.length ? ai.anomalien : eeio.anomalien,
            datenqualitaet: ai.datenqualitaet ?? eeio.datenqualitaet,
          };
        } catch (apiErr) {
          console.warn("AI provider failed — using EEIO-only result:", apiErr);
        }
      } else {
        await new Promise((r) => setTimeout(r, ANALYSIS_STEPS.length * 550));
      }

      setClaudeResponse(response);
      setCalculatedLines(calculateEmissions(bookingLines, response));
      setScreen("dashboard");
    } catch (err) {
      console.error("Analysis failed:", err);
      const response = buildFallbackResponse(bookingLines);
      setClaudeResponse(response);
      setCalculatedLines(calculateEmissions(bookingLines, response));
      setScreen("dashboard");
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
    }
  }, [apiKey, provider, bookingLines]);

  const resetAnalysis = useCallback(() => {
    setScreen("upload");
    setBookingLines([]);
    setClaudeResponse(null);
    setCalculatedLines([]);
  }, []);

  return (
    <AppContext.Provider value={{
      screen, setScreen,
      bookingLines, setBookingLines,
      claudeResponse, calculatedLines,
      apiKey, setApiKey,
      provider, setProvider,
      isAnalyzing, analysisStep,
      startAnalysis, resetAnalysis,
      supplierSession, setSupplierSession,
    }}>
      {children}
    </AppContext.Provider>
  );
}
