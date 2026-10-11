import { Container } from "../components/Container";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import { beliefs } from "../data/beliefs";

/**
 * WHAT WE BELIEVE. Four principles, revealed one after another as the
 * section scrolls into view. No hover choreography here on purpose —
 * this section is meant to be read, not played with.
 */
export function WhatWeBelieve() {
  return (
    <section id="beliefs" className="relative bg-kav-bg py-16 sm:py-20">
      <Container className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
        <Reveal className="max-w-md">
          <SectionHeading
            eyebrow="What We Believe"
            title="WE BUILD WITH INTENTION."
          />
        </Reveal>

        <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:gap-x-8">
          {beliefs.map((belief, i) => (
            <Reveal key={belief.title} delay={i * 0.06}>
              <div className="flex flex-col gap-2 border-t border-kav-border py-4 sm:py-5">
                <span className="text-[10px] tracking-[0.2em] text-kav-gold">
                  0{i + 1}
                </span>
                <h3 className="font-display text-lg uppercase leading-tight text-kav-ivory sm:text-2xl">
                  {belief.title}
                </h3>
                <p className="max-w-sm text-xs leading-relaxed text-kav-secondary sm:text-sm">
                  {belief.phrase}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
