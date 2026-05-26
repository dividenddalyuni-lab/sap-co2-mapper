import { CalculatedLine } from "./types";
import { callAIChat, AIProvider } from "./ai-provider";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildContextJson(lines: CalculatedLine[]): string {
  const compact = lines.map((l) => ({
    id: l.original.id,
    kst: l.original.kostenstelle,
    konto: l.original.konto,
    text: l.original.buchungstext,
    betrag: Number(l.original.betrag.toFixed(2)),
    periode: l.original.periode,
    kategorie: l.kategorie,
    scope: l.scope,
    t_co2: Number(l.t_co2.toFixed(4)),
  }));
  return JSON.stringify(compact);
}

export async function askClaudeAboutData(
  provider: AIProvider,
  apiKey: string,
  history: ChatMessage[],
  question: string,
  lines: CalculatedLine[]
): Promise<string> {
  const dataJson = buildContextJson(lines);
  const systemPrompt = `Du bist ein CO₂-Bilanzierungsexperte und SAP FICO Berater. Du analysierst SAP FI/CO Kostenstellen-Buchungsdaten für CSRD-Compliance. Dir stehen folgende Buchungsdaten zur Verfügung: ${dataJson}. Beantworte Fragen präzise auf Deutsch. Gib konkrete Zahlen aus den Daten an. Verwende deutsche Zahlenformate (1.234,56). Halte dich kurz und präzise.`;

  const recent = history.slice(-5);
  return callAIChat({
    provider,
    apiKey,
    system: systemPrompt,
    messages: [...recent, { role: "user", content: question }],
    maxTokens: 1024,
  });
}
