import { m, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "span" | "li";
};

/**
 * Wraps content in a subtle, purposeful fade + rise reveal that triggers
 * once when scrolled into view. Respects prefers-reduced-motion via
 * Framer Motion's built-in handling combined with our global CSS override.
 */
export function Reveal({ children, className = "", delay = 0, y = 16, as = "div" }: RevealProps) {
  const MotionTag = m[as];
  const prefersReducedMotion = useReducedMotion();

  return (
    <MotionTag
      className={className}
      initial={prefersReducedMotion ? "visible" : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: { opacity: 0, y: prefersReducedMotion ? 0 : y },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.7,
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </MotionTag>
  );
}
