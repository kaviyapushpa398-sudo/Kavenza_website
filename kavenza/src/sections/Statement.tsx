import { Container } from "../components/Container";
import { Reveal } from "../components/Reveal";

const supportingIdeas = ["It should solve.", "It should simplify.", "It should empower.", "It should evolve."];

export function Statement() {
  return (
    <section id="statement" className="relative border-y border-kav-border bg-kav-bg py-12 sm:py-16">
      <Container className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-12">
        <Reveal>
          <h2 className="font-display max-w-2xl text-3xl leading-tight text-kav-ivory sm:text-4xl lg:text-5xl">
            Technology should do more than exist.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="flex flex-col gap-4">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm leading-relaxed text-kav-secondary sm:text-base">
              {supportingIdeas.map((idea) => (
                <li key={idea}>{idea}</li>
              ))}
            </ul>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-kav-gold">
              That&rsquo;s why we build.
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
