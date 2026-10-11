import { m, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Button } from "./Button";
import { Reveal } from "./Reveal";
import { useTilt } from "../hooks/useTilt";
import type { Product } from "../data/products";

/** Product image in the existing animated showcase frame. */
function ProductVisual({ product }: { product: Product }) {
  const { ref, rotateX, rotateY, parallaxX, parallaxY, onMouseMove, onMouseLeave } = useTilt();
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex-1" style={{ perspective: 1200 }}>
      <m.div
        ref={ref}
        initial={prefersReducedMotion ? false : { opacity: 0.75, scale: 0.985 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative aspect-[16/10] overflow-hidden border border-kav-border bg-kav-surface transition-colors duration-500 group-hover:border-kav-border-gold"
      >
        <m.img
          src={product.image}
          alt={product.imageAlt}
          style={{ x: parallaxX, y: parallaxY }}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        <span className="absolute left-5 top-5 bg-kav-bg/75 px-2 py-1 text-xs uppercase tracking-[0.2em] text-kav-ivory">
          {product.category[0]}
        </span>
      </m.div>
    </div>
  );
}

export function ProductCard({ product, index }: { product: Product; index: number }) {
  const reversed = index % 2 === 1;

  return (
    <Reveal>
      <div
        className={`group flex flex-col gap-6 border-b border-kav-border pb-10 last:border-b-0 sm:gap-8 sm:pb-12 md:flex-row md:items-center md:gap-8 lg:gap-12 ${
          reversed ? "md:flex-row-reverse" : ""
        }`}
      >
        <ProductVisual product={product} />

        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm tracking-[0.2em] text-kav-gold">{product.number}</span>
            <span className="text-xs uppercase tracking-[0.2em] text-kav-muted">
              {product.category.join(" \u2022 ")}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-display text-2xl uppercase leading-tight text-kav-ivory sm:text-3xl">
              {product.name}
            </h3>
            <p className="text-sm text-kav-secondary sm:text-base">{product.title}</p>
          </div>

          <p className="max-w-lg text-sm leading-relaxed text-kav-secondary sm:text-base">
            {product.description}
          </p>

          {/* Hover-revealed additional info: technology / capability tags */}
          <m.ul
            initial={false}
            className="product-card-tags flex max-h-0 flex-wrap gap-x-3 gap-y-2 overflow-hidden text-xs uppercase tracking-wide text-kav-muted opacity-0 transition-[max-height,opacity] duration-500 ease-out group-hover:max-h-20 group-hover:opacity-100 group-focus-within:max-h-20 group-focus-within:opacity-100 sm:text-sm"
          >
            {product.tags.map((tag, i) => (
              <li key={tag} className="flex items-center gap-3">
                {i > 0 && (
                  <span className="text-kav-gold-dim" aria-hidden="true">
                    &middot;
                  </span>
                )}
                {tag}
              </li>
            ))}
          </m.ul>

          <div className="pt-2">
            <Button
              href={product.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Explore ${product.name} demo video (opens in a new tab)`}
              variant="secondary"
            >
              Explore Product
              <ArrowUpRight
                size={16}
                className="transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Button>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
