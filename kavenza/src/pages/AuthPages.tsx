import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../components/Button";
import { Container } from "../components/Container";
import { Logo } from "../components/Logo";
import { authApiUrl, readApiError } from "../auth/api";
import { useAuth } from "../auth/useAuth";
import { CustomerDashboard } from "./CustomerDashboard";

const fieldClass =
  "w-full min-w-0 border-b border-kav-border bg-transparent py-2.5 text-sm text-kav-ivory outline-none transition-colors duration-300 placeholder:text-kav-muted focus:border-kav-gold";
const labelClass = "text-xs uppercase tracking-[0.2em] text-kav-muted";

function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-kav-bg text-kav-ivory">
      <header className="border-b border-kav-border">
        <Container className="flex h-16 items-center justify-between">
          <a href="/" aria-label="KAVENZA home">
            <Logo size="md" />
          </a>
          <a
            href="/"
            className="text-sm text-kav-secondary transition-colors hover:text-kav-ivory"
          >
            Back to website
          </a>
        </Container>
      </header>
      <main className="py-12 sm:py-16">
        <Container>{children}</Container>
      </main>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${fieldClass} pr-12`}
          required
          minLength={12}
          maxLength={128}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-kav-muted transition-colors hover:text-kav-ivory"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

function RegisterPage() {
  const [values, setValues] = useState({
    name: "",
    age: "",
    department: "",
    college: "",
    university: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ emailSent: boolean; message: string } | null>(null);

  const update = (field: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const digits = values.mobile.replace(/[\s-]/g, "");
    if (!/^(?:\+91)?[6-9]\d{9}$/.test(digits)) {
      setError("Please enter a valid Indian mobile number.");
      return;
    }
    if (values.password !== values.confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(authApiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...values,
          age: values.age.trim() ? Number(values.age) : null,
          email: values.email.trim(),
        }),
      });
      if (!response.ok) {
        setError(await readApiError(response, "We could not create your account."));
        return;
      }
      const payload: unknown = await response.json();
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("emailSent" in payload) ||
        typeof payload.emailSent !== "boolean" ||
        !("message" in payload) ||
        typeof payload.message !== "string"
      ) {
        throw new Error("The account service returned an invalid registration response.");
      }
      setResult({ emailSent: payload.emailSent, message: payload.message });
    } catch (caught) {
      console.error("KAVENZA registration request failed.", caught);
      setError(caught instanceof Error ? caught.message : "We could not create your account.");
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <AuthFrame>
        <section className="mx-auto flex max-w-xl flex-col gap-5 border border-kav-border-gold bg-kav-surface p-6 sm:p-9">
          <p className="text-xs uppercase tracking-[0.2em] text-kav-gold">Registration</p>
          <h1 className="font-display text-3xl uppercase">Account created</h1>
          <p className="text-sm leading-relaxed text-kav-secondary">{result.message}</p>
          {!result.emailSent && (
            <p role="status" className="text-sm text-kav-muted">
              Your account is saved. You can sign in even though the email could not be sent.
            </p>
          )}
          <div>
            <Button href="/login" variant="secondary">Continue to login</Button>
          </div>
        </section>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <section className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-kav-gold">Create your account</p>
          <h1 className="font-display text-3xl uppercase text-kav-ivory sm:text-4xl">Register</h1>
          <p className="max-w-xl text-sm leading-relaxed text-kav-secondary">
            Share a few details to create your KAVENZA customer account.
          </p>
        </div>
        <form
          onSubmit={submit}
          className="grid gap-x-8 gap-y-6 border border-kav-border bg-kav-bg-elevated p-5 sm:grid-cols-2 sm:p-8"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="register-name" className={labelClass}>Full Name</label>
            <input id="register-name" autoComplete="name" placeholder="Your full name" maxLength={150} required value={values.name} onChange={(e) => update("name", e.target.value)} className={fieldClass} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="register-age" className={labelClass}>Age (optional)</label>
            <input id="register-age" type="number" min={1} max={120} value={values.age} onChange={(e) => update("age", e.target.value)} className={fieldClass} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="register-department" className={labelClass}>Department</label>
            <input id="register-department" placeholder="Your department" maxLength={150} required value={values.department} onChange={(e) => update("department", e.target.value)} className={fieldClass} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="register-college" className={labelClass}>College Name</label>
            <input id="register-college" placeholder="Your college" maxLength={200} required value={values.college} onChange={(e) => update("college", e.target.value)} className={fieldClass} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="register-university" className={labelClass}>University Name</label>
            <input id="register-university" placeholder="Your university" maxLength={200} required value={values.university} onChange={(e) => update("university", e.target.value)} className={fieldClass} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="register-mobile" className={labelClass}>Indian Mobile Number</label>
            <input id="register-mobile" type="tel" autoComplete="tel" placeholder="+91 98765 43210" required value={values.mobile} onChange={(e) => update("mobile", e.target.value)} className={fieldClass} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label htmlFor="register-email" className={labelClass}>Email Address</label>
            <input id="register-email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required value={values.email} onChange={(e) => update("email", e.target.value)} className={fieldClass} />
          </div>
          <PasswordField id="register-password" label="Password" autoComplete="new-password" value={values.password} onChange={(value) => update("password", value)} />
          <PasswordField id="register-confirm-password" label="Confirm Password" autoComplete="new-password" value={values.confirmPassword} onChange={(value) => update("confirmPassword", value)} />
          <div className="flex flex-col gap-4 sm:col-span-2">
            <p className="text-xs leading-relaxed text-kav-muted">Use 12–128 characters for your password.</p>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <Button type="submit" variant="primary" disabled={busy} className="w-fit uppercase tracking-[0.15em]">
              {busy ? "Creating account..." : "Create Account"}
            </Button>
            <p className="text-sm text-kav-secondary">
              Already registered? <a href="/login" className="text-kav-gold hover:text-kav-gold-soft">Log in</a>
            </p>
          </div>
        </form>
      </section>
    </AuthFrame>
  );
}

function LoginPage() {
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(authApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!response.ok) {
        setError(await readApiError(response, "Email or password is incorrect."));
        return;
      }
      await refresh();
      window.location.assign("/dashboard");
    } catch (caught) {
      console.error("KAVENZA login request failed.", caught);
      setError(caught instanceof Error ? caught.message : "We could not log you in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame>
      <section className="mx-auto max-w-lg">
        <div className="mb-8 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-kav-gold">Welcome back</p>
          <h1 className="font-display text-3xl uppercase text-kav-ivory sm:text-4xl">Login</h1>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-6 border border-kav-border bg-kav-bg-elevated p-5 sm:p-8">
          <div className="flex flex-col gap-2">
            <label htmlFor="login-email" className={labelClass}>Email Address</label>
            <input id="login-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
          </div>
          <PasswordField id="login-password" label="Password" autoComplete="current-password" value={password} onChange={setPassword} />
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <Button type="submit" variant="primary" disabled={busy} className="w-fit uppercase tracking-[0.15em]">
            {busy ? "Logging in..." : "Login"}
          </Button>
          <p className="text-sm text-kav-secondary">
            Need an account? <a href="/register" className="text-kav-gold hover:text-kav-gold-soft">Register</a>
          </p>
        </form>
      </section>
    </AuthFrame>
  );
}

export function AuthPage({ path }: { path: string }) {
  if (path === "/register") return <RegisterPage />;
  if (path === "/login") return <LoginPage />;
  return <CustomerDashboard />;
}
