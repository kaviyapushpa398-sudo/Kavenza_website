import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  Clock3,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { authApiUrl, readApiError } from "../auth/api";
import { Button } from "../components/Button";
import { Container } from "../components/Container";
import { projectTypes } from "../data/contact";

type Profile = {
  id: string;
  name: string;
  age: number | null;
  department: string;
  college: string;
  university: string;
  mobile: string;
  email: string;
  created_at: string;
};

type Project = {
  id: string;
  title: string;
  category: string;
  description: string;
  technologies: string[];
  requirements: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type CustomerEvent = {
  id: number;
  type: string;
  title: string;
  message: string;
  project_id: string | null;
  created_at: string;
  read_at?: string | null;
};

type DashboardData = {
  profile: Profile;
  summary: { total: number; pending: number; inProgress: number; completed: number };
  projects: Project[];
  activity: CustomerEvent[];
  unreadNotifications: number;
};

type InquiryDraft = {
  title: string;
  category: string;
  description: string;
  technologies: string;
  requirements: string;
};

type PendingInquiry = { key: string; inquiry: InquiryDraft };

type View = "overview" | "projects" | "inquiry" | "notifications" | "profile";
type ProjectFilter = "All statuses" | "Pending" | "In Progress" | "Completed" | "Cancelled";

const pendingInquiryStorageKey = "kavenza.pending-inquiry";
const emptyInquiry: InquiryDraft = {
  title: "",
  category: projectTypes[0],
  description: "",
  technologies: "",
  requirements: "",
};

function readPendingInquiry(): PendingInquiry | null {
  const saved = sessionStorage.getItem(pendingInquiryStorageKey);
  if (!saved) return null;
  try {
    const value: unknown = JSON.parse(saved);
    if (
      isRecord(value) &&
      typeof value.key === "string" &&
      isRecord(value.inquiry) &&
      typeof value.inquiry.title === "string" &&
      typeof value.inquiry.category === "string" &&
      typeof value.inquiry.description === "string" &&
      typeof value.inquiry.technologies === "string" &&
      typeof value.inquiry.requirements === "string"
    ) {
      return {
        key: value.key,
        inquiry: {
          title: value.inquiry.title,
          category: value.inquiry.category,
          description: value.inquiry.description,
          technologies: value.inquiry.technologies,
          requirements: value.inquiry.requirements,
        },
      };
    }
  } catch (error) {
    console.error("Could not restore the pending inquiry retry.", error);
  }
  sessionStorage.removeItem(pendingInquiryStorageKey);
  return null;
}

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects", label: "My Projects", icon: FolderKanban },
  { id: "inquiry", label: "Submit an Inquiry", icon: Plus },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "profile", label: "My Profile", icon: UserRound },
];

const fieldClass =
  "w-full rounded-lg border border-kav-border-strong bg-kav-bg px-4 py-3 text-sm text-kav-ivory outline-none transition-colors placeholder:text-kav-muted focus:border-kav-gold";
const labelClass = "text-xs font-medium uppercase tracking-[0.14em] text-kav-muted";
const cardClass = "rounded-xl border border-kav-border bg-kav-bg-elevated shadow-lg shadow-black/10";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseProject(value: unknown): Project {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.category !== "string" ||
    typeof value.description !== "string" ||
    !Array.isArray(value.technologies) ||
    !value.technologies.every((item) => typeof item === "string") ||
    typeof value.requirements !== "string" ||
    typeof value.status !== "string" ||
    typeof value.created_at !== "string" ||
    typeof value.updated_at !== "string"
  ) {
    throw new Error("The account service returned invalid project data.");
  }
  return {
    id: value.id,
    title: value.title,
    category: value.category,
    description: value.description,
    technologies: value.technologies,
    requirements: value.requirements,
    status: value.status,
    created_at: value.created_at,
    updated_at: value.updated_at,
  };
}

function parseEvent(value: unknown): CustomerEvent {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    typeof value.type !== "string" ||
    typeof value.title !== "string" ||
    typeof value.message !== "string" ||
    (value.project_id !== null && typeof value.project_id !== "string") ||
    typeof value.created_at !== "string" ||
    (value.read_at !== undefined && value.read_at !== null && typeof value.read_at !== "string")
  ) {
    throw new Error("The account service returned invalid activity data.");
  }
  return {
    id: value.id,
    type: value.type,
    title: value.title,
    message: value.message,
    project_id: value.project_id,
    created_at: value.created_at,
    read_at: value.read_at,
  };
}

