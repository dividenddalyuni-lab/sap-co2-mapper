-- CLYMAIQ Datenbank-Schema
-- Migration 001 — Initial Schema

-- ============================================
-- COMPANIES (Mandanten)
-- ============================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  branche TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- UPLOADS (Excel / SAP Datenimporte)
-- ============================================
CREATE TABLE uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  filename TEXT,
  berichtsjahr TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BOOKING LINES (Buchungszeilen aus SAP/Excel)
-- ============================================
CREATE TABLE booking_lines (
  id BIGSERIAL PRIMARY KEY,
  upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  kostenstelle TEXT,
  konto TEXT,
  buchungstext TEXT,
  betrag NUMERIC,
  periode TEXT
);

-- ============================================
-- CALCULATED LINES (EEIO Ergebnisse)
-- ============================================
CREATE TABLE calculated_lines (
  id BIGSERIAL PRIMARY KEY,
  upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  zeile_id INTEGER,
  -- Original Buchungsdaten
  kostenstelle TEXT,
  konto TEXT,
  buchungstext TEXT,
  betrag NUMERIC,
  periode TEXT,
  -- EEIO Klassifikation
  kategorie TEXT,
  scope INTEGER CHECK (scope IN (1, 2, 3)),
  scope3_kategorie TEXT,
  emissionsfaktor NUMERIC,
  einheit TEXT,
  umrechnungsfaktor NUMERIC,
  quelle TEXT,
  konfidenz TEXT CHECK (konfidenz IN ('hoch', 'mittel', 'niedrig')),
  status TEXT CHECK (status IN ('ok', 'pruefen', 'fehler')),
  begruendung TEXT,
  -- CO₂ Ergebnis
  einheiten NUMERIC,
  kg_co2 NUMERIC,
  t_co2 NUMERIC
);

-- ============================================
-- SUPPLIER SESSIONS (Kunden-Chat Ergebnisse)
-- ============================================
CREATE TABLE supplier_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  estimated_booking_lines JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY aktivieren
-- ============================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculated_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES (vorerst offen für Entwicklung)
-- Vor Produktion: auf Auth-User einschränken!
-- ============================================
CREATE POLICY "allow all for now" ON companies FOR ALL USING (true);
CREATE POLICY "allow all for now" ON uploads FOR ALL USING (true);
CREATE POLICY "allow all for now" ON booking_lines FOR ALL USING (true);
CREATE POLICY "allow all for now" ON calculated_lines FOR ALL USING (true);
CREATE POLICY "allow all for now" ON supplier_sessions FOR ALL USING (true);
