import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, X, CheckCircle, FileText, ChevronRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { SupplierAnswers, SupplierFile, SupplierSession } from "@/lib/types";
import { supplierAnswersToBookingLines } from "@/lib/supplier-to-bookings";
import { buildFallbackResponse } from "@/lib/fallback-classifier";
import { calculateEmissions, formatTonnes } from "@/lib/co2-utils";
import { callAIChat } from "@/lib/ai-provider";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Question definitions
// ---------------------------------------------------------------------------

type QuestionType = "text" | "number" | "yesno" | "upload";

interface Question {
  id: keyof SupplierAnswers | string;
  text: string;
  type: QuestionType;
  placeholder?: string;
  uploadLabel?: string;
  // return true → skip this question
  skipIf?: (a: SupplierAnswers) => boolean;
  // which answer key to store the file in (for upload questions)
  fileKey?: keyof SupplierAnswers;
}

const QUESTIONS: Question[] = [
  // A — Unternehmen
  { id: "firmenname",    type: "text",   text: "Schön, dass Sie dabei sind! Wie lautet der vollständige Name Ihres Unternehmens?" },
  { id: "branche",       type: "text",   text: "In welcher Branche ist Ihr Unternehmen tätig? (z. B. Lebensmittelproduktion, Logistik, IT-Dienstleistung …)" },
  { id: "mitarbeiter",   type: "number", text: "Wie viele Mitarbeiterinnen und Mitarbeiter beschäftigt Ihr Unternehmen?", placeholder: "z. B. 250" },
  { id: "berichtsjahr",  type: "text",   text: "Für welches Geschäftsjahr erfassen wir die Daten?", placeholder: "z. B. 2024" },
  { id: "jahresumsatz",  type: "number", text: "Wie hoch war Ihr Jahresumsatz in diesem Jahr (in Euro)?", placeholder: "z. B. 12500000" },

  // B — Bestehende Bilanz
  { id: "hatBilanz", type: "yesno", text: "Sehr gut! Haben Sie bereits eine CO₂- oder Treibhausgas-Bilanz für dieses Jahr?" },
  {
    id: "gesamtemissionen", type: "number", placeholder: "z. B. 1250",
    text: "Wie hoch waren die gesamten Treibhausgasemissionen in Tonnen CO₂e?",
    skipIf: (a) => a.hatBilanz !== "ja",
  },
  {
    id: "bilanzStandard", type: "text", placeholder: "z. B. GHG Protocol, ISO 14064, ESRS …",
    text: "Nach welchem Standard wurde die Bilanz erstellt?",
    skipIf: (a) => a.hatBilanz !== "ja",
  },
  {
    id: "scope1", type: "text", placeholder: "z. B. 320 t CO₂e (oder 'unbekannt')",
    text: "Falls bekannt: Wie viel entfällt auf Scope 1 (direkte Emissionen)?",
    skipIf: (a) => a.hatBilanz !== "ja",
  },
  {
    id: "scope2", type: "text", placeholder: "z. B. 180 t CO₂e (oder 'unbekannt')",
    text: "Und auf Scope 2 (Energie, z. B. Strom)?",
    skipIf: (a) => a.hatBilanz !== "ja",
  },
  {
    id: "scope3", type: "text", placeholder: "z. B. 750 t CO₂e (oder 'unbekannt')",
    text: "Und auf Scope 3 (vorgelagerte & nachgelagerte Emissionen)?",
    skipIf: (a) => a.hatBilanz !== "ja",
  },
  {
    id: "bilanzDokument", type: "upload",
    text: "Haben Sie die Bilanz oder ein Prüfzertifikat als Datei? (PDF, Excel oder Bild — optional)",
    uploadLabel: "Bilanz-Dokument hochladen",
    fileKey: "bilanzDokument",
    skipIf: (a) => a.hatBilanz !== "ja",
  },

  // C — Energie (nur wenn keine Bilanz)
  {
    id: "stromverbrauch", type: "text", placeholder: "z. B. 85000 kWh oder 25500 €",
    text: "Kommen wir zu Ihrem Energieverbrauch. Wie viel Strom hat Ihr Unternehmen im Jahr verbraucht? (kWh oder Kosten in Euro)",
    skipIf: (a) => a.hatBilanz === "ja",
  },
  {
    id: "oekostromAnteil", type: "number", placeholder: "z. B. 40 (für 40 %)",
    text: "Wie hoch ist der Anteil an Ökostrom (Prozent)? (0 wenn unbekannt)",
    skipIf: (a) => a.hatBilanz === "ja",
  },
  {
    id: "heizung", type: "text", placeholder: "z. B. 120000 kWh Erdgas oder 9600 €",
    text: "Wie hoch war der Verbrauch für Heizung (Erdgas, Öl oder Fernwärme)? (kWh oder Kosten in Euro)",
    skipIf: (a) => a.hatBilanz === "ja",
  },
  {
    id: "kraftstoff", type: "text", placeholder: "z. B. 8000 Liter Diesel oder 14000 €",
    text: "Fuhrpark: Wie viel Kraftstoff wurde verbraucht? (Liter oder Kosten in Euro)",
    skipIf: (a) => a.hatBilanz === "ja",
  },

  // D — Scope 3 (nur wenn keine Bilanz)
  {
    id: "materialeinkauf", type: "number", placeholder: "z. B. 3200000",
    text: "Wie hoch war Ihr Materialeinkauf / Wareneinkauf im Jahr (in Euro)?",
    skipIf: (a) => a.hatBilanz === "ja",
  },
  {
    id: "dienstreisen", type: "number", placeholder: "z. B. 45000",
    text: "Wie viel haben Sie für Geschäftsreisen ausgegeben (in Euro)?",
    skipIf: (a) => a.hatBilanz === "ja",
  },

  // E — PCF
  {
    id: "hatPcf", type: "yesno",
    text: "Haben Sie für Ihre gelieferten Produkte einen Product Carbon Footprint (PCF) in kg CO₂e pro Einheit?",
  },
  {
    id: "pcfWert", type: "text", placeholder: "z. B. 2,4 kg CO₂e / kg Produkt",
    text: "Super! Wie hoch ist der PCF-Wert (kg CO₂e pro Einheit)?",
    skipIf: (a) => a.hatPcf !== "ja",
  },
  {
    id: "pcfDokument", type: "upload",
    text: "Haben Sie ein PCF-Datenblatt als Datei? (optional)",
    uploadLabel: "PCF-Datenblatt hochladen",
    fileKey: "pcfDokument",
    skipIf: (a) => a.hatPcf !== "ja",
  },

  // F — Qualität & Ziele
  {
    id: "datenqualitaet", type: "text", placeholder: "gemessen / geschätzt / Kombination",
    text: "Fast geschafft! Sind die gemachten Angaben eher gemessen (Zählerdaten, Rechnungen) oder geschätzt?",
  },
  {
    id: "klimaziele", type: "text", placeholder: "z. B. Net Zero bis 2040, SBTi-Ziel …",
    text: "Haben Sie Klimaziele oder Reduktionsziele? Falls ja, beschreiben Sie diese kurz. (Sonst einfach 'Nein' eingeben.)",
  },
];

