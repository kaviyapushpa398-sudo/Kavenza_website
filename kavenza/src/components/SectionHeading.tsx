import type { ReactNode } from "react";
import { m, useReducedMotion } from "framer-motion";

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

/**
 * Consistent section header pattern: small gold eyebrow label,
 * display title, optional muted description.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className = "",
}: SectionHeadingProps) {
  const alignment = align === "center" ? "text-center items-center" : "text-left items-start";
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`flex flex-col gap-4 ${alignment} ${className}`}>
      {eyebrow && (
        <span className="text-xs font-medium uppercase tracking-[0.28em] text-kav-gold">
          {eyebrow}
        </span>
      )}
      <h2 className="overflow-hidden text-3xl leading-tight text-kav-ivory sm:text-4xl lg:text-5xl">
        <m.span
          initial={prefersReducedMotion ? false : { y: "110%" }}
          whileInView={{ y: "0%" }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.8,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="block pb-[0.08em]"
        >
          {title}
        </m.span>
      </h2>
      {description && (
        <p className="max-w-2xl text-base leading-relaxed text-kav-secondary sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}
