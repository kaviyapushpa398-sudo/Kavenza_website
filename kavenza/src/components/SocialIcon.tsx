import type { socialLinks } from "../data/socialLinks";

type SocialIconName = (typeof socialLinks)[number]["icon"];

export function SocialIcon({ name }: { name: SocialIconName }) {
  if (name === "github") {
    return (
      <svg viewBox="0 0 19 19" aria-hidden="true" className="h-5 w-5 fill-current">
        <use href="/icons.svg#github-icon" />
      </svg>
    );
  }

  if (name === "instagram") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-5 w-5"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2ZM8.34 18H5.67V9.4h2.67ZM7 8.22a1.55 1.55 0 1 1 0-3.1 1.55 1.55 0 0 1 0 3.1ZM18.33 18h-2.66v-4.18c0-1-.02-2.29-1.4-2.29s-1.62 1.1-1.62 2.22V18H10V9.4h2.55v1.17h.04a2.8 2.8 0 0 1 2.5-1.38c2.68 0 3.24 1.76 3.24 4.05Z" />
    </svg>
  );
}
