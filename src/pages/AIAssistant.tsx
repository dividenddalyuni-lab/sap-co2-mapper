import { useState, useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Send, Loader2 } from "lucide-react";
import { callAIChat } from "@/lib/ai-provider";

type Message = { role: "user" | "assistant"; content: string };

const quickActions = [
  "Warum ist mein EBITDA gesunken?",
  "Scope-3-Emissionen?",
  "CO₂-Neutralität — Prognose",
  "Kosten ohne CLYMAIQ?",
];

const SYSTEM_PROMPT = `Du bist der CLYMAIQ KI-Assistent, ein Experte für ESG-Analyse, CO₂-Bilanzierung nach GHG Protocol und CSRD/ESRS Compliance.
Du analysierst SAP FICO-Buchungsdaten eines deutschen Unternehmens (Muster GmbH, Geschäftsjahr 2024).
Antworte immer auf Deutsch, präzise und fachlich fundiert. Verwende Zahlen und konkrete Empfehlungen wo möglich.`;

export default function AIAssistantPage() {
  const { bookingLines, apiKey, calculatedLines, claudeResponse } = useApp();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildContext = () => {
    const parts: string[] = [];
    if (bookingLines.length > 0) {
      parts.push(`Geladene Buchungszeilen (${bookingLines.length}): ${JSON.stringify(bookingLines.slice(0, 20))}`);
    }
    if (calculatedLines.length > 0) {
      const totalCO2 = calculatedLines.reduce((s, l) => s + l.kg_co2, 0);
      parts.push(`Berechnete Emissionen: ${calculatedLines.length} Zeilen, Gesamt ${(totalCO2 / 1000).toFixed(1)} t CO₂e`);
    }
    if (claudeResponse?.anomalien) {
      parts.push(`Anomalien: ${JSON.stringify(claudeResponse.anomalien)}`);
    }
    if (claudeResponse?.datenqualitaet) {
      parts.push(`Datenqualität: ${JSON.stringify(claudeResponse.datenqualitaet)}`);
    }
    return parts.join("\n\n");
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !apiKey) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const contextInfo = buildContext();
      const allMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Prepend context to first user message
      if (contextInfo && allMessages.length === 1) {
        allMessages[0].content = `[Kontext der aktuellen Analyse]\n${contextInfo}\n\n[Frage des Nutzers]\n${allMessages[0].content}`;
      }

      const response = await fetch(CLAUDE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          messages: allMessages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Fehler (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const assistantText = data.content?.[0]?.text ?? "Keine Antwort erhalten.";
      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ Fehler: ${err.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="p-6 flex flex-col h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-muted-foreground">CLYMAIQ ESG / <span className="font-semibold text-foreground">KI-Assistent</span></p>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium">Muster GmbH</span>
          <span className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium">Geschäftsjahr 2024</span>
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">FK</div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-6 min-h-0">
        {/* Assistant Header */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">GS</div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">CLYMAIQ KI-Assistent</p>
                <p className="text-xs text-primary flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                  Verbunden · SAP FICO-Daten geladen
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Muster GmbH · GJ 2024 · {bookingLines.length > 0 ? `${bookingLines.length} Buchungen` : "47.384 Buchungen"}</p>
            </div>
          </div>
        </div>

        {/* Initial Message */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">GS</div>
          <div className="flex-1 bg-card border border-border rounded-xl p-5 text-sm text-foreground/90 space-y-3">
            <p>
              Guten Tag. Die SAP FICO-Daten der Muster GmbH wurden vollständig eingelesen — <strong>{bookingLines.length > 0 ? `${bookingLines.length} Buchungen` : "47.384 Buchungen"}</strong>, Zeitraum Januar bis September 2024.
            </p>
            <p>
              Die automatische Analyse hat <strong>3 Buchungsanomalien</strong> sowie <strong>262 t unerwartete CO₂-Emissionen</strong> identifiziert, die den CSRD-Report beeinflussen.
            </p>
            <p>
              Welche Kennzahl oder Buchungsposition möchten Sie analysieren?
            </p>
          </div>
        </div>

        {/* Chat Messages */}
        {messages.map((msg, i) => (
          <div key={i} className="flex items-start gap-4">
            {msg.role === "assistant" ? (
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">GS</div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-muted text-foreground flex items-center justify-center text-sm font-bold shrink-0">FK</div>
            )}
            <div className={`flex-1 rounded-xl p-5 text-sm whitespace-pre-wrap ${
              msg.role === "assistant"
                ? "bg-card border border-border text-foreground/90"
                : "bg-primary/10 border border-primary/20 text-foreground"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">GS</div>
            <div className="flex-1 bg-card border border-border rounded-xl p-5 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analysiere...
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* No API Key Warning */}
      {!apiKey && (
        <div className="px-4 py-2 mb-3 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive">
          Bitte hinterlegen Sie Ihren Claude API Key in den Einstellungen (Zahnrad-Icon auf der Datenimport-Seite), um den KI-Assistenten zu nutzen.
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mt-6 mb-3">
        {quickActions.map((action) => (
          <button
            key={action}
            onClick={() => sendMessage(action)}
            disabled={isLoading || !apiKey}
            className="px-4 py-2 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {action}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Frage zu Buchungen, Emissionen oder CSRD eingeben ..."
          disabled={isLoading || !apiKey}
          className="flex-1 px-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !apiKey || !input.trim()}
          className="px-5 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          Absenden
        </button>
      </form>
    </div>
  );
}
