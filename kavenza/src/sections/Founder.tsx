import { Container } from "../components/Container";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import founderImage from "../assets/kaviya.jpeg";
import { socialLinks } from "../data/socialLinks";
import { SocialIcon } from "../components/SocialIcon";

/**
 * Founder portrait in the existing visual frame.
 */
function FounderVisual() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden border border-kav-border bg-kav-surface">
      <span aria-hidden="true" className="absolute left-5 top-5 h-6 w-px bg-kav-border-strong" />
      <span aria-hidden="true" className="absolute left-5 top-5 h-px w-6 bg-kav-border-strong" />
      <span aria-hidden="true" className="absolute bottom-5 right-5 h-6 w-px bg-kav-border-strong" />
      <span aria-hidden="true" className="absolute bottom-5 right-5 h-px w-6 bg-kav-border-strong" />
      <img
        src={founderImage}
        alt="Kaviya B, Founder and Technology Builder at KAVENZA"
        className="h-full w-full object-cover object-[center_24%]"
      />
    </div>
  );
}

/**
 * BEHIND KAVENZA. Founder content, kept strictly to what was actually
 * provided — no invented awards, companies, revenue, or customer counts.
 */
export function Founder() {
  return (
    <section id="founder" className="relative bg-kav-bg py-12 sm:py-16">
      <Container className="grid gap-8 sm:gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
        <Reveal className="mx-auto w-full max-w-md lg:mx-0">
          <FounderVisual />
        </Reveal>

        <Reveal delay={0.1} className="flex flex-col gap-5">
          <SectionHeading eyebrow="Behind Kavenza" title="BEHIND KAVENZA." />
          <div className="flex flex-col gap-3">
            <span className="text-sm tracking-wide text-kav-ivory">Kaviya B</span>
            <span className="text-xs uppercase tracking-[0.2em] text-kav-muted">
              Founder &amp; Technology Builder
            </span>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-kav-secondary sm:text-base">
            KAVENZA began with a belief that meaningful technology starts with the courage to
            build. Founded by Kaviya B, it brings together software development, artificial
            intelligence, problem-solving, and design to turn ideas into practical technology.
          </p>
          <nav aria-label="Founder social profiles" className="flex gap-2 pt-1">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.ariaLabel}
                className="inline-flex h-11 w-11 items-center justify-center border border-kav-border text-kav-ivory transition-[color,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-kav-border-gold hover:text-kav-gold"
              >
                <SocialIcon name={link.icon} />
              </a>
            ))}
          </nav>
        </Reveal>
      </Container>
    </section>
  );
}
