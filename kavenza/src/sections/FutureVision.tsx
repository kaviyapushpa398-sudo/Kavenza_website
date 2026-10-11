import { Container } from "../components/Container";
import { Reveal } from "../components/Reveal";

export function FutureVision() {
  return (
    <section id="future-vision" className="relative border-y border-kav-border bg-kav-bg py-12 sm:py-16">
      <Container className="flex flex-col gap-4">
        <Reveal>
          <h2 className="font-display max-w-4xl text-3xl uppercase leading-tight text-kav-ivory sm:text-4xl lg:text-5xl">
            Today, we build products.
            <br />
            Tomorrow, we build possibilities.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="text-sm leading-relaxed text-kav-secondary sm:text-base">
            The journey is just beginning.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
