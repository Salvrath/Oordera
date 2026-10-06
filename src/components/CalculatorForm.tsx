import { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";

export interface CalcResult {
  minimumRate: number;
  recommendedRate: number;
  yearlySalary: number;
  totalCost: number;
  billableHours: number;
  vatAdjustedRate: number;
  riskRate: number;
  monthlySalary: number;
}

export interface CalcInputs {
  monthlySalary: string;
  vacationWeeks: string;
  billableHours: string;
  utilization: string;
  businessType: string;
  fixedMonthlyCosts: string;
  extraMargin: string;
}

interface Props {
  onResult: (result: CalcResult, inputs: CalcInputs) => void;
}

const CalculatorForm = ({ onResult }: Props) => {
  const [monthlySalary, setMonthlySalary] = useState<string>("45000");
  const [vacationWeeks, setVacationWeeks] = useState<string>("5");
  const [billableHours, setBillableHours] = useState<string>("32");
  const [utilization, setUtilization] = useState<string>("80");
  const [businessType, setBusinessType] = useState<"ef" | "ab">("ab");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [fixedMonthlyCosts, setFixedMonthlyCosts] = useState<string>("0");
  const [extraMargin, setExtraMargin] = useState<string>("10");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const salary = Number(monthlySalary);
    const vacation = Number(vacationWeeks);
    const hours = Number(billableHours);
    const utilizationPct = Number(utilization) / 100;
    const fixedCosts = Number(fixedMonthlyCosts) || 0;
    const marginPct = Number(extraMargin) / 100;

    const yearlySalary = salary * 12;
    const socialFees = yearlySalary * 0.31;
    const overhead = (yearlySalary + socialFees) * 0.1;
    const yearlyFixedCosts = fixedCosts * 12;
    const totalCost = yearlySalary + socialFees + overhead + yearlyFixedCosts;
    const totalBillableHours = Math.round((52 - vacation) * hours * utilizationPct);
    const minimumRate = Math.round(totalCost / totalBillableHours);
    const recommendedRate = Math.round(minimumRate * (1 + marginPct));
    const vatAdjustedRate = Math.round(recommendedRate * 1.25);
    const riskBillable = Math.round(totalBillableHours * 0.9);
    const riskRate = Math.round(totalCost / riskBillable);

    onResult({
      minimumRate,
      recommendedRate,
      yearlySalary,
      totalCost,
      billableHours: totalBillableHours,
      vatAdjustedRate,
      riskRate,
      monthlySalary: salary,
    }, {
      monthlySalary,
      vacationWeeks,
      billableHours,
      utilization,
      businessType,
      fixedMonthlyCosts,
      extraMargin,
    });
  };

  const inputClasses =
    "w-full rounded-lg border border-border bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-sans";

  return (
    <section className="py-10 sm:py-16 px-4 sm:px-6">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold font-heading text-center mb-2">
            Din kalkyl
          </h2>
          <p className="text-muted-foreground text-center mb-6 sm:mb-10">
            Fyll i dina uppgifter nedan
          </p>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 bg-gradient-card rounded-2xl border border-border p-8"
          >
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Önskad månadslön före skatt (SEK)
              </label>
              <input
                type="number"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                className={inputClasses}
                placeholder="45 000"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Semesterveckor per år
              </label>
              <input
                type="number"
                value={vacationWeeks}
                onChange={(e) => setVacationWeeks(e.target.value)}
                className={inputClasses}
                placeholder="5"
                min="0"
                max="52"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Debiterbara timmar per vecka
              </label>
              <input
                type="number"
                value={billableHours}
                onChange={(e) => setBillableHours(e.target.value)}
                className={inputClasses}
                placeholder="32"
                min="1"
                max="60"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Beläggningsgrad: {utilization}%
              </label>
              <Slider
                value={[Number(utilization)]}
                onValueChange={(v) => setUtilization(String(v[0]))}
                min={50}
                max={100}
                step={1}
                className="py-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                75–85% är vanligt för konsulter. Lägre beläggning kräver högre timpris.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Företagsform
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBusinessType("ef")}
                  className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                    businessType === "ef"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  Enskild firma
                </button>
                <button
                  type="button"
                  onClick={() => setBusinessType("ab")}
                  className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                    businessType === "ab"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  Aktiebolag (AB)
                </button>
              </div>
            </div>

            {/* Advanced settings */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2">
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${advancedOpen ? "rotate-180" : ""}`} />
                Avancerade inställningar (valfritt)
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-5 pt-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Fasta månadskostnader (SEK)
                  </label>
                  <input
                    type="number"
                    value={fixedMonthlyCosts}
                    onChange={(e) => setFixedMonthlyCosts(e.target.value)}
                    className={inputClasses}
                    placeholder="0"
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Exempel: redovisning, programvaror, kontor, försäkringar.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Extra säkerhetsmarginal (%)
                  </label>
                  <input
                    type="number"
                    value={extraMargin}
                    onChange={(e) => setExtraMargin(e.target.value)}
                    className={inputClasses}
                    placeholder="10"
                    min="0"
                    max="100"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <motion.button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-lg py-4 glow-gold transition-all hover:brightness-110"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Calculator className="w-5 h-5" />
              Räkna ut mitt timpris
            </motion.button>
          </form>
        </motion.div>
      </div>
    </section>
  );
};

export default CalculatorForm;