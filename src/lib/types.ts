export interface BookingLine {
  id: number;
  kostenstelle: string;
  konto: string;
  buchungstext: string;
  betrag: number;
  periode: string;
}

export interface ClassifiedLine {
  zeile_id: number;
  kategorie: string;
  scope: 1 | 2 | 3;
  scope3_kategorie?: string;
  emissionsfaktor: number;
  einheit: string;
  umrechnungsfaktor: number;
  quelle: string;
  konfidenz: "hoch" | "mittel" | "niedrig";
  status: "ok" | "pruefen" | "fehler";
  begruendung: string;
}

export interface Anomalie {
  zeile_id: number;
  typ: string;
  nachricht: string;
  empfehlung: string;
}

export interface Datenqualitaet {
  score: number;
  fehlende_scopes: string[];
  empfehlungen: string[];
}

export interface ClaudeResponse {
  zeilen: ClassifiedLine[];
  anomalien: Anomalie[];
  datenqualitaet: Datenqualitaet;
}

export interface CalculatedLine extends ClassifiedLine {
  original: BookingLine;
  einheiten: number;
  kg_co2: number;
  t_co2: number;
}

export type AppScreen = "upload" | "analysis" | "dashboard" | "csrd-report" | "anomalies" | "ai-assistant" | "savings" | "supplier-chat";

export interface SupplierFile {
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  // blob URL for local preview; replace with server URL when backend is ready
  localUrl?: string;
  // placeholder for future backend upload
  serverUrl?: string;
}

export interface SupplierAnswers {
  // A — Unternehmen
  firmenname?: string;
  branche?: string;
  mitarbeiter?: string;
  berichtsjahr?: string;
  jahresumsatz?: string;
  // B — Bestehende Bilanz
  hatBilanz?: "ja" | "nein";
  gesamtemissionen?: string;
  bilanzStandard?: string;
  scope1?: string;
  scope2?: string;
  scope3?: string;
  bilanzDokument?: SupplierFile;
  // C — Energie
  stromverbrauch?: string;
  oekostromAnteil?: string;
  heizung?: string;
  kraftstoff?: string;
  // D — Scope 3
  materialeinkauf?: string;
  dienstreisen?: string;
  // E — PCF
  hatPcf?: "ja" | "nein";
  pcfWert?: string;
  pcfDokument?: SupplierFile;
  // F — Qualität & Ziele
  datenqualitaet?: string;
  klimaziele?: string;
  // Extra docs
  weitereNachweise?: SupplierFile[];
}

export interface SupplierSession {
  answers: SupplierAnswers;
  completedAt?: string;
  // EEIO-estimated lines (populated when no finished Bilanz provided)
  estimatedBookingLines?: BookingLine[];
}
