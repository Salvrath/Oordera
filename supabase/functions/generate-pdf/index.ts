import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);

/* ── Color palette ─────────────────────────────────────────── */
const NAVY = rgb(0.043, 0.122, 0.231);       // #0B1F3B
const NAVY_LIGHT = rgb(0.09, 0.16, 0.28);
const GOLD = rgb(0.76, 0.6, 0.2);
const GOLD_LIGHT = rgb(0.85, 0.72, 0.35);
const WHITE = rgb(1, 1, 1);
const LIGHT_GRAY = rgb(0.92, 0.92, 0.92);
const MUTED = rgb(0.55, 0.55, 0.6);
const TEXT_DARK = rgb(0.12, 0.12, 0.14);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 50; // margin
const CW = PAGE_W - 2 * M; // content width

/* ── Types ─────────────────────────────────────────────────── */
interface CalcResult {
  minimumRate: number;
  recommendedRate: number;
  yearlySalary: number;
  totalCost: number;
  billableHours: number;
  vatAdjustedRate: number;
  riskRate: number;
  monthlySalary: number;
}

interface CalcInputs {
  monthlySalary: string;
  vacationWeeks: string;
  billableHours: string;
  utilization: string;
  businessType: string;
  fixedMonthlyCosts: string;
  extraMargin: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();

