import { useRef, useState, type FormEvent } from "react";
import { m } from "framer-motion";
import { ArrowRight, CircleCheck } from "lucide-react";
import { Container } from "../components/Container";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import { Button } from "../components/Button";
import { projectTypes, type ProjectType } from "../data/contact";

const easeKav = [0.16, 1, 0.3, 1] as const;

type FormValues = {
  projectType: ProjectType | "";
  name: string;
  email: string;
  organization: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;
type SubmissionStatus = "idle" | "submitting" | "success" | "error";

const initialValues: FormValues = {
  projectType: "",
  name: "",
  email: "",
  organization: "",
  message: "",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const projectTypeInputId = (type: ProjectType) =>
  `project-type-${type.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.projectType) {
    errors.projectType = "Please choose what you're looking to build.";
  }
  if (!values.name.trim()) {
    errors.name = "Please enter your name.";
  } else if (values.name.trim().length > 150 || /[\r\n]/.test(values.name)) {
    errors.name = "Please keep your name under 150 characters.";
  }
  if (!values.email.trim()) {
    errors.email = "Please enter your email.";
  } else if (!emailPattern.test(values.email.trim())) {
    errors.email = "Please enter a valid email address.";
  } else if (values.email.trim().length > 254) {
    errors.email = "Please use an email address under 255 characters.";
  }
  if (values.organization.trim().length > 200 || /[\r\n]/.test(values.organization)) {
    errors.organization = "Please keep your organization under 200 characters.";
  }
  if (!values.message.trim()) {
    errors.message = "Please add a short message.";
  } else if (values.message.trim().length < 10) {
    errors.message = "Please add a little more detail (at least 10 characters).";
  } else if (values.message.trim().length > 5000) {
    errors.message = "Please keep your message under 5,000 characters.";
  }

  return errors;
}

/** Small uppercase field label, consistent with the rest of the site. */
function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs uppercase tracking-[0.2em] text-kav-muted">
      {children}
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-red-400">
      {message}
    </p>
  );
}

const inputClasses =
  "w-full min-w-0 border-b border-kav-border bg-transparent py-2.5 text-sm text-kav-ivory outline-none transition-colors duration-300 placeholder:text-kav-muted focus:border-kav-gold";

/**
 * HAVE AN IDEA WORTH BUILDING? An interactive contact experience: a
 * single-select project-type question (native radio inputs styled as
 * pills, so full keyboard support comes for free), followed by the
 * standard fields. Validated on submit with inline, accessible errors.
 */
export function Contact() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [submitError, setSubmitError] = useState("");

  const submissionInProgress = useRef(false);
  const projectTypeRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const organizationRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
    if (status === "error") {
      setStatus("idle");
      setSubmitError("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionInProgress.current) return;

    setStatus("idle");
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setSubmitError("");

    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.projectType) projectTypeRef.current?.focus();
      else if (nextErrors.name) nameRef.current?.focus();
      else if (nextErrors.email) emailRef.current?.focus();
      else if (nextErrors.organization) organizationRef.current?.focus();
      else if (nextErrors.message) messageRef.current?.focus();
      return;
    }

    const apiUrl = import.meta.env.VITE_CONTACT_API_URL?.trim();
    if (!apiUrl) {
      setStatus("error");
      setSubmitError("We're unable to send your message right now. Please try again later.");
      return;
    }

    submissionInProgress.current = true;
    setStatus("submitting");
    try {
      const response = await fetch(`${apiUrl.replace(/\/+$/, "")}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectType: values.projectType,
          name: values.name.trim(),
          email: values.email.trim(),
          organization: values.organization.trim(),
          message: values.message.trim(),
        }),
      });
      if (!response.ok) {
        console.error("Contact API rejected the submission with status", response.status);
        setStatus("error");
        setSubmitError("We're unable to send your message right now. Please try again later.");
        return;
      }

      const result: unknown = await response.json();
      if (
        typeof result !== "object" ||
        result === null ||
        !("status" in result) ||
        result.status !== "sent"
      ) {
        console.error("Contact API returned an unexpected success response.");
        setStatus("error");
        setSubmitError("We're unable to send your message right now. Please try again later.");
        return;
      }

      setStatus("success");
    } catch (error) {
      console.error("Contact form submission failed.", error);
      setStatus("error");
      setSubmitError("We're unable to send your message right now. Please try again later.");
    } finally {
      submissionInProgress.current = false;
    }
  };

  return (
    <section id="contact" className="relative bg-kav-bg py-16 sm:py-20">
      <Container className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
        <Reveal className="flex flex-col gap-5 lg:py-8">
          <SectionHeading eyebrow="Contact" title="HAVE AN IDEA WORTH BUILDING?" />
          <p className="font-display text-xl text-kav-gold-soft sm:text-2xl">
            Let&rsquo;s turn it into something real.
          </p>
          <p className="max-w-md text-sm leading-relaxed text-kav-secondary sm:text-base">
            Share an idea, project requirement, collaboration request, or business need. We&rsquo;ll
            explore the right next step together.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          {status === "success" ? (
            <div
              role="status"
              aria-live="polite"
              className="flex min-h-64 flex-col justify-center gap-3 border border-kav-border-gold bg-kav-surface p-6 sm:p-8"
            >
              <CircleCheck size={26} aria-hidden="true" className="text-kav-gold" />
              <h3 className="font-display text-xl uppercase text-kav-ivory sm:text-2xl">
                Message sent successfully.
              </h3>
              <p className="text-sm leading-relaxed text-kav-secondary">
                Thank you for reaching out to KAVENZA. We&rsquo;ll get back to you soon.
              </p>
            </div>
          ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex min-w-0 flex-col gap-5 border border-kav-border bg-kav-bg-elevated p-5 sm:gap-6 sm:p-7"
          >
            <div className="flex flex-col gap-1 border-b border-kav-border pb-4">
              <span className="text-xs uppercase tracking-[0.2em] text-kav-gold">Start a conversation</span>
              <p className="text-xs text-kav-muted">A few details will help us understand your idea.</p>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="contact-name">Full Name</FieldLabel>
                <input
                  ref={nameRef}
                  id="contact-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={values.name}
                  onChange={(e) => setField("name", e.target.value)}
                  aria-required="true"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  className={inputClasses}
                  placeholder="Your name"
                />
                <FieldError id="name-error" message={errors.name} />
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="contact-email">Email Address</FieldLabel>
                <input
                  ref={emailRef}
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={(e) => setField("email", e.target.value)}
                  aria-required="true"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={inputClasses}
                  placeholder="you@example.com"
                />
                <FieldError id="email-error" message={errors.email} />
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <span id="project-type-label" className="text-xs uppercase tracking-[0.2em] text-kav-muted">
                  Project Type
                </span>
                <div
                  id="project-type-group"
                  ref={projectTypeRef}
                  role="radiogroup"
                  aria-labelledby="project-type-label"
                  aria-invalid={Boolean(errors.projectType)}
                  aria-describedby={errors.projectType ? "project-type-error" : undefined}
                  tabIndex={-1}
                  className="flex flex-wrap gap-2 outline-none"
                >
                  {projectTypes.map((type) => (
                    <div key={type}>
                      <input
                        type="radio"
                        id={projectTypeInputId(type)}
                        name="projectType"
                        value={type}
                        checked={values.projectType === type}
                        onChange={() => setField("projectType", type)}
                        className="peer sr-only"
                      />
                      <label
                        htmlFor={projectTypeInputId(type)}
                        className="flex min-h-10 cursor-pointer items-center border border-kav-border px-2.5 py-2 text-[11px] text-kav-secondary transition-colors duration-300 peer-checked:border-kav-gold peer-checked:bg-kav-surface peer-checked:text-kav-ivory peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-kav-gold hover:border-kav-border-strong sm:px-3 sm:text-xs"
                      >
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
                <FieldError id="project-type-error" message={errors.projectType} />
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <FieldLabel htmlFor="contact-organization">Organization (optional)</FieldLabel>
                <input
                  ref={organizationRef}
                  id="contact-organization"
                  name="organization"
                  type="text"
                  autoComplete="organization"
                  value={values.organization}
                  onChange={(e) => setField("organization", e.target.value)}
                  aria-invalid={Boolean(errors.organization)}
                  aria-describedby={errors.organization ? "organization-error" : undefined}
                  className={inputClasses}
                  placeholder="Company, school, or team"
                />
                <FieldError id="organization-error" message={errors.organization} />
              </div>

              <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
                <FieldLabel htmlFor="contact-message">Message</FieldLabel>
                <textarea
                  ref={messageRef}
                  id="contact-message"
                  name="message"
                  rows={3}
                  value={values.message}
                  onChange={(e) => setField("message", e.target.value)}
                  aria-required="true"
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? "message-error" : undefined}
                  className={`${inputClasses} resize-y`}
                  placeholder="Tell us a little about what you're looking to build."
                />
                <FieldError id="message-error" message={errors.message} />
              </div>
            </div>

            <m.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: easeKav }}
              className="flex flex-col items-start gap-3"
            >
              <Button
                type="submit"
                variant="primary"
                disabled={status === "submitting"}
                className="min-h-11 uppercase tracking-[0.15em]"
              >
                {status === "submitting"
                  ? "Sending..."
                  : status === "error"
                    ? "Try Again"
                    : "Start a Conversation"}
                {status !== "submitting" && (
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="transition-transform duration-300 ease-out group-hover:translate-x-1"
                  />
                )}
              </Button>
              {status === "error" && (
                <p role="alert" className="text-sm text-red-400">
                  {submitError}
                </p>
              )}
            </m.div>
          </form>
          )}
        </Reveal>
      </Container>
    </section>
  );
}
