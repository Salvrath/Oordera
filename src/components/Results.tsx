import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CalcResult } from "./CalculatorForm";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  TrendingUp,
  Shield,
  AlertTriangle,
  FileText,
  Lock,
  Loader2,
  Check,
  Download,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);

const calcDiff = (r: CalcResult) => {
  const diff = r.recommendedRate - r.minimumRate;
  return { diff, yearlyImpact: diff * r.billableHours };
};

interface Props {
  result: CalcResult;
  unlocked: boolean;
  onUnlock: () => void;
  onEditInputs: () => void;
  sessionId: string | null;
  onSaveCalcData: () => void;
}

const Results = ({ result, unlocked, onUnlock, onEditInputs, sessionId, onSaveCalcData }: Props) => {
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const { diff, yearlyImpact } = calcDiff(result);

  // Scroll to top of results on mount
  useEffect(() => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Sticky CTA visibility on mobile
  useEffect(() => {
    if (!isMobile || unlocked) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    const el = paymentRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [isMobile, unlocked]);

  const handleUnlock = async () => {
    setLoading(true);
    try {
      // Save calc data to localStorage before redirect
      onSaveCalcData();

      const { data, error } = await supabase.functions.invoke("create-payment");
      if (error) throw error;
      if (data?.url) {
        try {
          const parsed = new URL(data.url);
          if (parsed.protocol === "https:" && parsed.hostname.endsWith("stripe.com")) {
            window.location.href = data.url;
          } else {
            console.error("Invalid payment URL domain");
          }
        } catch {
          console.error("Invalid payment URL format");
        }
      }
    } catch (e) {
      console.error("Payment error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!sessionId) return;
    setPdfLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-pdf", {
        body: { session_id: sessionId },
      });

      if (error) throw error;

      // The response is a PDF blob
      const blob = new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "timpris-analys.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF download error:", e);
    } finally {
      setPdfLoading(false);
    }
  };

  const valuePoints = [
    "Årlig riskanalys i kronor",
    "Beläggningsjämförelse 70–100%",
    "Trygghetsmarginal per år",
    "Förhandlingsstrategi steg-för-steg",
    "Färdig konsultavtalsmall",
    "Nedladdningsbar PDF (6 sidor)",
  ];

  const faqItems = [
    { q: "Är beräkningen korrekt?", a: "Ja. Kalkylen är baserad på svenska skatteregler, sociala avgifter och realistiska antaganden för konsulter i Sverige." },
    { q: "Fungerar detta för både AB och enskild firma?", a: "Ja. Du kan välja bolagsform i kalkylatorn och uträkningen anpassas därefter." },
    { q: "Är detta en prenumeration?", a: "Nej. Det är en engångsbetalning på 149 kr. Du får direkt tillgång till full analys och PDF." },
    { q: "Vad händer efter betalning?", a: "Du får omedelbar tillgång till hela analysen samt möjlighet att ladda ner din personliga PDF-rapport och konsultavtal." },
  ];

  return (
    <>
      <section ref={sectionRef} className="py-5 sm:py-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto space-y-3.5 sm:space-y-5">
          {/* Main results */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-card rounded-2xl border border-border p-4 sm:p-7 text-center"
          >
          <p className="text-[10px] sm:text-xs uppercase tracking-widest text-primary font-semibold mb-1.5">Snabb uppskattning (gratis)</p>
            <h2 className="text-base sm:text-2xl font-heading font-bold mb-1 sm:mb-2">
              Ditt beräknade timpris
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground mb-3 sm:mb-5">
              Baserat på dina svar – exakt pris i full analys
            </p>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-5 mb-3 sm:mb-5">
              <div className="rounded-xl bg-secondary/20 border border-border/30 p-2.5 sm:p-5 opacity-60">
                <p className="text-[10px] sm:text-xs text-muted-foreground/70 mb-0.5">Minsta timpris</p>
                <p className="text-lg sm:text-3xl font-heading font-bold text-muted-foreground/70">
                  {fmt(result.minimumRate)}
                  <span className="text-[10px] sm:text-base text-muted-foreground/50"> kr/h</span>
                </p>
              </div>
              <div className="rounded-xl border-2 border-primary bg-primary/8 p-2.5 sm:p-5 glow-gold relative shadow-lg shadow-primary/10">
                <p className="text-[10px] sm:text-xs text-primary mb-0.5 font-semibold uppercase tracking-wider">Rekommenderat intervall</p>
                <p className="text-[10px] sm:text-sm text-primary/80 mb-0.5">Ditt riktpris</p>
                {unlocked ? (
                  <p className="text-2xl sm:text-5xl font-heading font-bold text-gradient-gold">
                    {fmt(result.recommendedRate)}
                    <span className="text-xs sm:text-lg"> kr/h</span>
                  </p>
                ) : (
                  <p className="text-2xl sm:text-5xl font-heading font-bold text-gradient-gold">
                    {fmt(Math.round(result.recommendedRate * 0.9))}–{fmt(Math.round(result.recommendedRate * 1.1))}
                    <span className="text-xs sm:text-lg"> kr/h</span>
                  </p>
                )}
              </div>
            </div>

            {/* Salary reference */}
            <p className="text-xs sm:text-base text-foreground/80 mb-3 leading-snug">
              Detta är vad du behöver ta för att nå din månadslön på{" "}
              <span className="font-bold text-foreground">{fmt(result.monthlySalary)} kr</span>.
            </p>

            {/* Margin messaging */}
            {diff > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-xl border border-primary/30 bg-primary/5 p-2.5 sm:p-4 mb-3 text-left"
              >
                {unlocked ? (
                  <>
                    <p className="text-xs sm:text-sm font-medium text-foreground leading-snug">
                      Skillnaden mellan minsta och rekommenderat timpris är{" "}
                      <span className="text-primary font-extrabold">{fmt(diff)} kr</span> per timme.
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-snug">
                      Det motsvarar cirka{" "}
                      <span className="font-extrabold text-foreground">{fmt(yearlyImpact)} kr</span> per
                      år i extra marginal för sjukdagar, tomma veckor och oförutsedda kostnader.
                    </p>
                  </>
                ) : (
                  <p className="text-xs sm:text-sm font-medium text-foreground leading-snug">
                    Det finns en tydlig skillnad mellan ditt lägsta och rekommenderade timpris – den kan kosta dig tiotusentals kronor per år i utebliven marginal.
                  </p>
                )}
              </motion.div>
            )}

            <div className="text-left space-y-1.5 text-[11px] sm:text-sm text-muted-foreground">
              <div className="flex items-start gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                <p className="leading-snug">
                  Baserat på {fmt(result.monthlySalary)} kr/mån,{" "}
                  {fmt(result.billableHours)} fakturerbara timmar per år och 31%
                  sociala avgifter + 10% overhead.
                </p>
              </div>
              <div className="flex items-start gap-1.5">
                <Shield className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                <p className="leading-snug">
                  Rekommenderat pris inkluderar 10% marginal för oförutsedda
                  kostnader.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Dynamic risk warning – item 3 */}
          {!unlocked && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-xl border border-destructive/50 bg-destructive/5 p-3 sm:p-4 text-center"
            >
              <div className="flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-destructive" />
                <p className="text-xs sm:text-sm font-semibold leading-snug text-destructive">
                  Utan exakt analys riskerar du att sätta fel pris – och förlora tiotusentals kronor per år.
                </p>
              </div>
            </motion.div>
          )}

          {/* Target audience micro-copy */}
          <p className="text-[11px] sm:text-sm text-muted-foreground text-center leading-snug">
            För frilansare, konsulter och egenföretagare som vill sätta rätt timpris utan att under- eller överdebitera.
          </p>

          {/* Social proof + secondary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-center space-y-2.5"
          >
            <p className="text-xs sm:text-base font-medium text-foreground/90 italic">
              "De flesta svenska konsulter underskattar sitt timpris med 10–30%."
            </p>
            {!unlocked && (
              <motion.button
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm sm:text-base glow-gold"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  document.getElementById("payment-section")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Lock className="w-4 h-4" />
                Få exakt timpris + förhandlingsmanus – 149 kr
              </motion.button>
            )}
          </motion.div>

          {/* Locked report teaser */}
          {!unlocked && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="rounded-2xl border border-border bg-gradient-card p-4 sm:p-6 space-y-2"
            >
              <h3 className="text-sm sm:text-lg font-heading font-bold flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                Full rapport (låst)
              </h3>
              <div className="space-y-1.5">
                {[
                  "Detaljerad timpriskalkyl",
                  "Hur ditt pris står sig mot marknaden",
                  "Rekommenderad debiteringsstrategi",
                  "Vanliga misstag som kostar konsulter pengar",
                ].map((heading) => (
                  <div key={heading} className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2 blur-[2px] select-none pointer-events-none">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    <p className="text-xs sm:text-sm text-muted-foreground/60">{heading}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground text-center pt-1">
                Professionellt beslutsunderlag – engångsbetalning 149 kr
              </p>
            </motion.div>
          )}

          {/* Edit inputs button */}
          <div className="text-center">
            <button
              onClick={onEditInputs}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Ändra uppgifter
            </button>
          </div>

          {/* Premium section */}
          <motion.div
            ref={paymentRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="relative"
            id="payment-section"
          >
            <div className="bg-gradient-card rounded-2xl border border-border p-4 sm:p-7 overflow-hidden">
              {/* Post-payment badge – item 4 */}
              {unlocked && (
                <div className="mb-3">
                  <Badge className="bg-primary/15 text-primary border-primary/30 text-xs sm:text-sm px-3 py-1">
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Betalning genomförd – Full rapport upplåst
                  </Badge>
                </div>
              )}

              <h3 className="text-sm sm:text-xl font-heading font-bold mb-1.5 flex items-center gap-2">
                {!unlocked && <Lock className="w-4 h-4 text-primary" />}
                {unlocked ? "Din fullständiga analys" : "Se exakt hur mycket du riskerar att förlora"}
              </h3>

              {!unlocked && (
                <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                  De flesta konsulter gör fel här – exakt hur mycket och hur du förklarar ditt pris för kund visas i full analysen.
                </p>
              )}

              <div
                className={unlocked ? "space-y-2.5" : "blur-lock space-y-2.5"}
                aria-hidden={!unlocked}
              >
                <div className="rounded-xl bg-secondary/50 p-2.5 sm:p-3.5">
                  <p className="text-xs sm:text-sm text-muted-foreground">Timpris inkl. moms (25%)</p>
                  <p className="text-lg sm:text-2xl font-heading font-bold">{fmt(result.vatAdjustedRate)} kr/h</p>
                </div>

                <div className="rounded-xl bg-secondary/50 p-2.5 sm:p-3.5 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Riskscenario: 10% färre fakturerbara timmar</p>
                    <p className="text-lg sm:text-2xl font-heading font-bold">{fmt(result.riskRate)} kr/h</p>
                  </div>
                </div>

                <div className="rounded-xl bg-secondary/50 p-2.5 sm:p-3.5">
                  <p className="text-xs sm:text-sm text-muted-foreground">Inkomstjämförelse: Anställd vs. konsult</p>
                  <p className="text-xs sm:text-base">
                    Som anställd: {fmt(result.monthlySalary)} kr/mån — som konsult
                    bör du fakturera minst {fmt(result.minimumRate * 160)} kr/mån
                  </p>
                </div>

                <div className="rounded-xl bg-secondary/50 p-2.5 sm:p-3.5">
                  <p className="font-medium text-xs sm:text-sm">Förhandlingsmanus</p>
                  <p className="text-[11px] sm:text-sm text-muted-foreground">
                    Steg-för-steg guide för att motivera ditt pris för kunder...
                  </p>
                </div>

                <div className="rounded-xl bg-secondary/50 p-2.5 sm:p-3.5 flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="font-medium text-xs sm:text-sm">Konsultavtalsmall (PDF)</p>
                    <p className="text-[11px] sm:text-sm text-muted-foreground">Ladda ner ett färdigt konsultavtal</p>
                  </div>
                </div>
              </div>

              {/* Overlay CTA – only when locked */}
              {!unlocked && (
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 sm:pb-7 bg-gradient-to-t from-background via-background/80 to-transparent rounded-2xl px-4">
                  {/* Value points – updated copy */}
                  <div className="mb-3 w-full max-w-sm text-left space-y-0.5">
                    {valuePoints.map((point) => (
                      <div key={point} className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                        <p className="text-[11px] sm:text-sm text-muted-foreground leading-snug">{point}</p>
                      </div>
                    ))}
                  </div>

                  <motion.button
                    className="inline-flex items-center gap-2 px-5 sm:px-8 py-3 sm:py-4 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm sm:text-lg glow-gold disabled:opacity-70 w-full sm:w-auto justify-center"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleUnlock}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Lock className="w-5 h-5" />
                    )}
                    Få exakt timpris + förhandlingsmanus – 149 kr
                  </motion.button>
                  
                  <p className="mt-2 text-[11px] text-muted-foreground/80 text-center italic">
                    Engångsbetalning. Inget abonnemang.
                  </p>

                  <p className="mt-2 text-[10px] sm:text-[11px] text-muted-foreground/60 text-center max-w-xs leading-snug">
                    Konsulter betalar ofta 1 000–2 000 kr för rådgivning kring prissättning. Den här rapporten ger dig ett beslutsunderlag direkt – för 149 kr.
                  </p>

                  <div className="mt-2 text-center space-y-0">
                    <div className="flex items-center justify-center gap-1.5">
                      <Check className="w-3 h-3 text-primary" />
                      <p className="text-[11px] text-muted-foreground">Direkt tillgång efter betalning</p>
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <Check className="w-3 h-3 text-primary" />
                      <p className="text-[11px] text-muted-foreground">Säker betalning via Stripe</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Post-payment actions – item 4 */}
              {unlocked && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 space-y-3"
                >
                  {/* Download PDF button */}
                  <button
                    onClick={handleDownloadPdf}
                    disabled={pdfLoading || !sessionId}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-base sm:text-lg py-3 sm:py-4 glow-gold disabled:opacity-70 transition-all hover:brightness-110"
                  >
                    {pdfLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                    Ladda ner din PDF-rapport
                  </button>

                  {/* New calculation link */}
                  <div className="text-center">
                    <button
                      onClick={onEditInputs}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Gör ny beräkning
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h3 className="text-sm sm:text-xl font-heading font-bold mb-2.5">Vanliga frågor</h3>
            <Accordion type="single" collapsible className="space-y-1">
              {faqItems.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="bg-gradient-card rounded-xl border border-border px-3.5 sm:px-5"
                >
                  <AccordionTrigger className="text-xs sm:text-base font-medium text-foreground hover:no-underline py-2.5 sm:py-4">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs sm:text-sm text-muted-foreground pb-2.5 sm:pb-4">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Sticky mobile CTA bar */}
      <AnimatePresence>
        {isMobile && !unlocked && showStickyBar && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-background/95 backdrop-blur-sm border-t border-border"
          >
            <button
              onClick={handleUnlock}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm glow-gold disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
               Få exakt timpris + förhandlingsmanus – 149 kr
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Results;