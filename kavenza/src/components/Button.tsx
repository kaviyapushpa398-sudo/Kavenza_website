import { m, useReducedMotion, useMotionValue, useSpring } from "framer-motion";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const baseStyles =
  "group inline-flex items-center justify-center gap-2 whitespace-nowrap px-7 py-3 text-sm tracking-wide transition-colors duration-300 ease-out disabled:opacity-40 disabled:pointer-events-none";

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-kav-gold text-kav-bg hover:bg-kav-gold-soft",
  secondary:
    "border border-kav-border-strong text-kav-ivory hover:border-kav-gold-dim hover:text-kav-gold-soft",
  ghost:
    "text-kav-secondary hover:text-kav-ivory",
};

type CommonProps = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
};

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

type ButtonProps = ButtonAsButton | ButtonAsLink;

/**
 * Shared Button primitive. Renders an <a> when `href` is provided,
 * otherwise a native <button>. Keeps focus states and variants consistent
 * across the whole site.
 */
export function Button({ variant = "primary", children, className = "", ...rest }: ButtonProps) {
  const classes = `${baseStyles} ${variantStyles[variant]} ${className}`;
  const prefersReducedMotion = useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 220, damping: 20, mass: 0.35 });
  const y = useSpring(rawY, { stiffness: 220, damping: 20, mass: 0.35 });

  const handlePointerMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (
      prefersReducedMotion ||
      event.pointerType !== "mouse" ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    rawX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 8);
    rawY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 6);
  };

  const resetMagnet = () => {
    rawX.set(0);
    rawY.set(0);
  };

  if ("href" in rest && rest.href) {
    const { href, ...anchorRest } = rest as ButtonAsLink;
    return (
      <m.span
        className="inline-flex"
        style={{ x, y }}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetMagnet}
        whileTap={{ scale: 0.985 }}
      >
        <a href={href} className={classes} {...anchorRest}>
          {children}
        </a>
      </m.span>
    );
  }

  return (
    <m.span
      className="inline-flex"
      style={{ x, y }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetMagnet}
      whileTap={{ scale: 0.985 }}
    >
      <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
        {children}
      </button>
    </m.span>
  );
}
