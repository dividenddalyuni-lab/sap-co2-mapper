import { useMemo, useRef, useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { formatNumber, formatEuro } from "@/lib/co2-utils";
import { detectAnomalies, statusBadgeClasses } from "@/lib/anomaly-detection";
import { askClaudeAboutData, ChatMessage } from "@/lib/claude-chat";
import { Send, Sparkles, Loader2, AlertTriangle } from "lucide-react";

export default function AnomaliesPage() {
  const { calculatedLines, apiKey, provider } = useApp();

  const anomalies = useMemo(() => detectAnomalies(calculatedLines), [calculatedLines]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isAsking]);

  const hasData = calculatedLines.length > 0;

  const handleSend = async () => {
    const q = input.trim();
    if (!q || !apiKey || !hasData) return;
    setError(null);
    setInput("");
    const next: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setIsAsking(true);
    try {
      const answer = await askClaudeAboutData(provider, apiKey, messages, q, calculatedLines);
      setMessages([...next, { role: "assistant", content: answer }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      setError(msg);
    } finally {
      setIsAsking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const exampleQuestions = [
    "Welche Kostenstelle hat die höchsten CO₂-Emissionen?",
    "Wie hoch ist unser Scope 3 Anteil?",
    "Welche Buchungen sind besonders auffällig?",
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          CLYMAIQ ESG / <span className="font-semibold text-foreground">Anomalie-Erkennung</span>
        </p>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium">
            {hasData ? `${calculatedLines.length} Buchungen` : "Keine Daten"}
          </span>
          <span className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium">
            {anomalies.length} Anomalien
          </span>
        </div>
      </div>

      {/* Empty state */}
      {!hasData && (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-semibold mb-1">Bitte SAP Export hochladen</h3>
          <p className="text-xs text-muted-foreground">
            Nach dem Upload werden Anomalien automatisch erkannt und der KI-Assistent ist verfügbar.
          </p>
        </div>
      )}

      {hasData && (
        <>
          {/* Anomaly Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold">Buchungsanalyse — Anomalie-Übersicht</h3>
              <p className="text-xs text-muted-foreground">
                {calculatedLines.length} Buchungen geprüft · regelbasierte Mustererkennung
              </p>
            </div>

            {anomalies.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Keine Anomalien erkannt
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border">
                      <th className="px-5 py-3 text-left font-semibold">Beleg-Nr</th>
                      <th className="px-5 py-3 text-left font-semibold">Buchungstext</th>
                      <th className="px-5 py-3 text-right font-semibold">Betrag</th>
                      <th className="px-5 py-3 text-left font-semibold">Anomalie-Typ</th>
                      <th className="px-5 py-3 text-right font-semibold">CO₂-Auswirkung</th>
                      <th className="px-5 py-3 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalies.map((a, idx) => (
                      <tr key={`${a.belegNr}-${a.typ}-${idx}`} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-4">
                          <p className="text-xs font-mono text-muted-foreground">{a.belegNr}</p>
                          <p className="text-xs text-muted-foreground">{a.periode}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-foreground">{a.buchungstext}</p>
                          <p className="text-xs text-primary">
                            {a.kategorie} · KST {a.kostenstelle}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <p className="font-semibold">{formatEuro(a.betrag)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border border-border bg-muted">
                            {a.typ}
                          </span>
                          {a.detail && (
                            <p className="text-[10px] text-muted-foreground mt-1">{a.detail}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-primary font-medium text-xs">
                            {formatNumber(a.co2Impact, 2)} t CO₂e
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusBadgeClasses(a.status)}`}
                          >
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* KI Chat */}
          <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">KI-Assistent</h3>
                <p className="text-xs text-muted-foreground">
                  Stelle Fragen zu deinen Buchungsdaten in natürlicher Sprache
                </p>
              </div>
            </div>

            {!apiKey ? (
              <div className="p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Bitte Claude API Key in Einstellungen hinterlegen
                </p>
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="px-5 py-4 space-y-4 max-h-[420px] overflow-y-auto min-h-[180px]">
                  {messages.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground mb-2">Beispielfragen:</p>
                      <div className="flex flex-wrap gap-2">
                        {exampleQuestions.map((q) => (
                          <button
                            key={q}
                            onClick={() => setInput(q)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-muted/70 transition-colors text-left"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}

                  {isAsking && (
                    <div className="flex justify-start">
                      <div className="bg-muted px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="text-muted-foreground">Analysiere Daten...</span>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                      {error}
                    </div>
                  )}
                </div>

                <div className="border-t border-border p-3 flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isAsking}
                    placeholder="Frage zu deinen Buchungsdaten stellen..."
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isAsking}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Senden
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
