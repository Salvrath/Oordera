import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

const Hero = ({ onCtaClick }: { onCtaClick: () => void }) => {
  return (
    <section className="relative min-h-[70vh] sm:min-h-[80vh] flex items-center justify-center bg-gradient-hero overflow-hidden pt-8 sm:pt-12">
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-heading leading-tight mb-6">
            Tar du för lite betalt{" "}
            <span className="text-gradient-gold">som konsult?</span>
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground max-w-xl mx-auto mb-6 sm:mb-10 leading-relaxed">
            De flesta svenska konsulter underskattar sitt timpris med 10–30%.
            Räkna ut vad du faktiskt måste ta för att nå din lön.
          </p>

          <motion.button
            onClick={onCtaClick}
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-lg glow-gold transition-all hover:scale-105"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            Räkna ut mitt riktiga timpris
            <ArrowDown className="w-5 h-5 transition-transform group-hover:translate-y-1" />
          </motion.button>

          <p className="mt-4 text-sm text-muted-foreground">
            Anpassad för svenska skatter och bolagsformer 2026.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;