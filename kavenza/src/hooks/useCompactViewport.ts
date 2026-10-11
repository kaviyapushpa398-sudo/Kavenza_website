import { useEffect, useState } from "react";

/** Tracks the compact layout breakpoint so long scroll choreography can use its static alternative. */
export function useCompactViewport() {
  const [isCompact, setIsCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const update = (event: MediaQueryListEvent) => setIsCompact(event.matches);

    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isCompact;
}
