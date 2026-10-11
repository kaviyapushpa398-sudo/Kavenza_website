import { useEffect } from "react";

/**
 * Prevents background scroll while a modal/overlay (e.g. mobile nav) is open.
 */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = original;
    };
  }, [locked]);
}