    if (!session_id || typeof session_id !== "string" || !session_id.startsWith("cs_")) {
      return new Response(
        JSON.stringify({ error: "Invalid session ID" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: purchase, error: fetchError } = await supabaseAdmin
      .from("purchases")
      .select("*")
      .eq("stripe_session_id", session_id)
      .single();

    if (fetchError || !purchase) {
      return new Response(
        JSON.stringify({ error: "Purchase not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const r = purchase.calculator_results as CalcResult;
    const inp = purchase.calculator_inputs as CalcInputs;

    const diff = r.recommendedRate - r.minimumRate;
    const yearlyImpact = diff * r.billableHours;
    const utilNum = Number(inp.utilization);

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const now = new Date().toLocaleDateString("sv-SE");

    /* ── Helper functions ──────────────────────────────────── */
    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - M;

    const txt = (text: string, x: number, yy: number, size: number, f = font, color = TEXT_DARK) => {
      page.drawText(text, { x, y: yy, size, font: f, color });
    };

    const newPage = () => {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - M;
    };

    const ensureSpace = (needed: number) => {
      if (y < needed + M + 30) newPage();
    };

    const drawSep = (yy: number) => {
      page.drawLine({
        start: { x: M, y: yy },
        end: { x: PAGE_W - M, y: yy },
        thickness: 0.5,
        color: LIGHT_GRAY,
      });
    };

    const drawFooter = () => {
      const fy = 30;
      page.drawLine({
        start: { x: M, y: fy + 10 },
        end: { x: PAGE_W - M, y: fy + 10 },
        thickness: 0.4,
        color: LIGHT_GRAY,
      });
      txt("Timpriskalkylator.com  \u2013  Alla ber\u00e4kningar \u00e4r uppskattningar.", M, fy, 7, font, MUTED);
      const pageNum = pdfDoc.getPageCount();
      const numStr = `${pageNum}`;
      const numW = font.widthOfTextAtSize(numStr, 7);
      txt(numStr, PAGE_W - M - numW, fy, 7, font, MUTED);
    };

    const drawRect = (x: number, yy: number, w: number, h: number, color = NAVY) => {
      page.drawRectangle({ x, y: yy, width: w, height: h, color });
    };

    const wrapText = (text: string, maxW: number, size: number, f = font): string[] => {
      const words = text.split(" ");
      const lines: string[] = [];
      let cur = "";
      for (const word of words) {
        const test = cur ? `${cur} ${word}` : word;
        if (f.widthOfTextAtSize(test, size) > maxW) {
          if (cur) lines.push(cur);
          cur = word;
        } else {
          cur = test;
        }
      }
      if (cur) lines.push(cur);
      return lines;
    };

    const drawWrapped = (text: string, x: number, size: number, f = font, color = TEXT_DARK, maxW = CW - 20, lineH = size + 4) => {
      const lines = wrapText(text, maxW, size, f);
      for (const line of lines) {
        ensureSpace(20);
        txt(line, x, y, size, f, color);
        y -= lineH;
      }
    };

    const sectionTitle = (title: string) => {
      ensureSpace(40);
      y -= 8;
      txt(title, M, y, 15, fontBold, NAVY);
      y -= 6;
      drawSep(y);
      y -= 18;
    };

    /* ════════════════════════════════════════════════════════
       PAGE 1 – Executive Summary
       ════════════════════════════════════════════════════════ */

    // Dark header band
    drawRect(0, PAGE_H - 130, PAGE_W, 130, NAVY);
    txt("TimprisKalkylator", M, PAGE_H - 50, 26, fontBold, GOLD);
    txt("Din personliga timprisstrategi", M, PAGE_H - 72, 12, font, rgb(0.75, 0.78, 0.85));
    txt(`Genererad: ${now}`, M, PAGE_H - 90, 9, font, rgb(0.55, 0.58, 0.65));

    y = PAGE_H - 160;

    // Highlight box – recommended rate
    const boxH = 90;
    drawRect(M, y - boxH, CW, boxH, rgb(0.96, 0.94, 0.88));
    page.drawRectangle({ x: M, y: y - boxH, width: 4, height: boxH, color: GOLD });
    txt("REKOMMENDERAT TIMPRIS", M + 20, y - 25, 11, fontBold, MUTED);
    txt(`${fmt(r.recommendedRate)} kr/h`, M + 20, y - 52, 32, fontBold, NAVY);
    txt("exkl. moms", M + 20 + fontBold.widthOfTextAtSize(`${fmt(r.recommendedRate)} kr/h`, 32) + 8, y - 48, 11, font, MUTED);
    y -= boxH + 25;

    // Key metrics grid (2 columns)
    const metrics = [
      ["Minsta timpris", `${fmt(r.minimumRate)} kr/h`],
      ["Timpris inkl. moms", `${fmt(r.vatAdjustedRate)} kr/h`],
      ["\u00c5rlig trygghetsmarginal", `${fmt(yearlyImpact)} kr`],
      ["Fakturerbara timmar/\u00e5r", `${fmt(r.billableHours)}`],
      ["Bel\u00e4ggningsgrad", `${inp.utilization}%`],
      ["Total \u00e5rskostnad", `${fmt(r.totalCost)} kr`],
    ];

    const colW = CW / 2;
    for (let i = 0; i < metrics.length; i++) {
      const col = i % 2;
      if (col === 0 && i > 0) y -= 0;
      const x = M + col * colW;
      txt(metrics[i][0], x, y, 9, font, MUTED);
      y -= 14;
      txt(metrics[i][1], x, y, 13, fontBold, TEXT_DARK);
      if (col === 1) y -= 20;
      else y += 14; // reset for second column on same row
    }
    y -= 10;

    // Risk callout box
    y -= 15;
    const calloutH = 55;
    drawRect(M, y - calloutH, CW, calloutH, rgb(0.95, 0.92, 0.85));
    page.drawRectangle({ x: M, y: y - calloutH, width: 4, height: calloutH, color: rgb(0.8, 0.35, 0.2) });

    const riskLow = fmt(Math.round(yearlyImpact * 0.7));
    const riskHigh = fmt(Math.round(yearlyImpact * 1.5));
    txt("!  RISK", M + 18, y - 18, 10, fontBold, rgb(0.7, 0.25, 0.15));
    txt(
      `Om du debiterar under ditt rekommenderade pris riskerar du att f\u00f6rlora`,
      M + 18, y - 33, 10, font, TEXT_DARK
    );
    txt(
      `${riskLow}\u2013${riskHigh} kr per \u00e5r.`,
      M + 18, y - 46, 10, fontBold, TEXT_DARK
    );

    drawFooter();

    /* ════════════════════════════════════════════════════════
       PAGE 2 – Din ekonomiska modell
       ════════════════════════════════════════════════════════ */
    newPage();

    // Page header
    txt("Din ekonomiska modell", M, y, 20, fontBold, NAVY);
    y -= 30;

    sectionTitle("Dina inmatade v\u00e4rden");

    const inputPairs = [
      ["\u00d6nskad m\u00e5nadsl\u00f6n", `${fmt(Number(inp.monthlySalary))} kr`],
      ["Semesterveckor", inp.vacationWeeks],
      ["Debiterbara timmar/vecka", inp.billableHours],
      ["Bel\u00e4ggningsgrad", `${inp.utilization}%`],
      ["F\u00f6retagsform", inp.businessType === "ab" ? "Aktiebolag (AB)" : "Enskild firma"],
      ["Fasta m\u00e5nadskostnader", `${fmt(Number(inp.fixedMonthlyCosts || "0"))} kr`],
      ["Extra marginal", `${inp.extraMargin}%`],
    ];

    const labelCol = M + 10;
    const valueCol = M + CW / 2;
    for (const [label, value] of inputPairs) {
      txt(label, labelCol, y, 10, font, MUTED);
      txt(value, valueCol, y, 10, fontBold, TEXT_DARK);
      y -= 18;
    }
    y -= 15;

    sectionTitle("S\u00e5 r\u00e4knar modellen");

    const explanations = [
      ["\u00d6nskad l\u00f6n", `Din m\u00e5nadsl\u00f6n p\u00e5 ${fmt(Number(inp.monthlySalary))} kr motsvarar ${fmt(r.yearlySalary)} kr/\u00e5r.`],
      ["Sociala avgifter (31,42%)", "Arbetsgivaravgifter som m\u00e5ste t\u00e4ckas av ditt timpris."],
      ["Semester", `${inp.vacationWeeks} veckors semester minskar dina fakturerbara veckor.`],
      ["Bel\u00e4ggningsgrad", `Vid ${inp.utilization}% bel\u00e4ggning r\u00e4knar vi med att du fakturerar ${inp.utilization}% av tillg\u00e4nglig tid.`],
      ["Overhead (10%)", "Buffer f\u00f6r administration, utbildning och icke-fakturerbar tid."],
      ["S\u00e4kerhetsmarginal", `${inp.extraMargin}% extra marginal f\u00f6r att skapa ekonomisk trygghet.`],
    ];

    for (const [title, desc] of explanations) {
      txt(title, M + 10, y, 10, fontBold, NAVY);
      y -= 14;
      drawWrapped(desc, M + 10, 9, font, MUTED, CW - 20, 13);
      y -= 8;
    }

    drawFooter();

    /* ════════════════════════════════════════════════════════
       PAGE 3 – Riskanalys & Scenario
       ════════════════════════════════════════════════════════ */
    newPage();

    txt("Riskanalys", M, y, 20, fontBold, NAVY);
    y -= 30;

    sectionTitle("Scenarioanalys: f\u00e4rre fakturerbara timmar");

    // 10% fewer hours scenario
    const risk10Hours = Math.round(r.billableHours * 0.9);
    const risk10Rate = Math.round(r.totalCost / risk10Hours);
    const risk10Income = r.billableHours * r.recommendedRate - risk10Hours * r.recommendedRate;

    const scenarios = [
      ["Om dina timmar minskar med 10%", ""],
      ["Fakturerbara timmar", `${fmt(risk10Hours)} (ist\u00e4llet f\u00f6r ${fmt(r.billableHours)})`],
      ["N\u00f6dv\u00e4ndigt timpris", `${fmt(risk10Rate)} kr/h`],
      ["F\u00f6rlorad \u00e5rsinkomst", `${fmt(risk10Income)} kr`],
    ];

    for (let i = 0; i < scenarios.length; i++) {
      if (i === 0) {
        txt(scenarios[i][0], M + 10, y, 11, fontBold, TEXT_DARK);
        y -= 20;
      } else {
        txt(scenarios[i][0], M + 10, y, 10, font, MUTED);
        txt(scenarios[i][1], valueCol, y, 10, fontBold, TEXT_DARK);
        y -= 18;
      }
    }
    y -= 20;

    sectionTitle("Bel\u00e4ggningsgrad: j\u00e4mf\u00f6relse");

    // Table header
    const tCol1 = M + 10;
    const tCol2 = M + 140;
    const tCol3 = M + 280;
    const tCol4 = M + 380;

    txt("Bel\u00e4ggning", tCol1, y, 9, fontBold, MUTED);
    txt("Timmar/\u00e5r", tCol2, y, 9, fontBold, MUTED);
    txt("Minsta timpris", tCol3, y, 9, fontBold, MUTED);
    txt("\u00c5rsinkomst*", tCol4, y, 9, fontBold, MUTED);
    y -= 8;
    drawSep(y);
    y -= 14;

    const weeksWorked = 52 - Number(inp.vacationWeeks);
    const hoursPerWeek = Number(inp.billableHours);
    const rawHours = weeksWorked * hoursPerWeek;

    for (const pct of [70, 80, 90, 100]) {
      const h = Math.round(rawHours * (pct / 100));
      const rate = Math.round(r.totalCost / h);
      const income = h * r.recommendedRate;
      const isUser = pct === utilNum;

      const f = isUser ? fontBold : font;
      const c = isUser ? GOLD : TEXT_DARK;

      txt(`${pct}%${isUser ? " (din)" : ""}`, tCol1, y, 10, f, c);
      txt(fmt(h), tCol2, y, 10, f, c);
      txt(`${fmt(rate)} kr/h`, tCol3, y, 10, f, c);
      txt(`${fmt(income)} kr`, tCol4, y, 10, f, c);
      y -= 16;
    }
    y -= 8;
    txt("* Ber\u00e4knat p\u00e5 rekommenderat timpris", M + 10, y, 7, fontOblique, MUTED);

    drawFooter();

    /* ════════════════════════════════════════════════════════
       PAGE 4 – Förhandlingsstrategi
       ════════════════════════════════════════════════════════ */
    newPage();

    txt("F\u00f6rhandlingsstrategi", M, y, 20, fontBold, NAVY);
    y -= 10;
    txt("Strategi f\u00f6r att motivera ditt pris", M, y, 11, font, MUTED);
    y -= 25;

    const sections = [
      {
        title: "1. Positionering",
        body: "B\u00f6rja alltid med v\u00e4rdet du levererar \u2013 inte priset. Beskriv vilka problem du l\u00f6ser, vilken erfarenhet du har och vilka resultat du tidigare levererat. L\u00e5t kunden f\u00f6rst\u00e5 ROI innan priset diskuteras.",
      },
      {
        title: "2. Prisf\u00f6rklaring",
        body: `Presentera ditt pris tryggt: \"Mitt timpris \u00e4r ${fmt(r.recommendedRate)} kr exkl. moms.\" F\u00f6rklara att priset inkluderar sociala avgifter, semester, administration och en rimlig vinstmarginal. N\u00e4mn att timpriset inkl. moms blir ${fmt(r.vatAdjustedRate)} kr \u2013 momsen drar kunden av.`,
      },
      {
        title: "3. Vanliga inv\u00e4ndningar",
        body: `\"Det \u00e4r f\u00f6r dyrt\" \u2013 J\u00e4mf\u00f6r med kostnaden f\u00f6r en heltidsanst\u00e4lld (l\u00f6n, arbetsgivaravgifter, semester, sjukfr\u00e5nvaro, utrustning). Din kostnad \u00e4r ofta l\u00e4gre. \"Andra tar mindre\" \u2013 Billigare konsulter inneb\u00e4r ofta l\u00e4ngre leveranstid, f\u00e4rre erfarenhet och h\u00f6gre total kostnad.`,
      },
      {
        title: "4. N\u00e4r du ska s\u00e4ga nej",
        body: `Tacka alltid nej till priser under ditt minimipris p\u00e5 ${fmt(r.minimumRate)} kr/h. Att arbeta under din breakeven-punkt inneb\u00e4r att du f\u00f6rlorar pengar p\u00e5 varje fakturerad timme. Det \u00e4r b\u00e4ttre att investera tiden i att hitta r\u00e4tt kunder.`,
      },
      {
        title: "5. Paketpriss\u00e4ttning",
        body: "Erbjud paketpriser f\u00f6r st\u00f6rre uppdrag om kunden vill ha f\u00f6ruts\u00e4gbarhet. Ber\u00e4kna alltid baserat p\u00e5 ditt rekommenderade timpris \u2013 aldrig l\u00e4gre. Inkludera tydlig scope-definition f\u00f6r att undvika scope creep.",
      },
    ];

    for (const s of sections) {
      ensureSpace(80);
      txt(s.title, M + 10, y, 12, fontBold, NAVY);
      y -= 16;
      drawWrapped(s.body, M + 10, 9.5, font, TEXT_DARK, CW - 30, 14);
      y -= 12;
    }

    drawFooter();

    /* ════════════════════════════════════════════════════════
       PAGE 5–6 – Konsultavtalsmall
       ════════════════════════════════════════════════════════ */
    newPage();

    txt("Konsultavtalsmall", M, y, 20, fontBold, NAVY);
    y -= 10;
    txt("Mall / Utkast \u2013 anpassa efter dina behov", M, y, 9, fontOblique, MUTED);
    y -= 25;

    drawRect(M, y - 20, CW, 20, rgb(0.96, 0.94, 0.88));
    txt("KONSULTAVTAL", M + 10, y - 15, 11, fontBold, NAVY);
    y -= 35;

    const agreementSections = [
      {
        title: "1. Parter",
        lines: [
          "Uppdragsgivare: [F\u00f6retagsnamn], org.nr [xxxxxx-xxxx], (\"Kunden\")",
          "Konsult: [Ditt f\u00f6retagsnamn], org.nr [xxxxxx-xxxx], (\"Konsulten\")",
        ],
      },
      {
        title: "2. Uppdragets omfattning",
        lines: [
          "Konsulten \u00e5tar sig att utf\u00f6ra [beskrivning av tj\u00e4nster/uppdrag].",
          "Uppdraget genomf\u00f6rs p\u00e5 [plats/distans] enligt \u00f6verenskommet schema.",
          "F\u00f6r\u00e4ndringar i uppdragets omfattning ska avtalas skriftligen.",
        ],
      },
      {
        title: "3. Ers\u00e4ttning & fakturering",
        lines: [
          `Timpris: ${fmt(r.recommendedRate)} kr exkl. moms.`,
          "Fakturering sker m\u00e5nadsvis i efterskott baserat p\u00e5 rapporterade timmar.",
          "Moms (25%) tillkommer.",
        ],
      },
      {
        title: "4. Betalningsvillkor",
        lines: [
          "Betalning ska ske inom 30 dagar fr\u00e5n fakturadatum.",
          "Vid f\u00f6rsenad betalning utg\u00e5r dr\u00f6jsm\u00e5lsr\u00e4nta enligt r\u00e4ntelagen.",
        ],
      },
      {
        title: "5. Immateriella r\u00e4ttigheter",
        lines: [
          "Samtliga immateriella r\u00e4ttigheter till resultat framtagna inom uppdraget",
          "\u00f6verg\u00e5r till Kunden efter full betalning, om inte annat avtalats.",
          "Konsulten beh\u00e5ller r\u00e4tten att anv\u00e4nda generella kunskaper och metoder.",
        ],
      },
      {
        title: "6. Sekretess",
        lines: [
          "Parterna f\u00f6rbinder sig att inte r\u00f6ja konfidentiell information till tredje part.",
          "Sekretesskyldigheten g\u00e4ller under avtalsperioden och tv\u00e5 (\u00e5r) d\u00e4refter.",
        ],
      },
      {
        title: "7. Ansvarsbegr\u00e4nsning",
        lines: [
          "Konsultens ansvar \u00e4r begr\u00e4nsat till det totala arvode som betalats under avtalet.",
          "Konsulten ansvarar inte f\u00f6r indirekta skador eller utebliven vinst.",
        ],
      },
      {
        title: "8. Force majeure",
        lines: [
          "Part \u00e4r befriad fr\u00e5n ansvar vid omst\u00e4ndigheter utanf\u00f6r partens kontroll",
          "som v\u00e4sentligt f\u00f6rsv\u00e5rar fullg\u00f6rande av avtalade f\u00f6rpliktelser.",
        ],
      },
      {
        title: "9. Avtalstid & upps\u00e4gning",
        lines: [
          "Avtalet g\u00e4ller fr\u00e5n [startdatum] till [slutdatum].",
          "Upps\u00e4gning ska ske skriftligen med minst 30 dagars varsel.",
        ],
      },
      {
        title: "10. Till\u00e4mplig lag & tvister",
        lines: [
          "Avtalet lyder under svensk lag.",
          "Tvister ska i f\u00f6rsta hand l\u00f6sas genom f\u00f6rhandling,",
          "i andra hand genom allm\u00e4n domstol.",
        ],
      },
      {
        title: "11. Underskrifter",
        lines: [
          "",
          "Ort och datum: ___________________________",
          "",
          "Uppdragsgivare: ___________________________",
          "",
          "Konsult: ___________________________",
        ],
      },
    ];

    for (const section of agreementSections) {
      ensureSpace(60);
      txt(section.title, M + 10, y, 11, fontBold, NAVY);
      y -= 16;
      for (const line of section.lines) {
        ensureSpace(16);
        if (line === "") {
          y -= 6;
        } else {
          txt(line, M + 20, y, 9, font, TEXT_DARK);
          y -= 13;
        }
      }
      y -= 8;
    }

    // Final closing section
    y -= 20;
    ensureSpace(80);
    drawSep(y);
    y -= 25;

    const closingText = "Denna rapport \u00e4r framtagen f\u00f6r att hj\u00e4lpa dig ta r\u00e4tt betalt och skapa l\u00e5ngsiktig stabilitet i din konsultverksamhet.";
    drawWrapped(closingText, M + 10, 10, fontOblique, MUTED, CW - 20, 14);

    drawFooter();

    /* ── Save & upload ─────────────────────────────────────── */
    const pdfBytes = await pdfDoc.save();

    const fileName = `${session_id}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("purchase-pdfs")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("PDF upload error:", uploadError);
    } else {
      await supabaseAdmin
        .from("purchases")
        .update({ pdf_url: fileName })
        .eq("stripe_session_id", session_id);
    }

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="timpris-analys.pdf"`,
      },
      status: 200,
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return new Response(
      JSON.stringify({ error: "PDF generation failed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});