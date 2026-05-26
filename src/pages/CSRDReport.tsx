import { useApp } from "@/context/AppContext";
import { formatTonnes, scopeTotal, formatEuro } from "@/lib/co2-utils";
import { FileText, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function CSRDReportPage() {
  const { calculatedLines, claudeResponse, resetAnalysis, bookingLines } = useApp();

  if (!claudeResponse) return null;

  const s1 = scopeTotal(calculatedLines, 1);
  const s2 = scopeTotal(calculatedLines, 2);
  const s3 = scopeTotal(calculatedLines, 3);
  const total = s1 + s2 + s3;
  const quality = claudeResponse.datenqualitaet;

  const scope1Lines = calculatedLines.filter((l) => l.scope === 1);
  const scope2Lines = calculatedLines.filter((l) => l.scope === 2);
  const scope3Lines = calculatedLines.filter((l) => l.scope === 3);

  const perioden = [...new Set(bookingLines.map((b) => b.periode))];
  const berichtszeitraum = perioden.length > 0 ? `${perioden[0]} – ${perioden[perioden.length - 1]}` : "2024";

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "Muster GmbH CSRD Report 2024";
    window.print();
    document.title = originalTitle;
  };

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">CLYMAIQ ESG / <span className="font-semibold text-foreground">CSRD Report</span></p>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
              <FileText className="w-4 h-4" />
              PDF-Vorschau
            </button>
            <button onClick={resetAnalysis} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <RotateCcw className="w-4 h-4" />
              Neue Analyse starten
            </button>
          </div>
        </div>

        {/* Report */}
        <div className="bg-card rounded-xl border border-border max-w-4xl mx-auto print:border-none print:shadow-none">
          {/* Title Block */}
          <div className="bg-sidebar text-sidebar-foreground p-8 rounded-t-xl print:bg-[hsl(155,35%,14%)]">
            <h1 className="text-xl font-bold">CSRD-Nachhaltigkeitsbericht 2024 — Muster GmbH</h1>
            <p className="text-sm text-sidebar-muted mt-1">
              Geschäftsjahr {berichtszeitraum} · ESRS-konform · automatisch aus SAP FI/CO generiert
            </p>
          </div>

          <div className="p-8 space-y-8">
            {/* Executive Summary */}
            <section>
              <h2 className="text-lg font-bold mb-3 text-foreground">CSRD Nachhaltigkeitsbericht — ESRS E1 Klimawandel</h2>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm leading-relaxed text-foreground">
                  Im Berichtszeitraum {berichtszeitraum} wurden insgesamt <strong>{formatTonnes(total)} t CO₂e</strong> emittiert.
                  Davon entfallen {formatTonnes(s1)} t auf Scope 1 (direkte Emissionen),
                  {" "}{formatTonnes(s2)} t auf Scope 2 (Energiebezug) und
                  {" "}{formatTonnes(s3)} t auf Scope 3 (Wertschöpfungskette).
                  Die Datenqualität beträgt <strong>{quality.score} %</strong>.
                </p>
              </div>
            </section>

            {/* Scope 1 */}
            <ScopeSection
              title="Scope 1: Direkte Emissionen"
              description="Emissionen aus eigenen oder kontrollierten Quellen (Fuhrpark, Heizung, Produktion)"
              lines={scope1Lines}
              total={s1}
            />

            {/* Scope 2 */}
            <ScopeSection
              title="Scope 2: Energiebedingte Emissionen"
              description="Emissionen aus eingekaufter Energie (Strom, Fernwärme)"
              lines={scope2Lines}
              total={s2}
            />

            {/* Scope 3 */}
            <ScopeSection
              title="Scope 3: Emissionen der Wertschöpfungskette"
              description="Indirekte Emissionen aus vor- und nachgelagerten Aktivitäten"
              lines={scope3Lines}
              total={s3}
            />

            {/* Methodology */}
            <section>
              <h2 className="text-base font-bold mb-2">Methodik</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Berechnung nach GHG Protocol Corporate Standard. Methode: Spend-Based EEIO
                (Environmentally Extended Input-Output) gemäß GHG Protocol Corporate Value Chain
                (Scope 3) Standard. Alle Emissionen werden aus monetären SAP FI/CO Buchungsdaten
                abgeleitet — ohne manuelle Eingabe. Emissionsfaktoren: UBA 2024, DEFRA 2024,
                GHG Protocol EEIO.
              </p>
            </section>

            {/* Data Gaps */}
            <section>
              <h2 className="text-base font-bold mb-3">Datenlücken & Empfehlungen</h2>
              {quality.fehlende_scopes.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Fehlende Scope-Kategorien:</h3>
                  <ul className="space-y-1">
                    {quality.fehlende_scopes.map((s, i) => (
                      <li key={i} className="text-sm text-destructive flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {quality.empfehlungen.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Empfehlungen:</h3>
                  <ul className="space-y-1">
                    {quality.empfehlungen.map((e, i) => (
                      <li key={i} className="text-sm text-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Footer */}
            <div className="border-t border-border pt-4 flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
              <span>CLYMAIQ ESG Platform</span>
              <span>Powered by Claude AI · GHG Protocol · CSRD / ESRS E1</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ScopeSection({ title, description, lines, total }: {
  title: string; description: string; lines: any[]; total: number;
}) {
  return (
    <section>
      <h2 className="text-base font-bold mb-1">{title}</h2>
      <p className="text-xs text-muted-foreground mb-3">{description}</p>
      {lines.length > 0 ? (
        <>
          <table className="w-full text-sm mb-2">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase border-b border-border">
                <th className="py-2 text-left font-medium">Kostenstelle</th>
                <th className="py-2 text-left font-medium">Buchungstext</th>
                <th className="py-2 text-right font-medium">Betrag €</th>
                <th className="py-2 text-left font-medium">Kategorie</th>
                <th className="py-2 text-center font-medium">Scope</th>
                <th className="py-2 text-right font-medium">t CO₂e</th>
                <th className="py-2 text-right font-medium">Faktor kg/€</th>
                <th className="py-2 text-left font-medium">Quelle</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l: any) => (
                <tr key={l.zeile_id} className="border-b border-border/50">
                  <td className="py-2 text-xs">{l.original.kostenstelle}</td>
                  <td className="py-2 text-xs">{l.original.buchungstext}</td>
                  <td className="py-2 text-xs text-right">{formatEuro(l.original.betrag)}</td>
                  <td className="py-2 text-xs">{l.kategorie}</td>
                  <td className="py-2 text-xs text-center">{l.scope}</td>
                  <td className="py-2 text-xs text-right font-medium">{formatTonnes(l.t_co2)}</td>
                  <td className="py-2 text-xs text-right tabular-nums">{l.emissionsfaktor.toLocaleString("de-DE", { minimumFractionDigits: 5, maximumFractionDigits: 5 })}</td>
                  <td className="py-2 text-xs text-muted-foreground">{l.quelle}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border">
                <td colSpan={5} className="py-2 text-sm font-bold">Summe</td>
                <td className="py-2 text-sm font-bold text-right">{formatTonnes(total)} t</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </>
      ) : (
        <p className="text-sm text-muted-foreground italic">Keine Buchungen in diesem Scope klassifiziert.</p>
      )}
    </section>
  );
}
