import { BookingLine } from "./types";
import { SupplierAnswers } from "./types";

function parseNum(s: string | undefined): number {
  if (!s) return 0;
  const cleaned = s.trim().replace(/[€\s ]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Convert supplier chat answers into synthetic BookingLines so the existing
 * EEIO classifier (buildFallbackResponse + calculateEmissions) can estimate
 * their emissions without a real CO2 Bilanz.
 *
 * Account numbers are chosen to match the ranges in fallback-classifier.ts:
 *   40000–40199 → strom, 65100–65199 → erdgas/heizung, 58000–58099 → kraftstoff,
 *   70100–70299 → rohwaren, 65000–65099 → dienstreisen
 */
export function supplierAnswersToBookingLines(
  answers: SupplierAnswers,
  berichtsjahr: string
): BookingLine[] {
  const lines: BookingLine[] = [];
  let id = 1000; // offset to avoid collisions with uploaded lines

  const add = (konto: string, text: string, betrag: number) => {
    if (betrag <= 0) return;
    lines.push({ id: id++, kostenstelle: "LIEFERANT", konto, buchungstext: text, betrag, periode: berichtsjahr });
  };

  // Strom: kWh given → convert via avg German electricity price ~0.30 €/kWh
  // Strom: Euro given → use directly
  const stromRaw = parseNum(answers.stromverbrauch);
  if (stromRaw > 0) {
    const isKwh = /kwh/i.test(answers.stromverbrauch ?? "");
    const oeko = Math.min(100, Math.max(0, parseNum(answers.oekostromAnteil)));
    // For EEIO we keep the full spend; Ökostrom reduces the factor at category level
    // (not yet modelled here — pass-through as-is, a future enhancement can split)
    const betrag = isKwh ? stromRaw * 0.30 : stromRaw;
    add("40000", `Strom (${oeko > 0 ? oeko + "% Ökostrom" : "Netzstrom"})`, betrag * (1 - oeko / 100));
    if (oeko > 0) add("40000", "Ökostrom-Anteil", betrag * (oeko / 100));
  }

  // Heizung (Erdgas/Öl/Fernwärme): kWh → €, or direct €
  const heizRaw = parseNum(answers.heizung);
  if (heizRaw > 0) {
    const isKwh = /kwh/i.test(answers.heizung ?? "");
    const betrag = isKwh ? heizRaw * 0.08 : heizRaw; // avg ~0.08 €/kWh gas
    add("65100", "Heizung / Erdgas", betrag);
  }

  // Kraftstoff: Liter → €, or direct €
  const kraftRaw = parseNum(answers.kraftstoff);
  if (kraftRaw > 0) {
    const isLiter = /l(?:iter)?/i.test(answers.kraftstoff ?? "");
    const betrag = isLiter ? kraftRaw * 1.75 : kraftRaw; // avg diesel ~1.75 €/l
    add("58000", "Kraftstoff Fuhrpark", betrag);
  }

  // Materialeinkauf → rohwaren (Konto 70100)
  const mat = parseNum(answers.materialeinkauf);
  add("70100", "Materialeinkauf / Wareneinkauf", mat);

  // Dienstreisen (Konto 65000)
  const reise = parseNum(answers.dienstreisen);
  add("65000", "Dienstreisen", reise);

  return lines;
}
