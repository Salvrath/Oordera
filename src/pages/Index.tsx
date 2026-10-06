import { useRef, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Hero from "@/components/Hero";
import CalculatorForm, { type CalcResult, type CalcInputs } from "@/components/CalculatorForm";
import Results from "@/components/Results";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CALC_STORAGE_KEY = "timpris_calc_data";
const PAID_STORAGE_KEY = "timpris_paid";

const Index = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(PAID_STORAGE_KEY) === "true");
  const [calcInputs, setCalcInputs] = useState<CalcInputs | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const scrollToSection = () => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Restore calculator data from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CALC_STORAGE_KEY);
    if (stored) {
      try {
        const { result: savedResult } = JSON.parse(stored);
        if (savedResult) {
          setResult(savedResult);
          setShowResult(true);
        }
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  // Verify Stripe session on return
  useEffect(() => {
    const sid = searchParams.get("session_id");
    if (sid && !unlocked) {
      (async () => {
        try {
          // Get stored calculator data
          const stored = localStorage.getItem(CALC_STORAGE_KEY);
          let calcInputs = {};
          let calcResults = {};
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              calcInputs = parsed.inputs || {};
              calcResults = parsed.result || {};
              if (parsed.result) {
                setResult(parsed.result);
                setShowResult(true);
              }
            } catch { /* ignore */ }
          }

          const { data, error } = await supabase.functions.invoke("verify-payment", {
            body: {
              session_id: sid,
              calculator_inputs: calcInputs,
              calculator_results: calcResults,
            },
          });
          if (!error && data?.verified) {
            setUnlocked(true);
            localStorage.setItem(PAID_STORAGE_KEY, "true");
            setSessionId(sid);

            // Fire Google Ads conversion once per purchase
            const conversionKey = `conversion_fired_${sid}`;
            if (!localStorage.getItem(conversionKey)) {
              if (typeof (window as any).gtag === "function") {
                (window as any).gtag("event", "conversion", {
                  send_to: "AW-17948812370/OD7qCLjHovcbENLI105C",
                  value: 149,
                  currency: "SEK",
                });
                console.log("Google conversion fired");
              }
              localStorage.setItem(conversionKey, "true");
            }

            toast({ title: "Betalning genomförd", description: "Full rapport upplåst." });

            // Clean URL
            searchParams.delete("session_id");
            searchParams.delete("payment");
            setSearchParams(searchParams, { replace: true });

            // Clean localStorage
            localStorage.removeItem(CALC_STORAGE_KEY);
          }
        } catch {
          console.error("Verification failed");
        }
      })();
    }
  }, [searchParams]);

  const handleResult = (r: CalcResult, inputs: CalcInputs) => {
    setResult(r);
    setCalcInputs(inputs);
    setShowResult(true);
  };

  const handleEditInputs = () => {
    setShowResult(false);
  };

  // Save calculator data to localStorage before payment redirect
  const handleSaveCalcData = () => {
    if (result && calcInputs) {
      localStorage.setItem(
        CALC_STORAGE_KEY,
        JSON.stringify({ result, inputs: calcInputs })
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Hero onCtaClick={scrollToSection} />

      <div ref={sectionRef} className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <CalculatorForm onResult={handleResult} />
            </motion.div>
          ) : result ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Results
                result={result}
                unlocked={unlocked}
                onUnlock={() => setUnlocked(true)}
                onEditInputs={handleEditInputs}
                sessionId={sessionId}
                onSaveCalcData={handleSaveCalcData}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <footer className="py-6 sm:py-10 text-center text-xs text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} TimprisKalkylator. Alla beräkningar är uppskattningar.
      </footer>
    </div>
  );
};

export default Index;