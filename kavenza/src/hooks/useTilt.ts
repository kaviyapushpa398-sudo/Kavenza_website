import { useRef } from "react";
import { useMotionValue, useReducedMotion, useSpring, type MotionValue } from "framer-motion";

type TiltHandlers = {
  ref: React.RefObject<HTMLDivElement | null>;
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  parallaxX: MotionValue<number>;
  parallaxY: MotionValue<number>;
  onMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
};

/**
 * Subtle 3D tilt + a second, independent parallax layer for decorative
 * inner elements — the classic "card tilts a little, contents drift a
 * little more" depth effect. Both settle back to rest via a spring.
 */
export function useTilt(maxTiltDeg = 6, maxParallaxPx = 14): TiltHandlers {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const springConfig = { stiffness: 150, damping: 18, mass: 0.4 };

  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rawParallaxX = useMotionValue(0);
  const rawParallaxY = useMotionValue(0);

  const rotateX = useSpring(rawRotateX, springConfig);
  const rotateY = useSpring(rawRotateY, springConfig);
  const parallaxX = useSpring(rawParallaxX, springConfig);
  const parallaxY = useSpring(rawParallaxY, springConfig);

  const onMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (
      prefersReducedMotion ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }

    const el = ref.current;
    if (!el) return;
    const bounds = el.getBoundingClientRect();
    const px = (event.clientX - bounds.left) / bounds.width;
    const py = (event.clientY - bounds.top) / bounds.height;
    const nx = px * 2 - 1; // -1..1
    const ny = py * 2 - 1;

    rawRotateY.set(nx * maxTiltDeg);
    rawRotateX.set(-ny * maxTiltDeg);
    rawParallaxX.set(nx * maxParallaxPx);
    rawParallaxY.set(ny * maxParallaxPx);
  };

  const onMouseLeave = () => {
    rawRotateX.set(0);
    rawRotateY.set(0);
    rawParallaxX.set(0);
    rawParallaxY.set(0);
  };

  return { ref, rotateX, rotateY, parallaxX, parallaxY, onMouseMove, onMouseLeave };
}
