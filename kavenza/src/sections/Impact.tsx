import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Container } from "../components/Container";
import { Reveal } from "../components/Reveal";
import { impactAreas } from "../data/impact";

const easeKav = [0.16, 1, 0.3, 1] as const;

/**
 * IMPACT. A typographic, interactive list of focus areas rather than a
 * stats block — deliberately no numbers, since none are verified. Hovering
 * (or tapping, on touch) a focus area enlarges it, mutes its siblings, and
 * reveals a short supporting line.
 */
export function Impact() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);

  const activeIndex = hoveredIndex ?? pinnedIndex;

  return (
    <section id="impact" className="relative bg-kav-bg py-12 sm:py-16">
      <Container className="flex flex-col gap-4 border-t border-kav-border pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <Reveal className="shrink-0">
          <h2 className="font-display text-xl uppercase text-kav-ivory sm:text-2xl">
            Technology that creates possibilities.
          </h2>
        </Reveal>
        <Reveal delay={0.1} className="flex flex-col gap-2 sm:items-end">
          <div
            className="flex flex-wrap items-center gap-x-2 gap-y-1"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {impactAreas.map((area, i) => {
              const isActive = activeIndex === i;

              return (
                <span key={area.title} className="inline-flex items-center gap-2">
                  {i > 0 && (
                    <span aria-hidden="true" className="text-kav-gold-dim">
                      |
                    </span>
                  )}
                  <button
                    type="button"
                    aria-pressed={isActive}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onFocus={() => setHoveredIndex(i)}
                    onBlur={() => setHoveredIndex(null)}
                    onClick={() => setPinnedIndex((prev) => (prev === i ? null : i))}
                    className={`min-h-11 text-sm transition-colors duration-300 ${
                      isActive ? "text-kav-gold" : "text-kav-secondary hover:text-kav-ivory"
                    }`}
                  >
                    {area.title}
                  </button>
                </span>
              );
            })}
          </div>
          <AnimatePresence mode="wait">
            {activeIndex !== null && (
              <m.p
                key={impactAreas[activeIndex].title}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: easeKav }}
                className="max-w-sm text-xs leading-relaxed text-kav-muted sm:text-right"
              >
                {impactAreas[activeIndex].description}
              </m.p>
            )}
          </AnimatePresence>
        </Reveal>
      </Container>
    </section>
  );
}
