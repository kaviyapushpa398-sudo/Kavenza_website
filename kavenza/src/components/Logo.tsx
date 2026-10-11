/**
 * KAVENZA Logo
 * ------------
 * This is a NEUTRAL placeholder wordmark only — it intentionally does not
 * attempt to redesign or recreate your finalized logo.
 *
 * To use your real logo asset:
 *   1. Drop the file into `src/assets/` (e.g. `src/assets/logo.svg`).
 *   2. Import it here: `import logo from "../assets/logo.svg";`
 *   3. Replace the placeholder <span> block below with:
 *        <img src={logo} alt="KAVENZA" className={imgSizes[size]} />
 */
type LogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const textSizes: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-3xl",
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <span
      className={`font-display select-none tracking-[0.18em] text-kav-ivory ${textSizes[size]} ${className}`}
    >
      KAVENZA
    </span>
  );
}
