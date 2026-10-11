import { Container } from "../components/Container";
import brandLogo from "../assets/kavimani.jpeg";
import { footerLinks } from "../data/navigation";
import { socialLinks } from "../data/socialLinks";
import { SocialIcon } from "../components/SocialIcon";

/** Compact brand signature, footer navigation, and social profiles. */
export function Footer() {
  return (
    <footer className="border-t border-kav-border bg-kav-bg-elevated">
      <Container className="py-8 sm:py-10">
        <div className="grid gap-8 border-b border-kav-border pb-7 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-10 lg:grid-cols-[1fr_auto_auto] lg:gap-16">
          <div className="flex flex-col items-start gap-3">
            <a href="#top" aria-label="KAVENZA home" className="inline-flex">
              <img
                src={brandLogo}
                alt="KAVENZA — Build. Innovate. Evolve."
                className="h-24 w-32 object-contain object-left"
              />
            </a>
            <p className="text-[10px] uppercase tracking-[0.2em] text-kav-muted sm:text-xs">
              AI <span aria-hidden="true">&bull;</span> Software <span aria-hidden="true">&bull;</span> Digital Products
            </p>
            <nav aria-label="Social profiles" className="mt-1 flex gap-2">
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
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-8 gap-y-1 sm:pt-4 lg:grid-cols-1 lg:gap-y-0"
          >
            {footerLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex min-h-10 items-center text-sm text-kav-secondary transition-colors duration-200 hover:text-kav-ivory"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="pt-5 text-xs text-kav-muted">
          <span>&copy; KAVENZA. All Rights Reserved.</span>
        </div>
      </Container>
    </footer>
  );
}
