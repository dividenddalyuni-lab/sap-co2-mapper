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
    perioden.length > 0
      ? `${perioden[0]} – ${perioden[perioden.length - 1]}`
      : "Januar 2024 – Q2 2024";

  const generationDate = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const handlePrint = () => {
    const content = document.getElementById("csrd-report-content")?.innerHTML || "";
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html><head>
<title>Muster GmbH CSRD Report 2024</title>
<meta charset="utf-8"/>
<style>
  @page { margin: 15mm 15mm 20mm 15mm; size: A4; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
  html, body { background: #fff; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #1a1a1a; margin: 0; }

  /* COVER PAGE */
  .cover-page { page-break-after: always; min-height: 260mm; display: flex; flex-direction: column; }
  .cover-header { background: #1a3a2a; color: white; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; margin: -15mm -15mm 0 -15mm; }
  .cover-header .logo { font-size: 18px; font-weight: 700; letter-spacing: 4px; color: white; }
  .cover-header .subtitle { font-size: 10px; color: #9fe1cb; letter-spacing: 2px; text-transform: uppercase; }
  .cover-body { padding: 48px 0 0 0; flex: 1; }
  .cover-company { font-size: 36px; font-weight: 700; color: #1a3a2a; margin: 40px 0 8px 0; }
  .cover-title { font-size: 20px; color: #444; margin-bottom: 16px; font-weight: 400; }
  .cover-meta { font-size: 10px; color: #777; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; border-bottom: 2px solid #1a3a2a; padding-bottom: 12px; }
  .cover-period { font-size: 12px; color: #444; margin-bottom: 4px; }
  .cover-date { font-size: 11px; color: #888; margin-bottom: 40px; }
  .scope-boxes { display: flex; gap: 16px; margin-top: 32px; }
  .scope-box { flex: 1; border-radius: 8px; padding: 20px; text-align: center; }
  .scope-box.s1 { background: #e8f5e9; border: 2px solid #2d6a4f; }
  .scope-box.s2 { background: #fff8e1; border: 2px solid #f4a261; }
  .scope-box.s3 { background: #fbe9e7; border: 2px solid #e76f51; }
  .scope-box .label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 6px; }
  .scope-box .value { font-size: 24px; font-weight: 700; color: #1a1a1a; }
  .scope-box .unit { font-size: 10px; color: #666; margin-left: 4px; font-weight: 400; }
  .cover-footer-note { margin-top: 40px; padding: 16px 20px; background: #f5f5f5; font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; }

  /* PAGE HEADER */
  .page-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1a3a2a; padding-bottom: 8px; margin-bottom: 18px; }
  .page-header .co { font-size: 12px; font-weight: 700; color: #1a3a2a; }
  .page-header .rep { font-size: 9px; color: #888; letter-spacing: 1px; text-transform: uppercase; }

  h2.section-title { font-size: 14px; font-weight: 700; color: #1a3a2a; margin: 0 0 10px 0; }

  /* SCOPE HEADERS */
  .scope-header { display: flex; justify-content: space-between; align-items: center; margin: 22px 0 4px 0; padding-left: 12px; }
  .scope-header.s1 { border-left: 4px solid #2d6a4f; }
  .scope-header.s2 { border-left: 4px solid #f4a261; }
  .scope-header.s3 { border-left: 4px solid #e76f51; }
  .scope-header h2 { font-size: 13px; font-weight: 700; margin: 0; color: #1a1a1a; }
  .scope-header .total-badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; }
  .scope-header.s1 .total-badge { background: #e8f5e9; color: #2d6a4f; }
  .scope-header.s2 .total-badge { background: #fff8e1; color: #e65100; }
  .scope-header.s3 .total-badge { background: #fbe9e7; color: #bf360c; }
  .scope-desc { font-size: 9px; color: #888; margin: 0 0 10px 16px; }

  /* TABLES */
  table.report-table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 8px; page-break-inside: auto; }
  table.report-table thead { display: table-header-group; }
  table.report-table thead tr { background: #1a3a2a !important; color: #fff !important; }
  table.report-table thead th { background: #1a3a2a !important; color: #fff !important; padding: 6px 8px; text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
  table.report-table th.num, table.report-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
  table.report-table th.center, table.report-table td.center { text-align: center; }
  table.report-table tbody tr { page-break-inside: avoid; }
  table.report-table tbody tr:nth-child(even) td { background: #f8faf9 !important; }
  table.report-table tbody td { padding: 5px 8px; border-bottom: 1px solid #eee; vertical-align: top; color: #222; }
  table.report-table tr.sum-row td { font-weight: 700; font-size: 10px; border-top: 2px solid #1a3a2a; background: #f0f4f0 !important; padding: 6px 8px; }

  /* SUMMARY TABLE */
  .summary-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 10px; }
  .summary-table td { padding: 8px 12px; border-bottom: 1px solid #eee; }
  .summary-table .label { color: #555; width: 60%; }
  .summary-table .val { font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
  .summary-table tr.total-row td { background: #1a3a2a !important; color: #fff !important; font-weight: 700; }

  /* CALLOUT BOXES */
  .methodik-box { background: #f5f5f5; border-left: 4px solid #1a3a2a; padding: 14px 16px; margin: 18px 0; font-size: 9.5px; line-height: 1.6; border-radius: 0 4px 4px 0; }
  .methodik-box h3 { font-size: 11px; margin: 0 0 8px 0; color: #1a3a2a; }
  .gaps-box { background: #fff8e1; border-left: 4px solid #f4a261; padding: 14px 16px; margin: 14px 0; font-size: 9.5px; line-height: 1.6; border-radius: 0 4px 4px 0; }
  .gaps-box h3 { font-size: 11px; margin: 0 0 8px 0; color: #e65100; }
  .gaps-box ul, .reco-box ul { margin: 4px 0; padding-left: 18px; }
  .gaps-box li, .reco-box li { margin-bottom: 3px; }
  .reco-box { background: #e8f5e9; border-left: 4px solid #2d6a4f; padding: 14px 16px; margin: 14px 0; font-size: 9.5px; line-height: 1.6; border-radius: 0 4px 4px 0; }
  .reco-box h3 { font-size: 11px; margin: 0 0 8px 0; color: #1a3a2a; }

  .exec-summary { background: #f8faf9; border: 1px solid #e0e0e0; padding: 12px 14px; font-size: 10px; line-height: 1.5; border-radius: 4px; }

  .page-break { page-break-after: always; }
  .avoid-break { page-break-inside: avoid; }
</style>
</head>
<body>
${content}
</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
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
      {/* Screen-only: hide cover page & print-only chrome */}
      <style>{`
        @media screen {
          .cover-page, .page-header { display: none; }
        }
      `}</style>

      <div className="p-6 space-y-6">
        {/* Header (screen only) */}
        <div className="flex items-center justify-between no-print">
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

        {/* Report content — cloned into print window */}
        <div
          id="csrd-report-content"
          className="bg-card rounded-xl border border-border max-w-4xl mx-auto p-8 space-y-6"
        >
          {/* COVER PAGE (print only) */}
          <div className="cover-page">
            <div className="cover-header">
              <span className="logo">CLYMAIQ</span>
              <span className="subtitle">ESG Platform</span>
            </div>
            <div className="cover-body">
              <h1 className="cover-company">Muster GmbH</h1>
              <div className="cover-title">CSRD-Nachhaltigkeitsbericht 2024</div>
              <div className="cover-meta">
                Gemäß ESRS E1 · GHG Protocol · Automatisch aus SAP FI/CO generiert
              </div>
              <div className="cover-period">
                <strong>Berichtszeitraum:</strong> {berichtszeitraum}
              </div>
              <div className="cover-date">Erstellt am: {generationDate}</div>

              <div className="scope-boxes">
                <div className="scope-box s1">
                  <div className="label">Scope 1 — Direkt</div>
                  <div className="value">
                    {formatTonnes(s1)}
                    <span className="unit">t CO₂e</span>
                  </div>
                </div>
                <div className="scope-box s2">
                  <div className="label">Scope 2 — Energie</div>
                  <div className="value">
                    {formatTonnes(s2)}
                    <span className="unit">t CO₂e</span>
                  </div>
                </div>
                <div className="scope-box s3">
                  <div className="label">Scope 3 — Wertschöpfung</div>
                  <div className="value">
                    {formatTonnes(s3)}
                    <span className="unit">t CO₂e</span>
                  </div>
                </div>
              </div>

              <div className="cover-footer-note">
                CLYMAIQ ESG Platform · Powered by Claude AI · GHG Protocol · CSRD / ESRS E1
              </div>
            </div>
          </div>

          {/* PAGE HEADER (print only, repeats visually after cover) */}
          <div className="page-header">
            <span className="co">Muster GmbH</span>
            <span className="rep">CSRD-Bericht 2024 · ESRS E1</span>
          </div>

          {/* Screen title block */}
          <div className="bg-sidebar text-sidebar-foreground p-6 rounded-lg no-print">
            <h1 className="text-xl font-bold">CSRD-Nachhaltigkeitsbericht 2024 — Muster GmbH</h1>
            <p className="text-sm text-sidebar-muted mt-1">
              Geschäftsjahr {berichtszeitraum} · ESRS-konform · automatisch aus SAP FI/CO generiert
            </p>
          </div>

          {/* Executive Summary */}
          <section>
            <h2 className="section-title text-lg font-bold mb-3 text-foreground">
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

          {/* GESAMTÜBERSICHT */}
          <section>
            <h2 className="section-title text-base font-bold mb-2">Gesamtübersicht</h2>
            <table className="summary-table">
              <tbody>
                <tr>
                  <td className="label">Scope 1 — Direkte Emissionen</td>
                  <td className="val">{formatTonnes(s1)} t CO₂e</td>
                </tr>
                <tr>
                  <td className="label">Scope 2 — Energiebedingte Emissionen</td>
                  <td className="val">{formatTonnes(s2)} t CO₂e</td>
                </tr>
                <tr>
                  <td className="label">Scope 3 — Wertschöpfungskette</td>
                  <td className="val">{formatTonnes(s3)} t CO₂e</td>
                </tr>
                <tr className="total-row">
                  <td className="label">Gesamt</td>
                  <td className="val">{formatTonnes(total)} t CO₂e</td>
                </tr>
              </tbody>
            </table>
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

          {/* Methodik */}
          <section>
            <div className="methodik-box">
              <h3>Methodik</h3>
              <p>
                Berechnung nach GHG Protocol Corporate Standard. Methode: Spend-Based EEIO
                (Environmentally Extended Input-Output) gemäß GHG Protocol Corporate Value Chain
                (Scope 3) Standard. Alle Emissionen werden aus monetären SAP FI/CO Buchungsdaten
                abgeleitet — ohne manuelle Eingabe. Emissionsfaktoren: UBA 2024, DEFRA 2024,
                GHG Protocol EEIO.
              </p>
            </div>
          </section>

          {/* Datenlücken */}
          {quality.fehlende_scopes.length > 0 && (
            <section>
              <div className="gaps-box">
                <h3>Datenlücken</h3>
                <ul>
                  {quality.fehlende_scopes.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Empfehlungen */}
          {quality.empfehlungen.length > 0 && (
            <section>
              <div className="reco-box">
                <h3>Empfehlungen</h3>
                <ul>
                  {quality.empfehlungen.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}
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
    <section className="avoid-break">
      <div className={`scope-header ${scopeKey}`}>
        <h2>{title}</h2>
        <span className="total-badge">{formatTonnes(total)} t CO₂e</span>
      </div>
      <p className="scope-desc">{description}</p>

      {lines.length > 0 ? (
        <table className="report-table">
          <thead>
            <tr>
              <th>Kostenstelle</th>
              <th>Buchungstext</th>
              <th className="num">Betrag €</th>
              <th>Kategorie</th>
              <th className="center">Scope</th>
              <th className="num">t CO₂e</th>
              <th className="num">Faktor kg/€</th>
              <th>Quelle</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l: any) => (
              <tr key={l.zeile_id}>
                <td>{l.original.kostenstelle}</td>
                <td>{l.original.buchungstext}</td>
                <td className="num">{formatEuro(l.original.betrag)}</td>
                <td>{l.kategorie}</td>
                <td className="center">{l.scope}</td>
                <td className="num">{formatTonnes(l.t_co2)}</td>
                <td className="num">
                  {l.emissionsfaktor.toLocaleString("de-DE", {
                    minimumFractionDigits: 5,
                    maximumFractionDigits: 5,
                  })}
                </td>
                <td>{l.quelle}</td>
              </tr>
            ))}
            <tr className="sum-row">
              <td colSpan={5}>Summe</td>
              <td className="num">{formatTonnes(total)} t</td>
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Keine Buchungen in diesem Scope klassifiziert.
        </p>
      )}
    </section>
  );
}
