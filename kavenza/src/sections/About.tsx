import { m } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Container } from "../components/Container";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import { principles, type Principle } from "../data/principles";

const easeKav = [0.16, 1, 0.3, 1] as const;

function PrincipleCard({ principle, index }: { principle: Principle; index: number }) {
  const Icon = principle.icon;

  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay: index * 0.12, ease: easeKav }}
      whileHover={{ y: -6, scale: 1.015, transition: { duration: 0.4, ease: easeKav } }}
      style={{ transformOrigin: "center" }}
      className="group relative flex flex-col gap-4 px-2 py-6 transition-colors duration-500 hover:bg-kav-surface sm:px-6 sm:py-8"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-[0.2em] text-kav-muted">0{index + 1}</span>
        <Icon
          size={22}
          strokeWidth={1.5}
          className="text-kav-gold-dim transition-all duration-500 ease-out group-hover:scale-110 group-hover:text-kav-gold"
        />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-display text-2xl uppercase tracking-wide text-kav-ivory sm:text-3xl">
          {principle.title}
        </h3>
        <div className="flex items-center gap-2 text-sm tracking-wide text-kav-secondary">
          <span>{principle.from}</span>
          <ArrowRight
            size={14}
            className="text-kav-gold transition-transform duration-500 ease-out group-hover:translate-x-1"
          />
          <span>{principle.to}</span>
        </div>
      </div>

      <p className="max-w-xs text-sm leading-relaxed text-kav-muted transition-colors duration-500 ease-out group-hover:text-kav-secondary">
        {principle.description}
      </p>

      <span className="absolute bottom-0 left-2 right-2 h-px origin-left scale-x-0 bg-kav-gold transition-transform duration-500 ease-out group-hover:scale-x-100 sm:left-8 sm:right-8" />
    </m.div>
  );
}

/**
 * About KAVENZA. Two short paragraphs establishing purpose, followed by
 * three restrained, hairline-divided principle cards (not heavy boxes).
 */
export function About() {
  return (
    <section id="about" className="relative bg-kav-bg py-12 sm:py-16">
      <Container className="flex flex-col gap-8 sm:gap-10">
        <Reveal>
          <SectionHeading eyebrow="About KAVENZA" title="BUILT WITH PURPOSE." />
        </Reveal>

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-12">
          <Reveal delay={0.1}>
            <p className="text-base leading-relaxed text-kav-secondary sm:text-lg">
              KAVENZA is an emerging technology company focused on building
              AI-powered solutions, software applications, and digital
              products that turn ideas into practical experiences.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-base leading-relaxed text-kav-secondary sm:text-lg">
              We bring together technology, problem-solving, creativity, and
              continuous learning to create products that are useful,
              intuitive, and ready to evolve.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 divide-y divide-kav-border border-y border-kav-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {principles.map((principle, index) => (
            <PrincipleCard key={principle.title} principle={principle} index={index} />
          ))}
        </div>
      </Container>
    </section>
  );
}
