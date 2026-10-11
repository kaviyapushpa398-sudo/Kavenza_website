import { m, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
};

/** Reusable enter treatment for product pages when client-side routing is added. */
export function PageTransition({ children, className = "" }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <m.div
      className={className}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </m.div>
  );
}
