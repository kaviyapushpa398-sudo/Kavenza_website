import { useRef } from "react";
import {
  m,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight, ArrowDown } from "lucide-react";
import { Container } from "../components/Container";
import { Button } from "../components/Button";

const easeKav = [0.16, 1, 0.3, 1] as const;

const headlineLines = ["WE BUILD", "IDEAS INTO REALITY."];

/**
 * Cinematic hero. Kept deliberately restrained: no particles, no 3D,
 * no loud gradients — just type, motion, and a very subtle spotlight
 * that tracks the cursor.
 */
export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Keep the atmospheric spotlight on fine pointers; it is decorative only.
  const spotlightX = useMotionValue(0);
  const spotlightY = useMotionValue(0);
  const spotlightOpacity = useMotionValue(0);

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    if (
      prefersReducedMotion ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    spotlightX.set(event.clientX - bounds.left - 288);
    spotlightY.set(event.clientY - bounds.top - 288);
    spotlightOpacity.set(1);
  };

  // Subtle parallax as the hero scrolls out of view.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 48]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      id="top"
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => spotlightOpacity.set(0)}
      className="relative flex min-h-[85svh] items-center overflow-hidden bg-kav-bg pb-16 pt-20 sm:min-h-[90svh]"
    >
      {/* Atmospheric spotlight layer */}
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(200,168,116,0.06),transparent_70%)]"
        style={{ x: spotlightX, y: spotlightY, opacity: spotlightOpacity }}
      />

      {/* Faint static vignette to add depth without a loud gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(244,239,230,0.04),_transparent_60%)]"
      />

      <m.div
        style={{
          y: prefersReducedMotion ? 0 : contentY,
          opacity: prefersReducedMotion ? 1 : contentOpacity,
        }}
      >
        <Container className="relative flex flex-col gap-7 sm:gap-8">
          <m.span
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: easeKav }}
            className="text-xs font-medium uppercase tracking-[0.32em] text-kav-gold"
          >
            KAVENZA&reg; | Technology &amp; Innovation
          </m.span>

          <h1 className="font-display flex flex-col text-5xl uppercase leading-[1.05] text-kav-ivory sm:text-6xl md:text-7xl lg:text-8xl">
            {headlineLines.map((line, index) => (
              <span key={line} className="overflow-hidden py-1">
                <m.span
                  initial={prefersReducedMotion ? false : { y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 0.9, delay: 0.15 + index * 0.12, ease: easeKav }}
                  className="block"
                >
                  {line}
                </m.span>
              </span>
            ))}
          </h1>

          <m.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease: easeKav }}
            className="text-sm font-medium uppercase tracking-[0.28em] text-kav-gold-soft sm:text-base"
          >
            AI. Software. Digital Products.
          </m.p>

          <m.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65, ease: easeKav }}
            className="max-w-xl text-base leading-relaxed text-kav-secondary sm:text-lg"
          >
            KAVENZA is a technology company building intelligent software and
            digital products designed to solve meaningful real-world problems.
          </m.p>

          <m.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.78, ease: easeKav }}
            className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center"
          >
            <Button href="#products" variant="primary">
              Explore Our Work
              <ArrowRight
                size={16}
                className="transition-transform duration-300 ease-out group-hover:translate-x-1"
              />
            </Button>
            <Button href="#contact" variant="secondary">
              Work With Us
              <ArrowRight
                size={16}
                className="text-kav-gold transition-transform duration-300 ease-out group-hover:translate-x-1"
              />
            </Button>
          </m.div>
        </Container>
      </m.div>

      {/* Scroll indicator */}
      <m.div
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.1, ease: easeKav }}
        className="absolute inset-x-0 bottom-8 hidden flex-col items-center gap-2 text-kav-muted md:flex"
        aria-hidden="true"
      >
        <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
        <m.div
          animate={prefersReducedMotion ? { y: 0 } : { y: [0, 6, 0] }}
          transition={{
            duration: 1.8,
            repeat: prefersReducedMotion ? 0 : Infinity,
            ease: "easeInOut",
          }}
        >
          <ArrowDown size={14} />
        </m.div>
      </m.div>
    </section>
  );
}
