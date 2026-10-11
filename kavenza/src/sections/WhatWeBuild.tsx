import { useId, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ArrowDownRight, BrainCircuit, Layers3, PanelsTopLeft, Workflow } from "lucide-react";
import { Container } from "../components/Container";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import { services, type Service } from "../data/services";

const easeKav = [0.16, 1, 0.3, 1] as const;
const serviceIcons = [BrainCircuit, Layers3, PanelsTopLeft, Workflow];

function ServiceTile({
  service,
  index,
  isOpen,
  onToggle,
}: {
  service: Service;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  const Icon = serviceIcons[index];

  return (
    <div className="group border border-kav-border p-5 transition-colors duration-300 hover:border-kav-border-gold sm:p-6">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={onToggle}
        className="flex w-full flex-col items-start gap-3 text-left"
      >
        <div className="flex w-full items-center justify-between">
          <span className="text-xs tracking-[0.2em] text-kav-gold">{service.index}</span>
          <Icon
            size={18}
            strokeWidth={1.5}
            aria-hidden="true"
            className="text-kav-gold-dim transition-colors group-hover:text-kav-gold"
          />
        </div>
        <span className="flex w-full items-center justify-between gap-3">
          <span className="font-display text-base uppercase leading-tight text-kav-ivory sm:text-xl">
            {service.title}
          </span>
          <ArrowDownRight
            size={16}
            aria-hidden="true"
            className={`shrink-0 text-kav-gold transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}
          />
        </span>
        <span className="text-xs leading-relaxed text-kav-secondary sm:text-sm">{service.description}</span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <m.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: easeKav }}
            className="overflow-hidden"
          >
            <ul className="flex flex-wrap gap-x-3 gap-y-2 border-t border-kav-border pt-4 text-xs uppercase tracking-wide text-kav-muted">
              {service.examples.map((example) => (
                <li key={example}>{example}</li>
              ))}
            </ul>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * A compact service grid with optional examples disclosed on activation.
 */
export function WhatWeBuild() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="what-we-build" className="relative bg-kav-bg py-12 sm:py-16">
      <Container className="flex flex-col gap-8 sm:gap-10">
        <Reveal>
          <SectionHeading
            eyebrow="Capabilities"
            title="WHAT WE BUILD"
            description="We combine technology, creativity, and problem-solving to build digital solutions with purpose."
          />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {services.map((service, i) => (
              <ServiceTile
                key={service.title}
                service={service}
                index={i}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex((prev) => (prev === i ? null : i))}
              />
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
