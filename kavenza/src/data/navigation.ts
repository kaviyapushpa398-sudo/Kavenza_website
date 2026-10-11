export type NavLink = {
  label: string;
  href: string;
};

/**
 * Central source of truth for primary navigation (the top navbar).
 * Sections referenced here are placeholders (`#`) until each
 * homepage section is built. Contact is intentionally excluded here —
 * the navbar surfaces it via the separate "Let's Build" CTA instead.
 */
export const navLinks: NavLink[] = [
  { label: "About", href: "#about" },
  { label: "What We Build", href: "#what-we-build" },
  { label: "Products", href: "#products" },
  { label: "Approach", href: "#approach" },
  { label: "Founder", href: "#founder" },
];

/**
 * Footer link list — same primary sections plus Contact, since the
 * footer has no separate CTA button the way the navbar does.
 */
export const footerLinks: NavLink[] = [...navLinks, { label: "Contact", href: "#contact" }];
