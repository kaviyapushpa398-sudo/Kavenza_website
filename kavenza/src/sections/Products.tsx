import { m, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Container } from "../components/Container";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import { ProductCard } from "../components/ProductCard";
import { Button } from "../components/Button";
import { products } from "../data/products";
import githubImage from "../assets/image.png";

/**
 * OUR PRODUCTS. Editorial product showcases that alternate
 * visual/content sides on desktop and stack on mobile.
 */
export function Products() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id="products" className="relative bg-kav-bg py-12 sm:py-16">
      <Container className="flex flex-col gap-8 sm:gap-10">
        <Reveal>
          <SectionHeading
            eyebrow="Our Products"
            title="IDEAS WE'VE TURNED INTO PRODUCTS."
          />
        </Reveal>

        <div className="flex flex-col gap-8 sm:gap-10">
          {products.map((product, index) => (
            <ProductCard key={product.slug} product={product} index={index} />
          ))}

          <Reveal>
            <div className="group flex flex-col gap-6 border-b border-kav-border pb-10 last:border-b-0 sm:gap-8 sm:pb-12 md:flex-row md:items-center md:gap-8 lg:gap-12">
              <div className="flex-1" style={{ perspective: 1200 }}>
                <m.div
                  initial={prefersReducedMotion ? false : { opacity: 0.75, scale: 0.985 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex aspect-[16/10] items-center justify-center overflow-hidden border border-kav-border bg-kav-surface transition-colors duration-500 group-hover:border-kav-border-gold"
                >
                  <img
                    src={githubImage}
                    alt="GitHub"
                    className="h-full w-full object-contain p-8 transition-transform duration-500 group-hover:scale-105"
                  />
                </m.div>
              </div>

              <div className="flex flex-1 flex-col gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm tracking-[0.2em] text-kav-gold">03</span>
                  <span className="text-xs uppercase tracking-[0.2em] text-kav-muted">
                    More Projects • GitHub
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className="font-display text-2xl uppercase leading-tight text-kav-ivory sm:text-3xl">
                    Explore More Projects
                  </h3>
                </div>

                <p className="max-w-lg text-sm leading-relaxed text-kav-secondary sm:text-base">
                  Discover more of my software development projects, web applications, Python
                  applications, AI/ML projects, and other technical work on GitHub.
                </p>

                <div className="pt-2">
                  <Button
                    href="https://github.com/kaviyapushpa398-sudo"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Explore more projects on GitHub (opens in a new tab)"
                    variant="secondary"
                  >
                    Explore on GitHub
                    <ArrowUpRight
                      size={16}
                      aria-hidden="true"
                      className="transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