// ---------------------------------------------------------------------------
// Helper types for chat messages
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "bot" | "user";
  text: string;
  file?: SupplierFile;
}

// ---------------------------------------------------------------------------
// File chip component
// ---------------------------------------------------------------------------

function FileChip({ file, onRemove }: { file: SupplierFile; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium border border-primary/20">
      <FileText className="w-3 h-3" />
      {file.name}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:text-destructive transition-colors">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Summary view
// ---------------------------------------------------------------------------

function SummaryView({
  answers,
  estimatedTco2,
  onConfirm,
}: {
  answers: SupplierAnswers;
  estimatedTco2: number | null;
  onConfirm: () => void;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Unternehmen", value: answers.firmenname ?? "—" },
    { label: "Branche", value: answers.branche ?? "—" },
    { label: "Mitarbeiter", value: answers.mitarbeiter ?? "—" },
    { label: "Berichtsjahr", value: answers.berichtsjahr ?? "—" },
    { label: "Jahresumsatz", value: answers.jahresumsatz ? answers.jahresumsatz + " €" : "—" },
    { label: "CO₂-Bilanz vorhanden", value: answers.hatBilanz === "ja" ? "Ja" : "Nein" },
    ...(answers.hatBilanz === "ja"
      ? [
          { label: "Gesamtemissionen (t CO₂e)", value: answers.gesamtemissionen ?? "—" },
          { label: "Bilanz-Standard", value: answers.bilanzStandard ?? "—" },
          { label: "Scope 1", value: answers.scope1 ?? "—" },
          { label: "Scope 2", value: answers.scope2 ?? "—" },
          { label: "Scope 3", value: answers.scope3 ?? "—" },
        ]
      : [
          { label: "Strom", value: answers.stromverbrauch ?? "—" },
          { label: "Ökostrom-Anteil", value: answers.oekostromAnteil ? answers.oekostromAnteil + " %" : "—" },
          { label: "Heizung", value: answers.heizung ?? "—" },
          { label: "Kraftstoff", value: answers.kraftstoff ?? "—" },
          { label: "Materialeinkauf", value: answers.materialeinkauf ? answers.materialeinkauf + " €" : "—" },
          { label: "Dienstreisen", value: answers.dienstreisen ? answers.dienstreisen + " €" : "—" },
        ]),
    { label: "PCF", value: answers.hatPcf === "ja" ? (answers.pcfWert ?? "—") : "Nicht vorhanden" },
    { label: "Datenqualität", value: answers.datenqualitaet ?? "—" },
    { label: "Klimaziele", value: answers.klimaziele ?? "—" },
  ];

  const docs = [
    answers.bilanzDokument,
    answers.pcfDokument,
    ...(answers.weitereNachweise ?? []),
  ].filter(Boolean) as SupplierFile[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-primary">
        <CheckCircle className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Vielen Dank! Hier ist Ihre Zusammenfassung.</h2>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} className={i % 2 === 0 ? "bg-muted/30" : "bg-background"}>
                <td className="px-4 py-2 font-medium text-muted-foreground w-1/3">{r.label}</td>
                <td className="px-4 py-2">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {docs.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Hochgeladene Dokumente</p>
          <div className="flex flex-wrap gap-2">
            {docs.map((f) => <FileChip key={f.name + f.uploadedAt} file={f} />)}
          </div>
        </div>
      )}

      {estimatedTco2 !== null && answers.hatBilanz !== "ja" && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <p className="text-sm font-semibold text-primary mb-1">EEIO-Schätzung (Spend-Based)</p>
          <p className="text-2xl font-bold">{formatTonnes(estimatedTco2)} t CO₂e</p>
          <p className="text-xs text-muted-foreground mt-1">
            Berechnet aus Ihren Angaben via GHG-Protocol EEIO-Faktoren. Ersetzt nicht eine zertifizierte Bilanz.
          </p>
        </div>
      )}

      <button
        onClick={onConfirm}
        className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
      >
        Daten in CLYMAIQ übernehmen
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SupplierChatPage() {
  const { apiKey, provider, setSupplierSession, setScreen } = useApp();

  const [answers, setAnswers] = useState<SupplierAnswers>({});
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "bot", text: "Willkommen! Ich helfe Ihnen, Ihre Nachhaltigkeitsdaten für die CSRD-Berichterstattung zu erfassen. Bitte beantworten Sie die Fragen nacheinander. Los geht's!" },
  ]);
  const [currentQIdx, setCurrentQIdx] = useState(0); // index into visible questions
  const [inputValue, setInputValue] = useState("");
  const [pendingFile, setPendingFile] = useState<{ file: File; meta: SupplierFile } | null>(null);
  const [extraFiles, setExtraFiles] = useState<{ file: File; meta: SupplierFile }[]>([]);
  const [done, setDone] = useState(false);
  const [estimatedTco2, setEstimatedTco2] = useState<number | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const extraFileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Compute visible questions given current answers
  const visibleQuestions = QUESTIONS.filter((q) => !q.skipIf || !q.skipIf(answers));

  const currentQuestion: Question | undefined = visibleQuestions[currentQIdx];

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiThinking]);

  // Push the first real question after the welcome message (once on mount)
  useEffect(() => {
    if (visibleQuestions.length > 0) {
      setMessages((prev) => [...prev, { role: "bot", text: visibleQuestions[0].text }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const meta: SupplierFile = {
      name: f.name,
      type: f.type || "application/octet-stream",
      size: f.size,
      uploadedAt: new Date().toISOString(),
      localUrl: URL.createObjectURL(f),
    };
    setPendingFile({ file: f, meta });
    e.target.value = "";
  }, []);

  const handleExtraFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const metas = files.map((f) => ({
      file: f,
      meta: {
        name: f.name,
        type: f.type || "application/octet-stream",
        size: f.size,
        uploadedAt: new Date().toISOString(),
        localUrl: URL.createObjectURL(f),
      } satisfies SupplierFile,
    }));
    setExtraFiles((prev) => [...prev, ...metas]);
    e.target.value = "";
  }, []);

  const advanceQuestion = useCallback(
    (newAnswers: SupplierAnswers, userText: string, fileMeta?: SupplierFile) => {
      // Recompute visible questions with updated answers
      const visible = QUESTIONS.filter((q) => !q.skipIf || !q.skipIf(newAnswers));
      const nextIdx = currentQIdx + 1;

      setMessages((prev) => [
        ...prev,
        { role: "user", text: userText, file: fileMeta },
      ]);

      if (nextIdx >= visible.length) {
        // All done — compute estimate and show summary
        const berichtsjahr = newAnswers.berichtsjahr ?? String(new Date().getFullYear() - 1);
        let tco2: number | null = null;
        if (newAnswers.hatBilanz !== "ja") {
          try {
            const syntheticLines = supplierAnswersToBookingLines(newAnswers, berichtsjahr);
            const cr = buildFallbackResponse(syntheticLines);
            const calc = calculateEmissions(syntheticLines, cr);
            tco2 = calc.reduce((s, l) => s + l.t_co2, 0);
          } catch (_) {}
        }
        setEstimatedTco2(tco2);
        setDone(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: "Perfekt — alle Angaben sind vollständig. Hier ist Ihre Zusammenfassung:",
          },
        ]);
        return;
      }

      const nextQ = visible[nextIdx];
      setCurrentQIdx(nextIdx);

      // Optionally let AI rephrase/follow-up (fire-and-forget, no blocking)
      if (apiKey && nextIdx < visible.length) {
        setIsAiThinking(true);
        callAIChat({
          provider,
          apiKey,
          system:
            "Du bist ein freundlicher Nachhaltigkeits-Assistent der ESG-Plattform CLYMAIQ. " +
            "Du stellst einem Lieferanten genau eine Frage auf Deutsch. " +
            "Formuliere die folgende Frage natürlich und kurz (max. 2 Sätze). " +
            "Antworte NUR mit dem Fragetext, kein Begrüßung, kein JSON.",
          messages: [{ role: "user", content: nextQ.text }],
          maxTokens: 200,
        })
          .then((aiText) => {
            setMessages((prev) => [...prev, { role: "bot", text: aiText || nextQ.text }]);
          })
          .catch(() => {
            setMessages((prev) => [...prev, { role: "bot", text: nextQ.text }]);
          })
          .finally(() => setIsAiThinking(false));
      } else {
        setMessages((prev) => [...prev, { role: "bot", text: nextQ.text }]);
      }
    },
    [currentQIdx, apiKey, provider]
  );

  const submitAnswer = useCallback(
    (value: string) => {
      if (!currentQuestion) return;
      const trimmed = value.trim();
      if (!trimmed && currentQuestion.type !== "upload") return;

      const fileMeta = pendingFile?.meta;
      const newAnswers: SupplierAnswers = { ...answers, [currentQuestion.id]: trimmed };
      if (fileMeta && currentQuestion.fileKey) {
        (newAnswers as Record<string, unknown>)[currentQuestion.fileKey as string] = fileMeta;
      }

      setAnswers(newAnswers);
      setPendingFile(null);
      setInputValue("");
      advanceQuestion(newAnswers, trimmed || "(kein Text)", fileMeta);
    },
    [currentQuestion, answers, pendingFile, advanceQuestion]
  );

  const handleYesNo = useCallback(
    (choice: "ja" | "nein") => {
      if (!currentQuestion) return;
      const newAnswers: SupplierAnswers = { ...answers, [currentQuestion.id]: choice };
      setAnswers(newAnswers);
      advanceQuestion(newAnswers, choice === "ja" ? "Ja" : "Nein");
    },
    [currentQuestion, answers, advanceQuestion]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitAnswer(inputValue);
    }
  };

  const handleConfirm = useCallback(async () => {
    const berichtsjahr = answers.berichtsjahr ?? String(new Date().getFullYear() - 1);
    const syntheticLines =
      answers.hatBilanz !== "ja"
        ? supplierAnswersToBookingLines(answers, berichtsjahr)
        : undefined;

    const finalAnswers: SupplierAnswers = {
      ...answers,
      weitereNachweise: extraFiles.map((ef) => ef.meta),
    };

    const session: SupplierSession = {
      answers: finalAnswers,
      completedAt: new Date().toISOString(),
      estimatedBookingLines: syntheticLines,
    };

    if (supabase) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { error: signInError } = await supabase.auth.signInAnonymously();
        console.log("Anonymous sign-in:", signInError ?? "ok");
      }

      const { data, error } = await supabase.from("supplier_sessions").insert({
        answers: finalAnswers,
        estimated_booking_lines: syntheticLines ?? null,
        completed_at: session.completedAt,
      });
      console.log("Supabase insert result:", { data, error });
    }

    setSupplierSession(session);
    setScreen("dashboard");
  }, [answers, extraFiles, setSupplierSession, setScreen]);

  const isUploadQuestion = currentQuestion?.type === "upload";
  const isYesNoQuestion = currentQuestion?.type === "yesno";

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Kunden-Chat — Lieferanten-Datenerfassung</h1>
        <p className="text-sm text-muted-foreground">
          Schritt {Math.min(currentQIdx + 1, visibleQuestions.length)} von {visibleQuestions.length}
          {done ? " — Erfassung abgeschlossen" : ""}
        </p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "bot"
                  ? "bg-primary/10 text-foreground rounded-tl-sm"
                  : "bg-primary text-primary-foreground rounded-tr-sm"
              }`}
            >
              {msg.text}
              {msg.file && (
                <div className="mt-1.5">
                  <FileChip file={msg.file} />
                </div>
              )}
            </div>
          </div>
        ))}

        {isAiThinking && (
          <div className="flex justify-start">
            <div className="bg-primary/10 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-muted-foreground animate-pulse">
              …
            </div>
          </div>
        )}

        {done && (
          <div className="mt-4">
            <SummaryView
              answers={answers}
              estimatedTco2={estimatedTco2}
              onConfirm={handleConfirm}
            />

            {/* Extra file upload */}
            <div className="mt-6">
              <p className="text-sm font-medium mb-2">Weitere Nachweise hochladen (optional)</p>
              <p className="text-xs text-muted-foreground mb-3">
                CSRD-Zertifikat, Energieabrechnung, Prüfberichte o. ä.
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {extraFiles.map((ef, i) => (
                  <FileChip
                    key={ef.meta.name + i}
                    file={ef.meta}
                    onRemove={() => setExtraFiles((prev) => prev.filter((_, j) => j !== i))}
                  />
                ))}
              </div>
              <button
                onClick={() => extraFileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-primary/40 text-primary text-sm hover:bg-primary/5 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
                Datei hinzufügen
              </button>
              <input
                ref={extraFileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleExtraFileSelect}
                multiple
              />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!done && (
        <div className="shrink-0 border-t border-border px-6 py-4">
          {isYesNoQuestion ? (
            <div className="flex gap-3">
              <button
                onClick={() => handleYesNo("ja")}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                Ja
              </button>
              <button
                onClick={() => handleYesNo("nein")}
                className="flex-1 py-2.5 rounded-lg border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors"
              >
                Nein
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              {isUploadQuestion && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 p-2.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title={currentQuestion.uploadLabel ?? "Datei hochladen"}
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </>
              )}

              <div className="flex-1 space-y-1.5">
                {pendingFile && (
                  <FileChip
                    file={pendingFile.meta}
                    onRemove={() => setPendingFile(null)}
                  />
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isUploadQuestion
                        ? "Datei wählen oder überspringen (Enter)"
                        : (currentQuestion?.placeholder ?? "Ihre Antwort …")
                    }
                    className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    onClick={() => submitAnswer(inputValue)}
                    disabled={
                      !pendingFile && !inputValue.trim() && currentQuestion?.type !== "upload"
                    }
                    className="shrink-0 p-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
