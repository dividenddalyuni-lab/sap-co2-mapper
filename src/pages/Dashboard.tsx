import { useApp } from "@/context/AppContext";
import { formatTonnes, formatNumber, scopeTotal } from "@/lib/co2-utils";
import { AlertTriangle, ArrowDown, Upload as UploadIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import type { CalculatedLine } from "@/lib/types";
import { computeSavings } from "@/lib/savings";
import { detectAnomalies, statusBadgeClasses } from "@/lib/anomaly-detection";

const SCOPE_COLORS = ["hsl(152, 60%, 36%)", "hsl(38, 92%, 50%)", "hsl(220, 60%, 55%)"];

const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const MONTH_LOOKUP: Record<string, number> = {
  jan: 0, januar: 0, feb: 1, februar: 1, mär: 2, maerz: 2, mar: 2, märz: 2,
  apr: 3, april: 3, mai: 4, may: 4, jun: 5, juni: 5, jul: 6, juli: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  okt: 9, oct: 9, oktober: 9, nov: 10, november: 10, dez: 11, dec: 11, dezember: 11,
};

function buildMonthlyData(lines: CalculatedLine[]): { name: string; value: number }[] {
  // Step 1: classify each line into direct month or quarter bucket
  const directByMonth = new Array(12).fill(0);
  const quarterTotals = [0, 0, 0, 0]; // Q1..Q4 totals (full quarter sum, NOT yet divided)
  const directSeen = new Array(12).fill(false);
  const quarterSeen = [false, false, false, false];

  for (const l of lines) {
    const periode = (l.original.periode || "").trim().toLowerCase();
    if (!periode) continue;

    // Quarter pattern wins if present
    const qMatch = periode.match(/q\s*([1-4])/);
    if (qMatch) {
      const qIdx = parseInt(qMatch[1], 10) - 1;
      quarterTotals[qIdx] += l.t_co2;
      quarterSeen[qIdx] = true;
      continue;
    }

    // Direct month token (Jan, Feb, …)
    let monthIdx = -1;
    for (const key of Object.keys(MONTH_LOOKUP)) {
      if (periode.includes(key)) {
        monthIdx = MONTH_LOOKUP[key];
        break;
      }
    }
    // Numeric pattern like 2024-03 or 03/2024
    if (monthIdx < 0) {
      const numMatch = periode.match(/(?:^|\D)(0?[1-9]|1[0-2])(?:\D|$)/);
      if (numMatch) monthIdx = parseInt(numMatch[1], 10) - 1;
    }
    if (monthIdx >= 0 && monthIdx < 12) {
      directByMonth[monthIdx] += l.t_co2;
      directSeen[monthIdx] = true;
    }
  }

  // Step 2: combine — for each month, add direct + (its quarter total ÷ 3)
  const combined = new Array(12).fill(0);
  const seen = new Array(12).fill(false);
  for (let m = 0; m < 12; m++) {
    const qIdx = Math.floor(m / 3);
    combined[m] = directByMonth[m] + quarterTotals[qIdx] / 3;
    seen[m] = directSeen[m] || quarterSeen[qIdx];
  }

  // Diagnostic: log per-month breakdown so distribution is verifiable
  console.log("[Dashboard] Monthly breakdown:", MONTH_NAMES.map((n, i) => ({
    month: n,
    direct: Math.round(directByMonth[i] * 100) / 100,
    fromQuarter: Math.round((quarterTotals[Math.floor(i / 3)] / 3) * 100) / 100,
    total: Math.round(combined[i] * 100) / 100,
    shown: seen[i],
  })));
  console.log("[Dashboard] Quarter totals (t CO₂e):", quarterTotals.map((v) => Math.round(v * 100) / 100));

  // Step 3: only emit months that received bookings (direct OR via their quarter)
  return MONTH_NAMES
    .map((name, i) => ({ name, value: Math.round(combined[i] * 100) / 100, _seen: seen[i] }))
    .filter((m) => m._seen)
    .map(({ name, value }) => ({ name, value }));
}

const ANOMALY_LABELS: Record<string, string> = {
  hoher_betrag: "Hoher Betrag",
  duplikat: "Duplikat",
  ausreisser: "Ausreißer",
  ausreißer: "Ausreißer",
  fehlend: "Fehlende Daten",
  fehlende_daten: "Fehlende Daten",
  unbekannt: "Unbekannt",
};

function humanizeAnomalyType(typ: string): string {
  if (!typ) return "Anomalie";
  const key = typ.toLowerCase().trim();
  if (ANOMALY_LABELS[key]) return ANOMALY_LABELS[key];
  // Generic underscore_case → Title Case German
  return key
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function detectDrop(data: { name: string; value: number }[]): string | null {
  if (data.length < 3) return null;
  const avg = data.reduce((s, d) => s + d.value, 0) / data.length;
  for (let i = 1; i < data.length; i++) {
    if (data[i].value < avg * 0.6 && data[i - 1].value > avg * 0.8) {
      return `${data[i].name}-Rückgang erkannt`;
    }
  }
  return null;
}

export default function DashboardPage() {
  const { calculatedLines, claudeResponse, bookingLines, setScreen } = useApp();

  if (!claudeResponse || calculatedLines.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center text-center min-h-[60vh]">
          <UploadIcon className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Bitte SAP Export hochladen</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            Bitte SAP Export hochladen um Dashboard zu befüllen. Alle Kennzahlen werden automatisch aus den Buchungsdaten berechnet.
          </p>
          <button onClick={() => setScreen("upload")} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
            Zum Upload
          </button>
        </div>
      </div>
    );
  }

  const s1 = scopeTotal(calculatedLines, 1);
  const s2 = scopeTotal(calculatedLines, 2);
  const s3 = scopeTotal(calculatedLines, 3);
  const total = s1 + s2 + s3;
  const quality = claudeResponse.datenqualitaet;
  const totalBetrag = bookingLines.reduce((sum, l) => sum + l.betrag, 0);

  const allSavings = computeSavings(calculatedLines);
  const topSavings = allSavings.slice(0, 3);
  const totalSavingsCo2 = allSavings.reduce((a, m) => a + m.co2Saving, 0);
  const totalSavingsEur = allSavings.reduce((a, m) => a + m.eurSaving, 0);

  const pieData = [
    { name: "Scope 1", value: s1 },
    { name: "Scope 2", value: s2 },
    { name: "Scope 3", value: s3 },
  ];

  const sumByCategory = (cats: string[]) =>
    calculatedLines
      .filter((l) => cats.includes(l.kategorie))
      .reduce((s, l) => s + l.original.betrag, 0);

  const stromCost = sumByCategory(["Strom", "Fernwärme"]);
  const erdgasCost = sumByCategory(["Erdgas"]);
  const kraftstoffCost = sumByCategory(["Kraftstoff"]);
  const energyTotal = stromCost + erdgasCost + kraftstoffCost;

  const energyCosts = [
    { label: "Strom / Fernwärme", value: stromCost, color: "hsl(152, 60%, 36%)" },
    { label: "Erdgas / Wärme", value: erdgasCost, color: "hsl(152, 60%, 36%)" },
    { label: "Kraftstoffe", value: kraftstoffCost, color: "hsl(38, 92%, 50%)" },
  ];

  const monthlyData = buildMonthlyData(calculatedLines);
  const dropHint = detectDrop(monthlyData);

  const realAnomalies = (claudeResponse.anomalien || []).slice(0, 3).map((a) => {
    const line = bookingLines.find((b) => b.id === a.zeile_id);
    return {
      title: line?.buchungstext || humanizeAnomalyType(a.typ),
      detail: line ? `${line.periode} · ${line.kostenstelle}` : a.nachricht,
      badge: humanizeAnomalyType(a.typ),
      badgeColor: "text-destructive",
    };
  });

  // Dynamic Y-axis: 120% of max monthly value
  const monthlyMax = monthlyData.reduce((m, d) => Math.max(m, d.value), 0);
  const yAxisMax = monthlyMax > 0 ? Math.ceil(monthlyMax * 1.2) : undefined;

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">CLYMAIQ ESG / <span className="font-semibold text-foreground">Dashboard</span></p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium">Muster GmbH</span>
            <span className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium">Geschäftsjahr 2024</span>
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">FK</div>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-3">CO₂ Scope 3 — Lieferkette</p>
            <p className="text-3xl font-extrabold text-foreground">{formatTonnes(s3)} t</p>
            <p className="text-xs text-muted-foreground mt-2">Geschäftsjahr 2024</p>
            <div className="w-full h-1.5 bg-muted rounded-full mt-3"><div className="h-full bg-primary rounded-full" style={{ width: "65%" }} /></div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-3">CO₂-Sparpotenzial</p>
            <p className="text-3xl font-extrabold text-foreground">{formatNumber(totalSavingsCo2, 0)} t</p>
            <p className="text-xs text-primary flex items-center gap-1 mt-2"><ArrowDown className="w-3 h-3" /> € {formatNumber(totalSavingsEur, 0)}/Jahr KI-Empfehlungen</p>
            <div className="w-full h-1.5 bg-muted rounded-full mt-3"><div className="h-full bg-primary rounded-full" style={{ width: "45%" }} /></div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-3">CO₂-Emissionen Scope 1+2</p>
            <p className="text-3xl font-extrabold text-foreground">{formatTonnes(s1 + s2)} t</p>
            <p className="text-xs text-muted-foreground mt-2">Geschäftsjahr 2024</p>
            <div className="w-full h-1.5 bg-muted rounded-full mt-3"><div className="h-full bg-primary rounded-full" style={{ width: "72%" }} /></div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-3">CSRD-Bereitschaft</p>
            <p className="text-3xl font-extrabold text-foreground">{quality.score} %</p>
            <p className="text-xs text-warning flex items-center gap-1 mt-2"><AlertTriangle className="w-3 h-3" /> {quality.fehlende_scopes.length} Datenlücken</p>
            <div className="w-full h-1.5 bg-muted rounded-full mt-3"><div className="h-full bg-primary rounded-full" style={{ width: `${quality.score}%` }} /></div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-5 gap-4">
          {/* Monthly trend */}
          <div className="col-span-3 bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-1">CO₂-Emissionen 2024 — Monatsverlauf</h3>
            <p className="text-xs text-muted-foreground mb-4">in t CO₂e — automatisch aus SAP FICO berechnet</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, yAxisMax ?? "auto"]} />
                <Tooltip
                  formatter={(v: number) => [formatNumber(v, 2) + " t", "CO₂e"]}
                  cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                />
                <Bar dataKey="value" fill="hsl(152, 60%, 36%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {dropHint && (
              <div className="mt-3 px-3 py-2 bg-warning/5 border-l-2 border-warning rounded text-xs text-muted-foreground">
                {dropHint} — <button onClick={() => setScreen("ai-assistant")} className="text-primary font-medium hover:underline">KI-Analyse öffnen →</button>
              </div>
            )}
          </div>

          {/* Scope Pie */}
          <div className="col-span-2 bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-1">CO₂-Emissionen nach Scope</h3>
            <p className="text-xs text-muted-foreground mb-4">Geschäftsjahr 2024 · t CO₂e</p>
            <div className="flex items-center gap-6">
              <div className="w-36 h-36 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={60} strokeWidth={2}>
                      {pieData.map((_, i) => <Cell key={i} fill={SCOPE_COLORS[i]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-bold">{formatTonnes(total)}</span>
                  <span className="text-[9px] text-muted-foreground">t CO₂e gesamt</span>
                </div>
              </div>
              <div className="space-y-4 text-sm">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-3 h-3 rounded-sm" style={{ background: SCOPE_COLORS[0] }} />
                    <span className="font-semibold">Scope 1 — Direkte Emissionen</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-5">{formatTonnes(s1)} t · {total > 0 ? formatNumber(s1 / total * 100, 1) : 0} %</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-3 h-3 rounded-sm" style={{ background: SCOPE_COLORS[1] }} />
                    <span className="font-semibold">Scope 2 — Energiebezug</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-5">{formatTonnes(s2)} t · {total > 0 ? formatNumber(s2 / total * 100, 1) : 0} %</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-3 h-3 rounded-sm" style={{ background: SCOPE_COLORS[2] }} />
                    <span className="font-semibold">Scope 3 — Lieferkette</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-5">{formatTonnes(s3)} t · {total > 0 ? formatNumber(s3 / total * 100, 1) : 0} %</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: Energy Costs, KI-Sparpotenzial, Anomalies */}
        <div className="grid grid-cols-3 gap-4">
          {/* Energiekosten */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-4">Energiekosten 2024</h3>
            <p className="text-3xl font-extrabold text-foreground mb-1">€ {formatNumber(energyTotal, 0)}</p>
            <p className="text-xs text-muted-foreground mb-5">entspricht ca. {formatTonnes(total)} t CO₂e</p>
            {energyCosts.map((item, i) => (
              <div key={i} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground">{item.label}</span>
                  <span className="font-medium text-foreground">€ {formatNumber(item.value, 0)}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${energyTotal > 0 ? (item.value / energyTotal) * 100 : 0}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* KI-Sparpotenzial */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">KI-Sparpotenzial</h3>
                <p className="text-xs text-muted-foreground">Automatisch erkannte Maßnahmen · GJ 2024</p>
              </div>
              <span className="px-2.5 py-1 border border-border rounded-lg text-xs font-medium">{allSavings.length} Empfehlungen</span>
            </div>
            <div className="space-y-3">
              {topSavings.length === 0 && (
                <p className="text-xs text-muted-foreground">Keine Sparpotenziale erkannt.</p>
              )}
              {topSavings.map((m) => (
                <div key={m.id} className="flex items-start justify-between pb-3 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2"><span>{m.icon}</span> {m.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.description.split(".")[0]} · <span className="font-semibold text-foreground">€ {formatNumber(m.eurSaving, 0)}/Jahr</span></p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-lg">− {formatNumber(m.co2Saving, 1)} t CO₂</span>
                </div>
              ))}
            </div>
            <div className="mt-4 px-4 py-3 bg-primary/5 rounded-lg flex items-center justify-between">
              <span className="text-sm font-semibold text-primary">Gesamt Potenzial</span>
              <span className="text-sm font-semibold text-foreground">− {formatNumber(totalSavingsCo2, 1)} t CO₂ · € {formatNumber(totalSavingsEur, 0)}/Jahr</span>
            </div>
            <button onClick={() => setScreen("savings")} className="mt-3 w-full text-center text-xs text-primary font-medium hover:underline">
              Alle Empfehlungen →
            </button>
          </div>

          {/* Offene Anomalien */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-4">Offene Anomalien</h3>
            <div className="space-y-3">
              {realAnomalies.length === 0 && (
                <p className="text-xs text-muted-foreground">Keine Anomalien erkannt.</p>
              )}
              {realAnomalies.map((a, i) => (
                <div key={i} className="flex items-start justify-between pb-3 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold ${a.badgeColor}`}>{a.badge}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setScreen("anomalies")} className="mt-4 w-full text-center text-xs text-primary font-medium hover:underline">
              Alle Anomalien anzeigen →
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-4 py-4">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Powered by Claude AI</span>
          <span className="text-muted-foreground/30">•</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">GHG Protocol</span>
        </div>
      </div>
    </>
  );
}
