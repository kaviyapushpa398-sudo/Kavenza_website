import { useId, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Container } from "../components/Container";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import { technologies } from "../data/technologies";

const easeKav = [0.16, 1, 0.3, 1] as const;
const TOTAL = technologies.length;
const RADIUS = 40; // percent of the square container

/** Evenly spaced points on a circle, starting at the top, going clockwise. */
function nodePosition(index: number) {
  const angle = (index / TOTAL) * 2 * Math.PI - Math.PI / 2;
  return {
    x: 50 + RADIUS * Math.cos(angle),
    y: 50 + RADIUS * Math.sin(angle),
  };
}

function InfoPanel({ activeIndex }: { activeIndex: number | null }) {
  const active = activeIndex !== null ? technologies[activeIndex] : null;

  return (
    <div aria-live="polite" className="flex min-h-[5rem] flex-col gap-2">
      <AnimatePresence mode="wait">
        <m.div
          key={active?.name ?? "default"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: easeKav }}
        >
          {active ? (
            <>
              <h3 className="text-sm uppercase tracking-[0.2em] text-kav-gold">{active.name}</h3>
              <p className="mt-2 max-w-md text-base leading-relaxed text-kav-secondary">
                {active.description}
              </p>
            </>
          ) : (
            <p className="max-w-md text-base leading-relaxed text-kav-muted">
              Select a technology to see how we use it.
            </p>
          )}
        </m.div>
      </AnimatePresence>
    </div>
  );
}

/** Desktop / tablet: an interactive constellation radiating from KAVENZA. */
function ConstellationDesktop({
  activeIndex,
  onSelect,
  onClear,
}: {
  activeIndex: number | null;
  onSelect: (i: number | null) => void;
  onClear: () => void;
}) {
  const panelId = useId();

  return (
    <div className="hidden flex-col items-center gap-6 lg:flex">
      <div
        className="relative aspect-square w-full max-w-sm"
        onMouseLeave={onClear}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {technologies.map((tech, i) => {
            const { x, y } = nodePosition(i);
            const isActive = activeIndex === i;
            return (
              <line
                key={tech.name}
                x1={50}
                y1={50}
                x2={x}
                y2={y}
                stroke={isActive ? "var(--color-kav-gold)" : "var(--color-kav-border-strong)"}
                strokeWidth={isActive ? 0.35 : 0.15}
                className="transition-all duration-500 ease-out"
              />
            );
          })}
        </svg>

        {/* Central node */}
        <div
          className="absolute flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-kav-border-gold bg-kav-surface text-center"
          style={{ left: "50%", top: "50%" }}
        >
          <span className="font-display text-xs uppercase tracking-[0.15em] text-kav-ivory">
            Kavenza
          </span>
        </div>

        {technologies.map((tech, i) => {
          const { x, y } = nodePosition(i);
          const isActive = activeIndex === i;
          return (
            <m.button
              key={tech.name}
              type="button"
              id={`tech-node-${i}`}
              aria-expanded={isActive}
              aria-controls={panelId}
              onMouseEnter={() => onSelect(i)}
              onFocus={() => onSelect(i)}
              onClick={() => onSelect(i)}
              whileHover={{ y: -3, scale: 1.04 }}
              whileFocus={{ y: -3, scale: 1.04 }}
              transition={{ duration: 0.25, ease: easeKav }}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <span
                className={`block h-3 w-3 rounded-full border transition-all duration-300 ease-out ${
                  isActive
                    ? "scale-125 border-kav-gold bg-kav-gold shadow-[0_0_0_6px_rgba(200,168,116,0.12)]"
                    : "border-kav-border-strong bg-kav-bg-elevated"
                }`}
              />
              <span
                className={`whitespace-nowrap text-xs tracking-wide transition-colors duration-300 ${
                  isActive ? "text-kav-ivory" : "text-kav-muted"
                }`}
              >
                {tech.name}
              </span>
            </m.button>
          );
        })}
      </div>

      <div id={panelId} role="status" className="text-center">
        <InfoPanel activeIndex={activeIndex} />
      </div>
    </div>
  );
}

/** Mobile / small tablet: a clean tappable grid replaces the network. */
function TechGridMobile({
  activeIndex,
  onSelect,
}: {
  activeIndex: number | null;
  onSelect: (i: number | null) => void;
}) {
  const panelId = useId();

  return (
    <div className="flex flex-col gap-5 lg:hidden">
      <div role="group" aria-label="Technologies" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {technologies.map((tech, i) => {
          const isActive = activeIndex === i;
          return (
            <button
              key={tech.name}
              type="button"
              aria-pressed={isActive}
              aria-controls={panelId}
              onClick={() => onSelect(isActive ? null : i)}
              className={`flex min-h-11 items-center justify-center border px-3 py-3 text-center text-xs tracking-wide transition-all duration-300 ease-out sm:text-sm ${
                isActive
                  ? "border-kav-gold text-kav-ivory bg-kav-surface"
                  : "border-kav-border text-kav-secondary hover:border-kav-border-strong"
              }`}
            >
              {tech.name}
            </button>
          );
        })}
      </div>

      <div id={panelId} role="status" className="border-t border-kav-border pt-6">
        <InfoPanel activeIndex={activeIndex} />
      </div>
    </div>
  );
}

/**
 * POWERED BY TECHNOLOGY. DRIVEN BY IDEAS. An interactive technology
 * constellation rather than a generic skills grid on desktop, replaced by
 * a clean tappable grid on mobile where circular node positioning would
 * be cramped and hard to hit accurately.
 */
export function TechStack() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <section id="technology" className="relative bg-kav-bg py-12 sm:py-16">
      <Container className="flex flex-col gap-6 sm:gap-8">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Our Technology"
            title={
              <>
                POWERED BY TECHNOLOGY.
                <br className="hidden sm:block" />
                <span className="sm:ml-2">DRIVEN BY IDEAS.</span>
              </>
            }
          />
        </Reveal>

        <Reveal delay={0.1}>
          <ConstellationDesktop
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
            onClear={() => setActiveIndex(null)}
          />
          <TechGridMobile activeIndex={activeIndex} onSelect={setActiveIndex} />
        </Reveal>
      </Container>
    </section>
  );
}