function parseDashboard(value: unknown): DashboardData {
  if (!isRecord(value) || !isRecord(value.profile) || !isRecord(value.summary)) {
    throw new Error("The account service returned invalid dashboard data.");
  }
  const profile = value.profile;
  const summary = value.summary;
  if (
    typeof profile.id !== "string" ||
    typeof profile.name !== "string" ||
    typeof profile.email !== "string" ||
    typeof profile.mobile !== "string" ||
    typeof profile.department !== "string" ||
    typeof profile.college !== "string" ||
    typeof profile.university !== "string" ||
    typeof profile.created_at !== "string" ||
    (profile.age !== null && typeof profile.age !== "number") ||
    typeof summary.total !== "number" ||
    typeof summary.pending !== "number" ||
    typeof summary.inProgress !== "number" ||
    typeof summary.completed !== "number" ||
    !Array.isArray(value.projects) ||
    !Array.isArray(value.activity) ||
    typeof value.unreadNotifications !== "number"
  ) {
    throw new Error("The account service returned invalid dashboard data.");
  }
  return {
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      mobile: profile.mobile,
      department: profile.department,
      college: profile.college,
      university: profile.university,
      created_at: profile.created_at,
      age: profile.age,
    },
    summary: {
      total: summary.total,
      pending: summary.pending,
      inProgress: summary.inProgress,
      completed: summary.completed,
    },
    projects: value.projects.map(parseProject),
    activity: value.activity.map(parseEvent),
    unreadNotifications: value.unreadNotifications,
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatRelativeDate(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Date unavailable";
  const hours = Math.max(0, Math.floor((Date.now() - timestamp) / 3_600_000));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

function statusTone(status: string) {
  if (status === "Completed") return "border-emerald-900/70 bg-emerald-950/40 text-emerald-300";
  if (status === "In Progress") return "border-sky-900/70 bg-sky-950/40 text-sky-300";
  if (status === "Cancelled") return "border-kav-border bg-kav-bg text-kav-muted";
  return "border-kav-border-gold bg-kav-gold/10 text-kav-gold-soft";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusTone(status)}`}>
      {status}
    </span>
  );
}

function PortalButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-kav-border-strong px-4 py-2 text-sm text-kav-ivory transition-colors hover:border-kav-gold-dim hover:bg-kav-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kav-gold disabled:pointer-events-none disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function EmptyState({ onSubmit }: { onSubmit: () => void }) {
  return (
    <div className={`${cardClass} flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center`}>
      <span className="mb-5 flex size-14 items-center justify-center rounded-xl border border-kav-border-gold bg-kav-gold/10 text-kav-gold">
        <FolderKanban size={24} aria-hidden="true" />
      </span>
      <h3 className="font-display text-xl uppercase text-kav-ivory">Your project space is ready</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-kav-secondary">
        You do not have any project inquiries yet. Share what you have in mind and the KAVENZA team will review it.
      </p>
      <Button type="button" onClick={onSubmit} className="mt-6">
        <Plus size={16} aria-hidden="true" />
        Submit an Inquiry
      </Button>
    </div>
  );
}

function CustomerDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [notifications, setNotifications] = useState<CustomerEvent[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectFilter>("All statuses");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pendingInquiry, setPendingInquiry] = useState<PendingInquiry | null>(
    readPendingInquiry,
  );
  const [submissionKey, setSubmissionKey] = useState<string | null>(
    pendingInquiry?.key ?? null,
  );
  const [inquiry, setInquiry] = useState<InquiryDraft>(
    pendingInquiry?.inquiry ?? emptyInquiry,
  );

  const loadDashboard = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingData(true);
    try {
      const response = await fetch(authApiUrl("/api/auth/dashboard"), { credentials: "include" });
      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }
      if (!response.ok) throw new Error(await readApiError(response, "Could not load your dashboard."));
      setDashboard(parseDashboard(await response.json()));
    } catch (caught) {
      console.error("Could not load customer dashboard data.", caught);
      setError(caught instanceof Error ? caught.message : "Could not load your dashboard.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      window.location.replace("/login");
      return;
    }
    // Dashboard state is populated from the authenticated API request.
    // oxlint-disable-next-line react/set-state-in-effect
    void loadDashboard();
  }, [authLoading, user, loadDashboard]);

  useEffect(() => {
    if (authLoading || view !== "notifications" || notifications !== null) return;
    let active = true;
    fetch(authApiUrl("/api/auth/notifications"), { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readApiError(response, "Could not load notifications."));
        const result: unknown = await response.json();
        if (!isRecord(result) || !Array.isArray(result.notifications)) {
          throw new Error("The account service returned invalid notification data.");
        }
        return result.notifications.map(parseEvent);
      })
      .then((items: CustomerEvent[]) => {
        if (active) setNotifications(items);
      })
      .catch((caught: unknown) => {
        console.error("Could not load customer notifications.", caught);
        if (active) setFormError(caught instanceof Error ? caught.message : "Could not load notifications.");
      });
    return () => {
      active = false;
    };
  }, [authLoading, notifications, view]);

  const goTo = (next: View) => {
    setView(next);
    setSelectedProject(null);
    setMobileNavOpen(false);
    setProfileMenuOpen(false);
    setNotice("");
    setFormError("");
  };

  const openProject = async (project: Project) => {
    setProjectLoading(true);
    setFormError("");
    try {
      const response = await fetch(
        authApiUrl(`/api/auth/projects/${encodeURIComponent(project.id)}`),
        { credentials: "include" },
      );
      if (!response.ok) throw new Error(await readApiError(response, "Could not load this project."));
      const result: unknown = await response.json();
      if (!isRecord(result) || !("project" in result)) {
        throw new Error("The account service returned invalid project details.");
      }
      setSelectedProject(parseProject(result.project));
    } catch (caught) {
      console.error("Could not load customer project details.", caught);
      setFormError(caught instanceof Error ? caught.message : "Could not load this project.");
    } finally {
      setProjectLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    const projects = dashboard?.projects ?? [];
    const query = search.trim().toLocaleLowerCase();
    return projects.filter((project) => {
      const matchesSearch =
        !query ||
        [project.title, project.id, project.category, project.status]
          .some((value) => value.toLocaleLowerCase().includes(query));
      const matchesStatus =
        statusFilter === "All statuses" ||
        (statusFilter === "Pending" &&
          ["Inquiry Submitted", "Under Review", "Awaiting Customer Response"].includes(project.status)) ||
        project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [dashboard?.projects, search, statusFilter]);

  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError("");
    setNotice("");
    try {
      const idempotencyKey = submissionKey ?? crypto.randomUUID();
      setSubmissionKey(idempotencyKey);
      const submittedInquiry = {
        title: inquiry.title.trim(),
        category: inquiry.category,
        description: inquiry.description.trim(),
        technologies: inquiry.technologies
          .split(",")
          .map((technology) => technology.trim())
          .filter(Boolean),
        requirements: inquiry.requirements.trim(),
      };
      const pending = { key: idempotencyKey, inquiry };
      sessionStorage.setItem(pendingInquiryStorageKey, JSON.stringify(pending));
      setPendingInquiry(pending);
      const response = await fetch(authApiUrl("/api/auth/projects"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        credentials: "include",
        body: JSON.stringify(submittedInquiry),
      });
      if (!response.ok) throw new Error(await readApiError(response, "We could not save your inquiry."));
      const result: unknown = await response.json();
      if (
        !isRecord(result) ||
        result.status !== "created" ||
        !("project" in result) ||
        !isRecord(result.emailNotifications) ||
        !["sent", "failed"].includes(String(result.emailNotifications.business)) ||
        !["sent", "failed"].includes(String(result.emailNotifications.customer))
      ) {
        throw new Error("The account service did not confirm that the inquiry was saved.");
      }
      const createdProject = parseProject(result.project);
      await loadDashboard();
      if (
        result.emailNotifications.business !== "sent" ||
        result.emailNotifications.customer !== "sent"
      ) {
        const businessState =
          result.emailNotifications.business === "sent" ? "sent" : "needs retry";
        const customerState =
          result.emailNotifications.customer === "sent" ? "sent" : "needs retry";
        setNotice(
          `Inquiry ${createdProject.id} was saved. Business email: ${businessState}; customer acknowledgement: ${customerState}. Submit again without changing the inquiry to retry failed emails.`,
        );
        return;
      }
      setInquiry({
        ...emptyInquiry,
      });
      setSubmissionKey(null);
      setPendingInquiry(null);
      sessionStorage.removeItem(pendingInquiryStorageKey);
      setNotice(`Inquiry ${createdProject.id} was saved and is awaiting review.`);
      setView("projects");
      setSelectedProject(createdProject);
    } catch (caught) {
      console.error("Could not submit a customer inquiry.", caught);
      setFormError(caught instanceof Error ? caught.message : "We could not save your inquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  const markRead = async (notification: CustomerEvent) => {
    if (notification.read_at) return;
    try {
      const response = await fetch(
        authApiUrl(`/api/auth/notifications/${notification.id}/read`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        },
      );
      if (!response.ok) throw new Error(await readApiError(response, "Could not update the notification."));
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current?.map((item) => item.id === notification.id ? { ...item, read_at: readAt } : item) ?? null,
      );
      setDashboard((current) => current
        ? { ...current, unreadNotifications: Math.max(0, current.unreadNotifications - 1) }
        : current);
    } catch (caught) {
      console.error("Could not mark a customer notification as read.", caught);
      setFormError(caught instanceof Error ? caught.message : "Could not update the notification.");
    }
  };

  const signOut = async () => {
    setLoggingOut(true);
    setFormError("");
    try {
      await logout();
      window.location.replace("/");
    } catch (caught) {
      console.error("KAVENZA logout failed.", caught);
      setFormError(caught instanceof Error ? caught.message : "Could not log out.");
      setLoggingOut(false);
    }
  };

  if (authLoading || loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kav-bg px-6">
        <div role="status" className="flex items-center gap-3 text-sm text-kav-secondary">
          <span className="size-4 animate-spin rounded-full border-2 border-kav-gold border-r-transparent" />
          Loading your workspace…
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (error || !dashboard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kav-bg px-6">
        <section className={`${cardClass} max-w-lg p-8 text-center`}>
          <CircleAlert className="mx-auto text-kav-gold" size={28} aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl uppercase">Workspace unavailable</h1>
          <p role="alert" className="mt-3 text-sm text-kav-secondary">{error || "Could not load your account."}</p>
          <PortalButton type="button" onClick={() => {
            setError("");
            void loadDashboard(true);
          }} className="mt-6">
            Try again
          </PortalButton>
        </section>
      </div>
    );
  }

  const activeTitle = selectedProject
    ? "Project details"
    : navItems.find((item) => item.id === view)?.label ?? "Dashboard";

  return (
    <div className="min-h-screen bg-kav-bg text-kav-ivory">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-kav-border bg-kav-bg-elevated transition-transform duration-200 lg:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-kav-border px-6">
          <a href="/" className="font-display text-xl tracking-[0.18em] text-kav-ivory">KAVENZA</a>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileNavOpen(false)}
            className="rounded-md p-2 text-kav-muted hover:text-kav-ivory lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-5 pt-7">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-kav-muted">Workspace</p>
          <nav aria-label="Customer portal" className="mt-3 flex flex-col gap-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => goTo(id)}
                aria-current={view === id && !selectedProject ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-kav-gold ${
                  view === id && !selectedProject
                    ? "bg-kav-gold/10 text-kav-gold-soft"
                    : "text-kav-secondary hover:bg-kav-surface hover:text-kav-ivory"
                }`}
              >
                <Icon size={17} aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {id === "notifications" && dashboard.unreadNotifications > 0 && (
                  <span className="min-w-5 rounded-full bg-kav-gold px-1.5 text-center text-[10px] font-semibold text-kav-bg">
                    {dashboard.unreadNotifications}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-auto border-t border-kav-border p-5">
          <div className="mb-4 flex items-center gap-3 px-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-kav-border-gold bg-kav-gold/10 text-sm text-kav-gold">
              {dashboard.profile.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm text-kav-ivory">{dashboard.profile.name}</p>
              <p className="truncate text-xs text-kav-muted">Customer account</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={loggingOut}
            className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-kav-secondary transition-colors hover:bg-kav-surface hover:text-kav-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-kav-gold disabled:opacity-50"
          >
            <LogOut size={17} aria-hidden="true" />
            {loggingOut ? "Logging out…" : "Logout"}
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[280px]">
        <header className="sticky top-0 z-30 border-b border-kav-border bg-kav-bg/95 backdrop-blur">
          <Container className="flex h-[72px] items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation menu"
                onClick={() => setMobileNavOpen(true)}
                className="rounded-md p-2 text-kav-secondary hover:bg-kav-surface hover:text-kav-ivory lg:hidden"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-kav-muted">Customer portal</p>
                <p className="truncate text-sm font-medium text-kav-ivory">{activeTitle}</p>
              </div>
            </div>
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                aria-label={`Notifications${dashboard.unreadNotifications ? `, ${dashboard.unreadNotifications} unread` : ""}`}
                onClick={() => goTo("notifications")}
                className="relative rounded-lg p-2.5 text-kav-secondary transition-colors hover:bg-kav-surface hover:text-kav-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-kav-gold"
              >
                <Bell size={19} aria-hidden="true" />
                {dashboard.unreadNotifications > 0 && (
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-kav-gold" />
                )}
              </button>
              <button
                type="button"
                aria-expanded={profileMenuOpen}
                aria-label="Open customer profile menu"
                onClick={() => setProfileMenuOpen((current) => !current)}
                className="flex min-h-10 items-center gap-2 rounded-lg border border-transparent px-2 transition-colors hover:border-kav-border hover:bg-kav-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-kav-gold"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-kav-surface text-xs text-kav-gold-soft">
                  {dashboard.profile.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-32 truncate text-sm text-kav-secondary sm:block">
                  {dashboard.profile.name}
                </span>
                <ChevronDown size={15} aria-hidden="true" className="text-kav-muted" />
              </button>
              {profileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-kav-border bg-kav-bg-elevated p-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => goTo("profile")}
                    className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-kav-secondary hover:bg-kav-surface hover:text-kav-ivory"
                  >
                    <UserRound size={16} aria-hidden="true" /> My Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-kav-secondary hover:bg-kav-surface hover:text-kav-ivory"
                  >
                    <LogOut size={16} aria-hidden="true" /> Logout
                  </button>
                </div>
              )}
            </div>
          </Container>
        </header>

        <main className="px-4 py-7 sm:px-6 sm:py-9 xl:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-7">
              <p className="text-xs uppercase tracking-[0.18em] text-kav-gold">Build. Innovate. Evolve.</p>
              <h1 className="mt-2 font-display text-2xl uppercase leading-tight sm:text-3xl">
                {selectedProject ? selectedProject.title : view === "overview" ? `Welcome back, ${dashboard.profile.name}` : activeTitle}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-kav-secondary">
                {selectedProject
                  ? "Review your inquiry details and its current status."
                  : view === "overview"
                    ? "Here’s the latest on your inquiries and project activity."
                    : view === "projects"
                      ? "Keep track of the project inquiries you’ve shared with KAVENZA."
                      : view === "inquiry"
                        ? "Tell us about your idea. Your inquiry is saved securely to your account."
                        : view === "notifications"
                          ? "Updates and acknowledgements related to your account and inquiries."
                          : "Your account and education details, as provided during registration."}
              </p>
            </div>

            {notice && (
              <div role="status" className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-900/70 bg-emerald-950/30 p-4 text-sm text-emerald-200">
                <Check size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <p>{notice}</p>
                <button type="button" aria-label="Dismiss message" className="ml-auto text-emerald-200/70 hover:text-emerald-100" onClick={() => setNotice("")}>
                  <X size={16} />
                </button>
              </div>
            )}
            {formError && (
              <div role="alert" className="mb-6 flex items-start gap-3 rounded-lg border border-red-900/70 bg-red-950/25 p-4 text-sm text-red-200">
                <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <p>{formError}</p>
                <button type="button" aria-label="Dismiss error" className="ml-auto text-red-200/70 hover:text-red-100" onClick={() => setFormError("")}>
                  <X size={16} />
                </button>
              </div>
            )}

            {view === "overview" && !selectedProject && (
              <Overview
                dashboard={dashboard}
                onOpenProjects={(filter) => {
                  setStatusFilter(filter);
                  setView("projects");
                }}
                onOpenProject={openProject}
                onSubmit={() => goTo("inquiry")}
                projectLoading={projectLoading}
              />
            )}

            {view === "projects" && !selectedProject && (
              <ProjectsView
                projects={filteredProjects}
                total={dashboard.projects.length}
                search={search}
                filter={statusFilter}
                onSearch={setSearch}
                onFilter={setStatusFilter}
                onOpenProject={openProject}
                onSubmit={() => goTo("inquiry")}
                projectLoading={projectLoading}
              />
            )}

            {selectedProject && (
              <ProjectDetail
                project={selectedProject}
                activity={dashboard.activity.filter((event) => event.project_id === selectedProject.id)}
                onBack={() => setSelectedProject(null)}
              />
            )}

            {view === "inquiry" && !selectedProject && (
              <InquiryForm
                values={inquiry}
                onChange={(value) => {
                  setInquiry(value);
                  setSubmissionKey(null);
                  setPendingInquiry(null);
                  sessionStorage.removeItem(pendingInquiryStorageKey);
                }}
                onSubmit={submitInquiry}
                submitting={submitting}
              />
            )}

            {view === "notifications" && !selectedProject && (
              <NotificationsView
                items={notifications}
                onMarkRead={markRead}
                onRefresh={() => {
                  setNotifications(null);
                  setFormError("");
                }}
                onOpenProject={(projectId) => {
                  const project = dashboard.projects.find((item) => item.id === projectId);
                  if (project) void openProject(project);
                  else setFormError("This inquiry is no longer available.");
                }}
              />
            )}

            {view === "profile" && !selectedProject && <ProfileView profile={dashboard.profile} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function Overview({
  dashboard,
  onOpenProjects,
  onOpenProject,
  onSubmit,
  projectLoading,
}: {
  dashboard: DashboardData;
  onOpenProjects: (filter: ProjectFilter) => void;
  onOpenProject: (project: Project) => void;
  onSubmit: () => void;
  projectLoading: boolean;
}) {
  const cards: { label: string; value: number; detail: string; filter: ProjectFilter; icon: typeof FolderKanban }[] = [
    { label: "Total Projects", value: dashboard.summary.total, detail: "All your inquiries", filter: "All statuses", icon: FolderKanban },
    { label: "Pending Inquiries", value: dashboard.summary.pending, detail: "Awaiting review or response", filter: "Pending", icon: Clock3 },
    { label: "Projects In Progress", value: dashboard.summary.inProgress, detail: "Currently underway", filter: "In Progress", icon: ArrowDownLeft },
    { label: "Completed Projects", value: dashboard.summary.completed, detail: "Successfully completed", filter: "Completed", icon: CheckCheck },
  ];

  return (
    <div className="space-y-7">
      <section aria-label="Project summary" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {cards.map(({ label, value, detail, filter, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => onOpenProjects(filter)}
            className={`${cardClass} group min-h-36 p-5 text-left transition-colors hover:border-kav-border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-kav-gold`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-kav-secondary">{label}</span>
              <Icon size={18} className="text-kav-gold" aria-hidden="true" />
            </div>
            <p className="mt-5 font-display text-3xl text-kav-ivory">{value}</p>
            <p className="mt-1 text-xs text-kav-muted">{detail}</p>
          </button>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className={`${cardClass} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-kav-border px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-display text-lg uppercase">Recent Projects</h2>
              <p className="mt-1 text-xs text-kav-muted">Your latest submitted inquiries</p>
            </div>
            {dashboard.projects.length > 0 && (
              <PortalButton type="button" onClick={() => onOpenProjects("All statuses")}>
                View all
              </PortalButton>
            )}
          </div>
          {dashboard.projects.length === 0 ? (
            <div className="px-5 py-8 sm:px-6">
              <p className="text-sm text-kav-secondary">No inquiries yet. When you submit one, it will appear here.</p>
              <PortalButton type="button" onClick={onSubmit} className="mt-4 border-kav-border-gold text-kav-gold-soft">
                <Plus size={16} aria-hidden="true" /> Submit an Inquiry
              </PortalButton>
            </div>
          ) : (
            <div className="divide-y divide-kav-border">
              {dashboard.projects.slice(0, 4).map((project) => (
                <ProjectRow key={project.id} project={project} onOpen={onOpenProject} disabled={projectLoading} />
              ))}
            </div>
          )}
        </section>

        <section className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-kav-border px-5 py-4 sm:px-6">
            <h2 className="font-display text-lg uppercase">Recent Activity</h2>
            <p className="mt-1 text-xs text-kav-muted">Events recorded on your account</p>
          </div>
          {dashboard.activity.length === 0 ? (
            <p className="px-5 py-8 text-sm text-kav-secondary sm:px-6">New account and inquiry activity will appear here.</p>
          ) : (
            <ol className="divide-y divide-kav-border">
              {dashboard.activity.slice(0, 6).map((event) => (
                <li key={event.id} className="flex gap-3 px-5 py-4 sm:px-6">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-kav-border bg-kav-surface text-kav-gold">
                    {event.type === "account_created" ? <UserRound size={15} /> : <FolderKanban size={15} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-kav-ivory">{event.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-kav-secondary">{event.message}</p>
                    <time dateTime={event.created_at} className="mt-2 block text-[11px] text-kav-muted">
                      {formatRelativeDate(event.created_at)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-kav-border-gold bg-kav-surface p-5 sm:flex-row sm:items-center sm:px-6">
        <div>
          <h2 className="font-display text-lg uppercase">Have a new idea?</h2>
          <p className="mt-1 text-sm text-kav-secondary">Send the team a project inquiry from your account.</p>
        </div>
        <Button type="button" onClick={onSubmit}>
          <Plus size={16} aria-hidden="true" /> Submit an Inquiry
        </Button>
      </section>
    </div>
  );
}

function ProjectRow({
  project,
  onOpen,
  disabled = false,
}: {
  project: Project;
  onOpen: (project: Project) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-medium text-kav-ivory">{project.title}</h3>
        <p className="mt-1 text-xs text-kav-muted">{project.id} <span aria-hidden="true">·</span> {project.category}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <StatusBadge status={project.status} />
        <PortalButton type="button" disabled={disabled} onClick={() => onOpen(project)} className="min-h-9 px-3 text-xs">
          View Details <ArrowDownLeft size={14} className="rotate-180" aria-hidden="true" />
        </PortalButton>
      </div>
    </div>
  );
}

function ProjectsView({
  projects,
  total,
  search,
  filter,
  onSearch,
  onFilter,
  onOpenProject,
  onSubmit,
  projectLoading,
}: {
  projects: Project[];
  total: number;
  search: string;
  filter: ProjectFilter;
  onSearch: (value: string) => void;
  onFilter: (value: ProjectFilter) => void;
  onOpenProject: (project: Project) => void;
  onSubmit: () => void;
  projectLoading: boolean;
}) {
  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="flex flex-col gap-4 border-b border-kav-border p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="font-display text-lg uppercase">Project inquiries</h2>
          <p className="mt-1 text-xs text-kav-muted">{total} {total === 1 ? "inquiry" : "inquiries"} in your account</p>
        </div>
        <Button type="button" onClick={onSubmit}><Plus size={16} aria-hidden="true" /> Submit an Inquiry</Button>
      </div>
      {total > 0 && (
        <div className="grid gap-3 border-b border-kav-border p-5 sm:grid-cols-[1fr_220px] sm:px-6">
          <label className="relative block">
            <span className="sr-only">Search projects</span>
            <Search size={17} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-kav-muted" />
            <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search by title, ID, or category" className={`${fieldClass} pl-10`} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="sr-only">Filter projects by status</span>
            <select value={filter} onChange={(event) => onFilter(event.target.value as ProjectFilter)} className={fieldClass}>
              {(["All statuses", "Pending", "In Progress", "Completed", "Cancelled"] as ProjectFilter[]).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      {total === 0 ? (
        <div className="p-5 sm:p-6"><EmptyState onSubmit={onSubmit} /></div>
      ) : projects.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <Search size={22} className="mx-auto text-kav-muted" aria-hidden="true" />
          <p className="mt-3 text-sm text-kav-secondary">No inquiries match your search or status filter.</p>
          <PortalButton type="button" onClick={() => { onSearch(""); onFilter("All statuses"); }} className="mt-4">
            Clear filters
          </PortalButton>
        </div>
      ) : (
        <div className="divide-y divide-kav-border">
          {projects.map((project) => (
            <ProjectRow key={project.id} project={project} onOpen={onOpenProject} disabled={projectLoading} />
          ))}
        </div>
      )}
    </section>
  );
}

function ProjectDetail({
  project,
  activity,
  onBack,
}: {
  project: Project;
  activity: CustomerEvent[];
  onBack: () => void;
}) {
  return (
    <div className="space-y-5">
      <PortalButton type="button" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> Back to projects</PortalButton>
      <section className={`${cardClass} p-5 sm:p-7`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-kav-muted">{project.id} <span aria-hidden="true">·</span> {project.category}</p>
            <h2 className="mt-2 font-display text-2xl uppercase">{project.title}</h2>
          </div>
          <StatusBadge status={project.status} />
        </div>
        <div className="mt-6 grid gap-5 border-t border-kav-border pt-5 sm:grid-cols-2">
          <DateItem label="Submitted" date={project.created_at} />
          <DateItem label="Last updated" date={project.updated_at} />
        </div>
        <div className="mt-6 border-t border-kav-border pt-5">
          <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-kav-muted">Project overview</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-kav-secondary">{project.description}</p>
        </div>
        {project.technologies.length > 0 && (
          <div className="mt-6 border-t border-kav-border pt-5">
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-kav-muted">Required technologies</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.technologies.map((technology) => (
                <span key={technology} className="rounded-full border border-kav-border px-3 py-1.5 text-xs text-kav-secondary">{technology}</span>
              ))}
            </div>
          </div>
        )}
        {project.requirements && (
          <div className="mt-6 border-t border-kav-border pt-5">
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-kav-muted">Additional requirements</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-kav-secondary">{project.requirements}</p>
          </div>
        )}
      </section>
      <section className={`${cardClass} p-5 sm:p-7`}>
        <h2 className="font-display text-lg uppercase">Progress &amp; updates</h2>
        <p className="mt-1 text-xs text-kav-muted">Only recorded inquiry events are shown here.</p>
        <div className="mt-5">
          <div className="flex gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-kav-border-gold bg-kav-gold/10 text-kav-gold">
              <Clock3 size={15} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm text-kav-ivory">{project.status}</p>
              <p className="mt-1 text-xs text-kav-secondary">Inquiry currently recorded with this status.</p>
              <time dateTime={project.created_at} className="mt-2 block text-xs text-kav-muted">{formatDate(project.created_at)}</time>
            </div>
          </div>
          {activity.map((event) => (
            <div key={event.id} className="mt-5 flex gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-kav-border bg-kav-surface text-kav-muted">
                <Check size={15} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm text-kav-ivory">{event.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-kav-secondary">{event.message}</p>
                <time dateTime={event.created_at} className="mt-2 block text-xs text-kav-muted">{formatDate(event.created_at)}</time>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DateItem({ label, date }: { label: string; date: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-kav-muted">{label}</p>
      <p className="mt-1 text-sm text-kav-secondary">{formatDate(date)}</p>
    </div>
  );
}

function InquiryForm({
  values,
  onChange,
  onSubmit,
  submitting,
}: {
  values: InquiryDraft;
  onChange: (value: InquiryDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
}) {
  const setField = (field: keyof typeof values, value: string) => onChange({ ...values, [field]: value });
  return (
    <section className={`${cardClass} max-w-4xl p-5 sm:p-7`}>
      <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Project title</span>
          <input required maxLength={150} value={values.title} onChange={(event) => setField("title", event.target.value)} placeholder="Give your idea a short title" className={fieldClass} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Project category</span>
          <select value={values.category} onChange={(event) => setField("category", event.target.value)} className={fieldClass}>
            {projectTypes.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className={labelClass}>Project description</span>
          <textarea required minLength={20} maxLength={5000} rows={5} value={values.description} onChange={(event) => setField("description", event.target.value)} placeholder="What are you hoping to build? Tell us about the idea, its goals, and who it is for." className={`${fieldClass} resize-y`} />
          <span className="text-right text-[11px] text-kav-muted">{values.description.length}/5,000</span>
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className={labelClass}>Required technologies (optional)</span>
          <input value={values.technologies} onChange={(event) => setField("technologies", event.target.value)} placeholder="Separate technologies with commas" className={fieldClass} />
          <span className="text-xs text-kav-muted">List up to 10 technologies separated by commas.</span>
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className={labelClass}>Additional requirements (optional)</span>
          <textarea maxLength={3000} rows={3} value={values.requirements} onChange={(event) => setField("requirements", event.target.value)} placeholder="Anything else the team should know?" className={`${fieldClass} resize-y`} />
        </label>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit inquiry"}
          </Button>
          <p className="text-xs text-kav-muted">Your inquiry will be saved as “Inquiry Submitted” for review.</p>
        </div>
      </form>
    </section>
  );
}

function NotificationsView({
  items,
  onMarkRead,
  onRefresh,
  onOpenProject,
}: {
  items: CustomerEvent[] | null;
  onMarkRead: (event: CustomerEvent) => void;
  onRefresh: () => void;
  onOpenProject: (projectId: string) => void;
}) {
  if (!items) {
    return (
      <section className={`${cardClass} flex min-h-48 items-center justify-center gap-3 p-6 text-sm text-kav-secondary`}>
        <span className="size-4 animate-spin rounded-full border-2 border-kav-gold border-r-transparent" />
        Loading notifications…
      </section>
    );
  }
  if (items.length === 0) {
    return (
      <div className={`${cardClass} flex min-h-60 flex-col items-center justify-center p-8 text-center`}>
        <Bell size={25} className="text-kav-gold" aria-hidden="true" />
        <h2 className="mt-4 font-display text-lg uppercase">You’re all caught up</h2>
        <p className="mt-2 text-sm text-kav-secondary">Account and project updates will appear here.</p>
        <PortalButton type="button" className="mt-5" onClick={onRefresh}>Refresh</PortalButton>
      </div>
    );
  }
  return (
    <section className={`${cardClass} divide-y divide-kav-border overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <div>
          <h2 className="font-display text-lg uppercase">Your notifications</h2>
          <p className="mt-1 text-xs text-kav-muted">Updates saved to your account.</p>
        </div>
        <PortalButton type="button" onClick={onRefresh}>Refresh</PortalButton>
      </div>
      {items.map((item) => (
        <article key={item.id} className={`flex gap-3 px-5 py-5 sm:px-6 ${item.read_at ? "" : "bg-kav-gold/[0.035]"}`}>
          <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border ${item.read_at ? "border-kav-border bg-kav-surface text-kav-muted" : "border-kav-border-gold bg-kav-gold/10 text-kav-gold"}`}>
            {item.type === "account_created" ? <UserRound size={16} /> : <FolderKanban size={16} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium text-kav-ivory">{item.title}</h3>
              {!item.read_at && <span className="rounded-full bg-kav-gold/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-kav-gold-soft">New</span>}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-kav-secondary">{item.message}</p>
            <time dateTime={item.created_at} className="mt-2 block text-xs text-kav-muted">{formatDate(item.created_at)}</time>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.project_id && (
                <PortalButton type="button" className="min-h-8 px-3 text-xs" onClick={() => onOpenProject(item.project_id!)}>
                  View inquiry
                </PortalButton>
              )}
              {!item.read_at && (
                <button type="button" onClick={() => onMarkRead(item)} className="inline-flex min-h-8 items-center gap-1.5 px-2 text-xs text-kav-gold-soft hover:text-kav-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-kav-gold">
                  <CheckCheck size={14} aria-hidden="true" /> Mark as read
                </button>
              )}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function ProfileView({ profile }: { profile: Profile }) {
  const fields: [string, string][] = [
    ["Full name", profile.name],
    ["Email address", profile.email],
    ["Mobile number", profile.mobile],
    ["Department", profile.department],
    ["College", profile.college],
    ["University", profile.university],
    ["Age", profile.age === null ? "Not provided" : String(profile.age)],
    ["Account created", formatDate(profile.created_at)],
  ];
  return (
    <section className={`${cardClass} max-w-4xl overflow-hidden`}>
      <div className="flex items-center gap-4 border-b border-kav-border px-5 py-5 sm:px-7">
        <span className="flex size-12 items-center justify-center rounded-full border border-kav-border-gold bg-kav-gold/10 font-display text-lg text-kav-gold-soft">
          {profile.name.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <h2 className="font-display text-lg uppercase">{profile.name}</h2>
          <p className="mt-1 text-sm text-kav-secondary">{profile.email}</p>
        </div>
      </div>
      <dl className="grid gap-x-8 gap-y-6 p-5 sm:grid-cols-2 sm:p-7">
        {fields.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs font-medium uppercase tracking-[0.14em] text-kav-muted">{label}</dt>
            <dd className="mt-2 break-words text-sm text-kav-ivory">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-kav-border px-5 py-4 text-xs leading-relaxed text-kav-muted sm:px-7">
        Profile changes are not available in this version. Contact KAVENZA if these details need correction.
      </p>
    </section>
  );
}

export { CustomerDashboard };
