import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { Container } from "../components/Container";
import { Logo } from "../components/Logo";
import { navLinks } from "../data/navigation";
import { useScrolled } from "../hooks/useScrolled";
import { useActiveSection } from "../hooks/useActiveSection";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { useAuth } from "../auth/useAuth";

const sectionIds = navLinks.map((link) => link.href.replace("#", ""));

/**
 * Fixed top navigation.
 * - Transparent over the hero at rest, transitions into a tinted,
 *   blurred charcoal surface once the page scrolls.
 * - Shows an active-section indicator once corresponding sections exist.
 * - Mobile menu is a full animated overlay, fully keyboard accessible
 *   (Escape closes it, focus returns to the trigger button).
 */
export function NavigationShell() {
  const scrolled = useScrolled();
  const activeId = useActiveSection(sectionIds);
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [accountError, setAccountError] = useState("");
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuCloseButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useLockBodyScroll(open);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.assign("/");
    } catch (error) {
      console.error("KAVENZA logout failed.", error);
      setAccountError("Unable to log out. Please try again.");
    }
  };

  useEffect(() => {
    if (!open) return;

    const menu = mobileMenuRef.current;
    const firstLink = menu?.querySelector<HTMLAnchorElement>("a[href]");
    firstLink?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key === "Tab" && menu) {
        const focusable = [
          ...menu.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>(
            "a[href], button:not([disabled])",
          ),
        ].filter(
          (element): element is HTMLAnchorElement | HTMLButtonElement => element !== null,
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-[60] bg-kav-gold px-4 py-3 text-kav-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ease-out ${
        scrolled
          ? "border-b border-kav-border bg-kav-bg/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <Container as="nav" aria-label="Primary" className="flex h-16 items-center justify-between">
        <m.a
          href="#top"
          aria-label="KAVENZA home"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <Logo size="md" />
        </m.a>

        <ul className="hidden items-center gap-9 lg:flex">
          {navLinks.map((link) => {
            const id = link.href.replace("#", "");
            const isActive = activeId === id;
            return (
              <li key={link.href} className="relative">
                <a
                  href={link.href}
                  className={`text-sm tracking-wide transition-colors duration-300 ${
                    isActive ? "text-kav-ivory" : "text-kav-secondary hover:text-kav-ivory"
                  }`}
                  aria-current={isActive ? "true" : undefined}
                >
                  {link.label}
                </a>
                {isActive && (
                  <m.span
                    layoutId="nav-active-indicator"
                    className="absolute -bottom-2 left-0 right-0 h-px bg-kav-gold"
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </li>
            );
          })}
          {!loading && (user ? (
            <>
              <li>
                <a href="/dashboard" className="text-sm tracking-wide text-kav-secondary transition-colors hover:text-kav-ivory">
                  Dashboard
                </a>
              </li>
              <li>
                <button type="button" onClick={() => void handleLogout()} className="text-sm tracking-wide text-kav-secondary transition-colors hover:text-kav-ivory">
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <a href="/register" className="text-sm tracking-wide text-kav-secondary transition-colors hover:text-kav-ivory">
                  Register
                </a>
              </li>
              <li>
                <a href="/login" className="text-sm tracking-wide text-kav-secondary transition-colors hover:text-kav-ivory">
                  Login
                </a>
              </li>
            </>
          ))}
        </ul>

        <a
          href="#contact"
          className="group hidden items-center gap-2 text-sm tracking-wide text-kav-ivory lg:inline-flex"
        >
          Let&rsquo;s Build
          <ArrowRight
            size={16}
            className="text-kav-gold transition-transform duration-300 ease-out group-hover:translate-x-1"
          />
        </a>

        <button
          ref={menuButtonRef}
          type="button"
          className="-mr-3 p-3 text-kav-ivory lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={open ? "mobile-nav" : undefined}
          aria-haspopup="dialog"
          aria-hidden={open}
          tabIndex={open ? -1 : 0}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </Container>

      <AnimatePresence>
        {open && (
          <m.div
            ref={mobileMenuRef}
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 top-16 z-40 border-t border-kav-border bg-kav-bg lg:hidden"
          >
            <Container as="nav" aria-label="Mobile" className="py-10">
              <ul className="flex flex-col gap-2">
                <li className="list-none">
                  <button
                    ref={menuCloseButtonRef}
                    type="button"
                    aria-label="Close menu"
                    className="fixed right-6 top-4 p-3 text-kav-ivory"
                    onClick={() => {
                      setOpen(false);
                      menuButtonRef.current?.focus();
                    }}
                  >
                    <X size={22} />
                  </button>
                </li>
                {navLinks.map((link, index) => (
                  <m.li
                    key={link.href}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.05 * index, ease: [0.16, 1, 0.3, 1] }}
                  >
                  <a
                    href={link.href}
                    onClick={() => {
                      setOpen(false);
                      menuButtonRef.current?.focus();
                    }}
                    className="block py-3 text-2xl text-kav-ivory transition-colors duration-300 hover:text-kav-gold"
                  >
                    {link.label}
                  </a>
                  </m.li>
                ))}
                {!loading && (user ? (
                  <>
                    <m.li
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.05 * navLinks.length, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <a
                        href="/dashboard"
                        onClick={() => setOpen(false)}
                        className="block py-3 text-2xl text-kav-ivory transition-colors duration-300 hover:text-kav-gold"
                      >
                        Dashboard
                      </a>
                    </m.li>
                    <m.li
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.05 * (navLinks.length + 1), ease: [0.16, 1, 0.3, 1] }}
                    >
                      <button type="button" onClick={() => void handleLogout()} className="block py-3 text-2xl text-kav-ivory transition-colors duration-300 hover:text-kav-gold">
                        Logout
                      </button>
                    </m.li>
                  </>
                ) : (
                  <>
                    <m.li
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.05 * navLinks.length, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <a
                        href="/register"
                        onClick={() => setOpen(false)}
                        className="block py-3 text-2xl text-kav-ivory transition-colors duration-300 hover:text-kav-gold"
                      >
                        Register
                      </a>
                    </m.li>
                    <m.li
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.05 * (navLinks.length + 1), ease: [0.16, 1, 0.3, 1] }}
                    >
                      <a
                        href="/login"
                        onClick={() => setOpen(false)}
                        className="block py-3 text-2xl text-kav-ivory transition-colors duration-300 hover:text-kav-gold"
                      >
                        Login
                      </a>
                    </m.li>
                  </>
                ))}
                <m.li
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.05 * (navLinks.length + 2), ease: [0.16, 1, 0.3, 1] }}
                  className="pt-4"
                >
                  <a
                    href="#contact"
                    onClick={() => {
                      setOpen(false);
                      menuButtonRef.current?.focus();
                    }}
                    className="group inline-flex items-center gap-2 text-lg text-kav-gold"
                  >
                    Let&rsquo;s Build
                    <ArrowRight size={18} className="transition-transform duration-300 ease-out group-hover:translate-x-1" />
                  </a>
                </m.li>
                {accountError && <li role="alert" className="pt-2 text-sm text-red-400">{accountError}</li>}
              </ul>
            </Container>
          </m.div>
        )}
      </AnimatePresence>
      {accountError && !open && (
        <p role="alert" className="absolute right-6 top-full mt-2 bg-kav-bg px-3 py-2 text-sm text-red-400">
          {accountError}
        </p>
      )}
      </header>
    </>
  );
}
