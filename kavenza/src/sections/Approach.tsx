import { useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Container } from "../components/Container";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import { processStages } from "../data/process";

const easeKav = [0.16, 1, 0.3, 1] as const;
const TOTAL = processStages.length;

function useTabKeyboardNav(activeIndex: number, setActiveIndex: (i: number) => void) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusAndSelect = (i: number) => {
    setActiveIndex(i);
    buttonRefs.current[i]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusAndSelect((activeIndex + 1) % TOTAL);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusAndSelect((activeIndex - 1 + TOTAL) % TOTAL);
        break;
      case "Home":
        event.preventDefault();
        focusAndSelect(0);
        break;
      case "End":
        event.preventDefault();
        focusAndSelect(TOTAL - 1);
        break;
      default:
        break;
    }
  };

  return { buttonRefs, onKeyDown };
}

type TimelineProps = {
  activeIndex: number;
  onSelect: (i: number) => void;
  buttonRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
};

/** Horizontal timeline — desktop and up. */
function TimelineHorizontal({ activeIndex, onSelect, buttonRefs, onKeyDown }: TimelineProps) {
  const progress = (activeIndex / (TOTAL - 1)) * 100;

  return (
    <div
      role="tablist"
      aria-label="Our process"
      onKeyDown={onKeyDown}
      className="relative min-w-[640px]"
    >
      <div className="absolute inset-x-0 top-[5px] h-px bg-kav-border" aria-hidden="true" />
      <m.div
        className="absolute left-0 top-[5px] h-px bg-kav-gold"
        initial={false}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: easeKav }}
        aria-hidden="true"
      />
      <div className="relative flex justify-between">
        {processStages.map((stage, i) => {
          const isActive = i === activeIndex;
          const isPast = i < activeIndex;
          return (
            <button
              key={stage.title}
              ref={(el) => {
                buttonRefs.current[i] = el;
              }}
              role="tab"
              id={`process-tab-${i}`}
              aria-selected={isActive}
              aria-controls="process-panel"
              tabIndex={isActive ? 0 : -1}
              onClick={() => onSelect(i)}
              className="group flex flex-col items-center gap-4"
            >
              <span
                className={`block h-2.5 w-2.5 rounded-full transition-all duration-300 ease-out ${
                  isActive
                    ? "scale-125 bg-kav-gold ring-4 ring-kav-gold/15"
                    : isPast
                      ? "bg-kav-gold-dim"
                      : "bg-kav-border-strong group-hover:bg-kav-secondary"
                }`}
              />
              <span
                className={`text-xs tracking-wide transition-colors duration-300 ${
                  isActive ? "text-kav-ivory" : "text-kav-muted group-hover:text-kav-secondary"
                }`}
              >
                {stage.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * FROM THOUGHT TO TECHNOLOGY. An interactive process timeline: horizontal
 * and horizontally scrollable on smaller screens, sharing one selection state. Selecting a
 * stage crossfades the content panel (number, title, description) and
 * animates the progress line up to that stage.
 */
export function Approach() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { buttonRefs, onKeyDown } = useTabKeyboardNav(activeIndex, setActiveIndex);
  const activeStage = processStages[activeIndex];

  return (
    <section id="approach" className="relative bg-kav-bg py-16 sm:py-20">
      <Container className="flex flex-col gap-10 sm:gap-12">
        <Reveal>
          <SectionHeading
            eyebrow="Our Approach"
            title="FROM THOUGHT TO TECHNOLOGY."
            description="We turn ideas into purposeful digital products through a process built around understanding, experimentation, and continuous improvement."
          />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="overflow-x-auto pb-2">
            <TimelineHorizontal
              activeIndex={activeIndex}
              onSelect={setActiveIndex}
              buttonRefs={buttonRefs}
              onKeyDown={onKeyDown}
            />
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="border-t border-kav-border pt-6 sm:pt-8">
            <AnimatePresence mode="wait">
              <m.div
                key={activeIndex}
                id="process-panel"
                role="tabpanel"
                aria-label={`Process stage: ${activeStage.title}`}
                aria-live="polite"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.4, ease: easeKav }}
                className="flex flex-col gap-3"
              >
                <span className="text-sm tracking-[0.2em] text-kav-gold">{activeStage.index}</span>
                <h3 className="font-display text-2xl uppercase leading-tight text-kav-ivory sm:text-4xl">
                  {activeStage.title}
                </h3>
                <p className="max-w-xl text-sm leading-relaxed text-kav-secondary sm:text-base">
                  {activeStage.description}
                </p>
              </m.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
