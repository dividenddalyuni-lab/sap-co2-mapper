import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { computeSavings, SavingMeasure, Priority } from "@/lib/savings";
import { formatNumber } from "@/lib/co2-utils";
import { Sparkles, Upload as UploadIcon, Loader2, TrendingDown, Euro, ListChecks } from "lucide-react";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

function priorityClasses(p: Priority): string {
  switch (p) {
    case "Hoch":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "Mittel":
      return "border-warning/30 bg-warning/10 text-warning";
    case "Niedrig":
      return "border-border bg-muted text-muted-foreground";
  }
}

export default function SavingsPage() {
  const { calculatedLines, bookingLines, apiKey, setScreen } = useApp();
  const measures = useMemo(() => computeSavings(calculatedLines), [calculatedLines]);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  if (calculatedLines.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center text-center min-h-[60vh]">
          <UploadIcon className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Bitte zuerst SAP Export hochladen</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            Sobald Buchungsdaten vorliegen, generiert die KI automatisch konkrete CO₂-Reduktionsmaßnahmen.
          </p>
          <button onClick={() => setScreen("upload")} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
            Zum Upload
          </button>
        </div>
      </div>
    );
  }

  const totalCo2 = measures.reduce((s, m) => s + m.co2Saving, 0);
  const totalEur = measures.reduce((s, m) => s + m.eurSaving, 0);
  const maxCo2 = Math.max(1, ...measures.map((m) => m.co2Saving));

  const explainMeasure = async (m: SavingMeasure) => {
    if (!apiKey) {
      setDetails((d) => ({ ...d, [m.id]: "Bitte Claude API Key in Einstellungen hinterlegen." }));
      return;
    }
    setLoadingId(m.id);
    try {
      const prompt = `Erkläre die folgende CO₂-Reduktionsmaßnahme für ein deutsches Mittelstandsunternehmen. Gib konkrete Umsetzungsschritte, Risiken und ROI-Einschätzung. Maximal 6 Sätze.\n\nMaßnahme: ${m.title}\nBeschreibung: ${m.description}\nCO₂-Einsparung: ${m.co2Saving.toFixed(2)} t/Jahr\nKosten-Einsparung: ${m.eurSaving.toFixed(0)} €/Jahr\nPriorität: ${m.priority}\nRegel: ${m.rule}`;
      const resp = await fetch(CLAUDE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 600,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!resp.ok) throw new Error(`API ${resp.status}`);
      const data = await resp.json();
      const text = data.content?.[0]?.text ?? "Keine Antwort.";
      setDetails((d) => ({ ...d, [m.id]: text }));
    } catch (e) {
      setDetails((d) => ({ ...d, [m.id]: `Fehler: ${(e as Error).message}` }));
    } finally {
      setLoadingId(null);
    }
  };

  const runFullAiAnalysis = async () => {
    if (!apiKey) return;
    setAiLoading(true);
    setAiResults(null);
    try {
      const compact = calculatedLines.slice(0, 200).map((l) => ({
        kst: l.original.kostenstelle,
        konto: l.original.konto,
        text: l.original.buchungstext,
        betrag: Number(l.original.betrag.toFixed(2)),
        scope: l.scope,
        kategorie: l.kategorie,
        t_co2: Number(l.t_co2.toFixed(3)),
      }));
      const prompt = `Analysiere diese SAP FI/CO Buchungsdaten und erstelle konkrete CO₂-Reduktionsempfehlungen für ein deutsches Mittelstandsunternehmen. Fokus auf die größten Hebel. Gib für jede Maßnahme: Titel, Beschreibung, geschätzte CO₂-Einsparung in Tonnen, geschätzte Kosteneinsparung in EUR/Jahr, Umsetzungsaufwand (niedrig/mittel/hoch). Antworte als JSON Array.\n\nDaten: ${JSON.stringify(compact)}`;
      const resp = await fetch(CLAUDE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!resp.ok) throw new Error(`API ${resp.status}`);
      const data = await resp.json();
      setAiResults(data.content?.[0]?.text ?? "Keine Antwort.");
    } catch (e) {
      setAiResults(`Fehler: ${(e as Error).message}`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">CLYMAIQ ESG / <span className="font-semibold text-foreground">KI-Sparpotenzial</span></p>
          <h1 className="text-2xl font-bold mt-1 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            KI-Sparpotenzial — Automatisch erkannte Maßnahmen
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Basierend auf {bookingLines.length} Buchungen aus dem SAP Export.</p>
        </div>
        {apiKey && (
          <button
            onClick={runFullAiAnalysis}
            disabled={aiLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            KI-Analyse starten
          </button>
        )}
      </div>

      {/* Top metric cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-3">
            <TrendingDown className="w-3.5 h-3.5" /> Gesamt CO₂-Einsparung
          </div>
          <p className="text-3xl font-extrabold">{formatNumber(totalCo2, 1)} t</p>
          <p className="text-xs text-muted-foreground mt-2">CO₂e pro Jahr</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-3">
            <Euro className="w-3.5 h-3.5" /> Gesamt EUR-Einsparung
          </div>
          <p className="text-3xl font-extrabold">€ {formatNumber(totalEur, 0)}</p>
          <p className="text-xs text-muted-foreground mt-2">pro Jahr</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-3">
            <ListChecks className="w-3.5 h-3.5" /> Anzahl Maßnahmen
          </div>
          <p className="text-3xl font-extrabold">{measures.length}</p>
          <p className="text-xs text-muted-foreground mt-2">automatisch erkannt</p>
        </div>
      </div>

      {/* AI full analysis result */}
      {aiResults && (
        <div className="bg-card rounded-xl border border-primary/30 p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> KI-Gesamtanalyse
          </h3>
          <pre className="text-xs whitespace-pre-wrap font-mono text-foreground/90 max-h-96 overflow-auto">{aiResults}</pre>
        </div>
      )}

      {/* Measures list */}
      {measures.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          Keine Sparpotenziale erkannt. Die Buchungen erfüllen aktuell keine der definierten Schwellenwerte.
        </div>
      ) : (
        <div className="space-y-4">
          {measures.map((m) => (
            <div key={m.id} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="text-2xl">{m.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold">{m.title}</h3>
                      <span className={`px-2 py-0.5 border rounded-md text-[10px] font-semibold uppercase tracking-wider ${priorityClasses(m.priority)}`}>
                        Priorität: {m.priority}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1 italic">Regel: {m.rule}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">EUR-Einsparung/Jahr</p>
                  <p className="text-lg font-bold">€ {formatNumber(m.eurSaving, 0)}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">CO₂-Einsparung</span>
                  <span className="font-semibold">{formatNumber(m.co2Saving, 2)} t CO₂e/Jahr</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(m.co2Saving / maxCo2) * 100}%` }} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => explainMeasure(m)}
                  disabled={loadingId === m.id}
                  className="text-xs text-primary font-medium hover:underline flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loadingId === m.id && <Loader2 className="w-3 h-3 animate-spin" />}
                  Details anzeigen
                </button>
                <span className="text-[11px] text-muted-foreground">{m.affectedCount} betroffene Buchungen</span>
              </div>

              {details[m.id] && (
                <div className="mt-3 px-4 py-3 bg-muted/40 border-l-2 border-primary rounded text-xs text-foreground/90 whitespace-pre-wrap">
                  {details[m.id]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
