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
  const berichtszeitraum =
    perioden.length > 0 ? `${perioden[0]} – ${perioden[perioden.length - 1]}` : "Januar 2024 – Q2 2024";

  const generationDate = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = "Muster GmbH CSRD Report 2024";
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => {
        document.title = prevTitle;
      }, 1000);
    }, 100);
  };

  useEffect(() => {
    const originalTitle = document.title;
    document.title = "CSRD Report — Muster GmbH";
    return () => {
      document.title = originalTitle;
    };
  }, []);

  return (
    <>
      {/* Print-only styles for auditor-grade PDF */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 18mm 16mm 22mm 16mm;
            @bottom-left {
              content: "Muster GmbH · CSRD-Bericht 2024 · ESRS E1 Klimawandel";
              font-family: Arial, system-ui, sans-serif;
              font-size: 8pt;
              color: #555;
            }
            @bottom-center {
              content: "CLYMAIQ";
              font-family: Arial, system-ui, sans-serif;
              font-size: 8pt;
              font-weight: 700;
              letter-spacing: 0.15em;
              color: #1a3a2a;
            }
            @bottom-right {
              content: "Seite " counter(page) " von " counter(pages);
              font-family: Arial, system-ui, sans-serif;
              font-size: 8pt;
              color: #555;
            }
          }

          html, body {
            background: #fff !important;
            color: #111 !important;
            font-family: Arial, system-ui, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide app chrome */
          aside, nav, header, .no-print { display: none !important; }
          main { overflow: visible !important; }

          /* Reset card wrapper */
          .report-shell {
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 0 !important;
          }
          .report-shell > .report-title-block { display: none !important; }
          .report-shell > .report-body { padding: 0 !important; }
          .screen-header { display: none !important; }

          /* Cover page */
          .print-cover { display: block !important; page-break-after: always; }

          .print-cover-header {
            background: #1a3a2a !important;
            color: #fff !important;
            height: 80px;
            display: flex;
            align-items: center;
            padding: 0 14mm;
            margin: -18mm -16mm 14mm -16mm;
          }
          .print-cover-header .logo {
            font-weight: 800;
            font-size: 16pt;
            letter-spacing: 0.18em;
            color: #fff;
          }
          .print-cover-header .tag {
            font-size: 8pt;
            letter-spacing: 0.3em;
            text-transform: uppercase;
            color: #b9d4c4;
            margin-left: 10px;
            border-left: 1px solid #2d6a4f;
            padding-left: 10px;
          }
          .print-cover h1.company {
            font-size: 32pt;
            font-weight: 800;
            color: #111;
            margin: 30mm 0 6pt 0;
            line-height: 1.1;
          }
          .print-cover h2.sub {
            font-size: 20pt;
            color: #555;
            font-weight: 400;
            margin: 0 0 18pt 0;
          }
          .print-cover .smallcaps {
            font-size: 9pt;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #1a3a2a;
            font-weight: 600;
            margin-bottom: 24pt;
          }
          .print-cover .meta {
            font-size: 10pt;
            color: #333;
            margin-bottom: 4pt;
          }
          .print-cover .scope-summary {
            margin-top: 28mm;
            display: flex;
            gap: 10mm;
            border-top: 2px solid #1a3a2a;
            border-bottom: 1px solid #e0e0e0;
            padding: 14pt 0;
          }
          .print-cover .scope-card {
            flex: 1;
            border-left: 4px solid #ccc;
            padding-left: 10pt;
          }
          .print-cover .scope-card.s1 { border-left-color: #2d6a4f; }
          .print-cover .scope-card.s2 { border-left-color: #f4a261; }
          .print-cover .scope-card.s3 { border-left-color: #e76f51; }
          .print-cover .scope-card .label {
            font-size: 8pt;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #555;
          }
          .print-cover .scope-card .value {
            font-size: 18pt;
            font-weight: 700;
            color: #111;
            margin-top: 4pt;
          }
          .print-cover .scope-card .unit {
            font-size: 9pt;
            color: #777;
            margin-left: 4pt;
            font-weight: 400;
          }

          /* Section spacing */
          .print-section { page-break-inside: avoid; margin-top: 18pt; }
          .print-section + .print-section { margin-top: 22pt; }

          /* Scope headers */
          .scope-header {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            border-left: 4px solid #999;
            padding: 4pt 10pt;
            background: #f8faf9;
            margin-bottom: 8pt;
          }
          .scope-header.s1 { border-left-color: #2d6a4f; }
          .scope-header.s2 { border-left-color: #f4a261; }
          .scope-header.s3 { border-left-color: #e76f51; }
          .scope-header .title { font-size: 13pt; font-weight: 700; color: #111; }
          .scope-header .desc { font-size: 9pt; color: #555; font-weight: 400; margin-top: 2pt; }
          .scope-header .badge {
            font-size: 10pt;
            font-weight: 700;
            color: #1a3a2a;
            background: #fff;
            border: 1px solid #1a3a2a;
            padding: 3pt 8pt;
            border-radius: 3pt;
            white-space: nowrap;
          }

          /* Tables */
          table.report-table {
            width: 100%;
            border-collapse: collapse;
            font-family: Arial, system-ui, sans-serif;
            font-size: 9pt;
            margin: 0;
          }
          table.report-table thead { display: table-header-group; }
          table.report-table thead tr {
            background: #1a3a2a !important;
            color: #fff !important;
          }
          table.report-table thead th {
            background: #1a3a2a !important;
            color: #fff !important;
            font-size: 8pt;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 6pt 6pt;
            font-weight: 600;
            border: none;
          }
          table.report-table tbody tr {
            border-bottom: 1px solid #e0e0e0;
            page-break-inside: avoid;
          }
          table.report-table tbody tr:nth-child(even) td { background: #f8faf9 !important; }
          table.report-table tbody td {
            padding: 5pt 6pt;
            font-size: 9pt;
            color: #222;
            vertical-align: top;
          }
          table.report-table td.num, table.report-table th.num { text-align: right; font-variant-numeric: tabular-nums; }
          table.report-table td.center, table.report-table th.center { text-align: center; }
          table.report-table tfoot tr { border-top: 2px solid #1a3a2a; }
          table.report-table tfoot td {
            padding: 6pt;
            font-weight: 700;
            font-size: 10pt;
            background: #fff !important;
          }

          /* Callout boxes */
          .methodik-box {
            background: #f3f4f3 !important;
            border-left: 4px solid #1a3a2a;
            padding: 10pt 12pt;
            font-size: 9.5pt;
            line-height: 1.5;
            color: #222;
          }
          .gaps-box {
            background: #fff8e6 !important;
            border-left: 4px solid #d49a00;
            padding: 10pt 12pt;
            font-size: 9.5pt;
            line-height: 1.5;
            color: #5a4500;
          }
          .gaps-box h3 { color: #5a4500 !important; font-size: 9pt; }
          .gaps-box li { color: #5a4500 !important; }
          .gaps-box .dot { background: #d49a00 !important; }

          .print-footer-inline { display: none !important; }
          .exec-summary { background: #f8faf9 !important; border: 1px solid #e0e0e0; padding: 10pt; }
        }

        /* Screen: hide cover */
        @media screen {
          .print-cover { display: none; }
        }
      `}</style>

      <div className="p-6 space-y-6">
        {/* Header (screen only) */}
        <div className="flex items-center justify-between screen-header no-print">
          <p className="text-xs text-muted-foreground">
            CLYMAIQ ESG / <span className="font-semibold text-foreground">CSRD Report</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              <FileText className="w-4 h-4" />
              PDF-Vorschau
            </button>
            <button
              onClick={resetAnalysis}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Neue Analyse starten
            </button>
          </div>
        </div>

        {/* Report */}
        <div className="report-shell bg-card rounded-xl border border-border max-w-4xl mx-auto print:border-none print:shadow-none">
          {/* Print-only cover page */}
          <div className="print-cover">
            <div className="print-cover-header">
              <span className="logo">CLYMAIQ</span>
              <span className="tag">ESG Platform</span>
            </div>
            <h1 className="company">Muster GmbH</h1>
            <h2 className="sub">CSRD-Nachhaltigkeitsbericht 2024</h2>
            <div className="smallcaps">
              Gemäß ESRS E1 · GHG Protocol · Automatisch aus SAP FI/CO generiert
            </div>
            <div className="meta">
              <strong>Berichtszeitraum:</strong> {berichtszeitraum}
            </div>
            <div className="meta">
              <strong>Erstellt am:</strong> {generationDate}
            </div>

            <div className="scope-summary">
              <div className="scope-card s1">
                <div className="label">Scope 1 — Direkt</div>
                <div className="value">
                  {formatTonnes(s1)}
                  <span className="unit">t CO₂e</span>
                </div>
              </div>
              <div className="scope-card s2">
                <div className="label">Scope 2 — Energie</div>
                <div className="value">
                  {formatTonnes(s2)}
                  <span className="unit">t CO₂e</span>
                </div>
              </div>
              <div className="scope-card s3">
                <div className="label">Scope 3 — Wertschöpfung</div>
                <div className="value">
                  {formatTonnes(s3)}
                  <span className="unit">t CO₂e</span>
                </div>
              </div>
            </div>
          </div>

          {/* Screen Title Block */}
          <div className="report-title-block bg-sidebar text-sidebar-foreground p-8 rounded-t-xl print:bg-[hsl(155,35%,14%)]">
            <h1 className="text-xl font-bold">CSRD-Nachhaltigkeitsbericht 2024 — Muster GmbH</h1>
            <p className="text-sm text-sidebar-muted mt-1">
              Geschäftsjahr {berichtszeitraum} · ESRS-konform · automatisch aus SAP FI/CO generiert
            </p>
          </div>

          <div className="report-body p-8 space-y-8">
            {/* Executive Summary */}
            <section className="print-section">
              <h2 className="text-lg font-bold mb-3 text-foreground">
                CSRD Nachhaltigkeitsbericht — ESRS E1 Klimawandel
              </h2>
              <div className="exec-summary bg-muted/50 rounded-lg p-4">
                <p className="text-sm leading-relaxed text-foreground">
                  Im Berichtszeitraum {berichtszeitraum} wurden insgesamt{" "}
                  <strong>{formatTonnes(total)} t CO₂e</strong> emittiert. Davon entfallen{" "}
                  {formatTonnes(s1)} t auf Scope 1 (direkte Emissionen), {formatTonnes(s2)} t auf
                  Scope 2 (Energiebezug) und {formatTonnes(s3)} t auf Scope 3 (Wertschöpfungskette).
                  Die Datenqualität beträgt <strong>{quality.score} %</strong>.
                </p>
              </div>
            </section>

            <ScopeSection
              scopeKey="s1"
              title="Scope 1: Direkte Emissionen"
              description="Emissionen aus eigenen oder kontrollierten Quellen (Fuhrpark, Heizung, Produktion)"
              lines={scope1Lines}
              total={s1}
            />
            <ScopeSection
              scopeKey="s2"
              title="Scope 2: Energiebedingte Emissionen"
              description="Emissionen aus eingekaufter Energie (Strom, Fernwärme)"
              lines={scope2Lines}
              total={s2}
            />
            <ScopeSection
              scopeKey="s3"
              title="Scope 3: Emissionen der Wertschöpfungskette"
              description="Indirekte Emissionen aus vor- und nachgelagerten Aktivitäten"
              lines={scope3Lines}
              total={s3}
            />

            {/* Methodology */}
            <section className="print-section">
              <h2 className="text-base font-bold mb-2">Methodik</h2>
              <div className="methodik-box bg-muted/40 border-l-4 border-primary/70 rounded p-4">
                <p className="text-sm text-foreground leading-relaxed">
                  Berechnung nach GHG Protocol Corporate Standard. Methode: Spend-Based EEIO
                  (Environmentally Extended Input-Output) gemäß GHG Protocol Corporate Value Chain
                  (Scope 3) Standard. Alle Emissionen werden aus monetären SAP FI/CO Buchungsdaten
                  abgeleitet — ohne manuelle Eingabe. Emissionsfaktoren: UBA 2024, DEFRA 2024,
                  GHG Protocol EEIO.
                </p>
              </div>
            </section>

            {/* Data Gaps */}
            <section className="print-section">
              <h2 className="text-base font-bold mb-3">Datenlücken & Empfehlungen</h2>
              <div className="gaps-box bg-amber-50 border-l-4 border-amber-500 rounded p-4 space-y-3">
                {quality.fehlende_scopes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-amber-900">
                      Fehlende Scope-Kategorien:
                    </h3>
                    <ul className="space-y-1">
                      {quality.fehlende_scopes.map((s, i) => (
                        <li key={i} className="text-sm text-amber-900 flex items-center gap-2">
                          <span className="dot w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {quality.empfehlungen.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-amber-900">Empfehlungen:</h3>
                    <ul className="space-y-1">
                      {quality.empfehlungen.map((e, i) => (
                        <li key={i} className="text-sm text-amber-900 flex items-center gap-2">
                          <span className="dot w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            {/* Footer (screen only) */}
            <div className="print-footer-inline border-t border-border pt-4 flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
              <span>CLYMAIQ ESG Platform</span>
              <span>Powered by Claude AI · GHG Protocol · CSRD / ESRS E1</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ScopeSection({
  scopeKey,
  title,
  description,
  lines,
  total,
}: {
  scopeKey: "s1" | "s2" | "s3";
  title: string;
  description: string;
  lines: any[];
  total: number;
}) {
  return (
    <section className="print-section">
      <div className={`scope-header ${scopeKey}`}>
        <div>
          <div className="title">{title}</div>
          <div className="desc">{description}</div>
        </div>
        <div className="badge">{formatTonnes(total)} t CO₂e</div>
      </div>
      {/* Screen-only fallback heading kept hidden in print via scope-header above */}
      {lines.length > 0 ? (
        <table className="report-table w-full text-sm mb-2">
          <thead>
            <tr className="text-xs text-muted-foreground uppercase border-b border-border">
              <th className="py-2 text-left font-medium">Kostenstelle</th>
              <th className="py-2 text-left font-medium">Buchungstext</th>
              <th className="num py-2 text-right font-medium">Betrag €</th>
              <th className="py-2 text-left font-medium">Kategorie</th>
              <th className="center py-2 text-center font-medium">Scope</th>
              <th className="num py-2 text-right font-medium">t CO₂e</th>
              <th className="num py-2 text-right font-medium">Faktor kg/€</th>
              <th className="py-2 text-left font-medium">Quelle</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l: any) => (
              <tr key={l.zeile_id} className="border-b border-border/50">
                <td className="py-2 text-xs">{l.original.kostenstelle}</td>
                <td className="py-2 text-xs">{l.original.buchungstext}</td>
                <td className="num py-2 text-xs text-right">{formatEuro(l.original.betrag)}</td>
                <td className="py-2 text-xs">{l.kategorie}</td>
                <td className="center py-2 text-xs text-center">{l.scope}</td>
                <td className="num py-2 text-xs text-right font-medium">{formatTonnes(l.t_co2)}</td>
                <td className="num py-2 text-xs text-right tabular-nums">
                  {l.emissionsfaktor.toLocaleString("de-DE", {
                    minimumFractionDigits: 5,
                    maximumFractionDigits: 5,
                  })}
                </td>
                <td className="py-2 text-xs text-muted-foreground">{l.quelle}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border">
              <td colSpan={5} className="py-2 text-sm font-bold">
                Summe
              </td>
              <td className="num py-2 text-sm font-bold text-right">{formatTonnes(total)} t</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Keine Buchungen in diesem Scope klassifiziert.
        </p>
      )}
    </section>
  );
}
