// PROTOTYPE: throwaway bell + feed variants for wayfinder ticket
// "What do the bell and feed look like, and where do they live?" (#6).
// Three variants mounted in the real app layout, switchable via ?variant=A|B|C.
// Sample Notifications live in memory per role; nothing is persisted.
// Chosen: A (header bell + popover) with Unread / Read tabs.
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link, NavLink, useSearchParams } from "react-router";
import {
  Bell,
  BookOpen,
  CheckCheck,
  MessageSquare,
  Receipt,
  Reply,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { UserRole } from "~/db/schema";

export const NOTIFICATION_VARIANTS = [
  { key: "A", name: "Header bell + popover" },
  { key: "B", name: "Sidebar nav item + inbox page" },
  { key: "C", name: "Footer bell + grouped drawer" },
];

type Kind =
  "question" | "reply" | "lesson" | "refund-decided" | "refund-raised";

export interface SampleNotification {
  id: number;
  kind: Kind;
  actor: string | null;
  title: string;
  excerpt: string;
  subject: string;
  href: string;
  minutesAgo: number;
  read: boolean;
}

const H = 60;
const D = 24 * H;

function sampleFor(role: UserRole | null): SampleNotification[] {
  if (role === UserRole.Instructor) {
    return [
      {
        id: 1,
        kind: "question",
        actor: "Sam Lee",
        title: "Sam Lee asked a Question",
        excerpt: "Why does my action run twice when I submit the form?",
        subject: "Forms and Actions",
        href: "/instructor/questions",
        minutesAgo: 4,
        read: false,
      },
      {
        id: 2,
        kind: "question",
        actor: "Aisha Khan",
        title: "Aisha Khan asked a Question",
        excerpt: "Is the starter repo supposed to fail typecheck on step 3?",
        subject: "Project Setup",
        href: "/instructor/questions",
        minutesAgo: 38,
        read: false,
      },
      {
        id: 3,
        kind: "reply",
        actor: "Sam Lee",
        title: "Sam Lee replied",
        excerpt: "Ah, it was the double <Form> — thanks!",
        subject: "Forms and Actions",
        href: "/instructor/questions",
        minutesAgo: 3 * H,
        read: false,
      },
      {
        id: 4,
        kind: "question",
        actor: "Tom Becker",
        title: "Tom Becker asked a Question",
        excerpt: "Can I use Prisma instead of Drizzle for the exercises?",
        subject: "Database Basics",
        href: "/instructor/questions",
        minutesAgo: 1 * D + 2 * H,
        read: true,
      },
      {
        id: 5,
        kind: "reply",
        actor: "Aisha Khan",
        title: "Aisha Khan replied",
        excerpt: "Never mind, I was on the wrong branch.",
        subject: "Project Setup",
        href: "/instructor/questions",
        minutesAgo: 3 * D,
        read: true,
      },
    ];
  }
  if (role === UserRole.Admin) {
    return [
      {
        id: 1,
        kind: "refund-raised",
        actor: "Jordan Park",
        title: "Jordan Park requested a refund",
        excerpt:
          "Full-Stack React Router · $129 · “Course wasn't what I expected”",
        subject: "Refund Requests",
        href: "/admin/refunds",
        minutesAgo: 12,
        read: false,
      },
      {
        id: 2,
        kind: "refund-raised",
        actor: "Acme Corp (Team)",
        title: "Acme Corp requested a Team refund",
        excerpt: "TypeScript Fundamentals · 10 Seats · $990",
        subject: "Refund Requests",
        href: "/admin/refunds",
        minutesAgo: 2 * H,
        read: false,
      },
      {
        id: 3,
        kind: "refund-raised",
        actor: "Lena Ortiz",
        title: "Lena Ortiz requested a refund",
        excerpt: "Intro to Testing · $49",
        subject: "Refund Requests",
        href: "/admin/refunds",
        minutesAgo: 5 * H,
        read: false,
      },
      {
        id: 4,
        kind: "refund-raised",
        actor: "Chris Wu",
        title: "Chris Wu requested a refund",
        excerpt: "Full-Stack React Router · $129",
        subject: "Refund Requests",
        href: "/admin/refunds",
        minutesAgo: 2 * D,
        read: true,
      },
    ];
  }
  return [
    {
      id: 1,
      kind: "reply",
      actor: "Priya Shah",
      title: "Priya Shah replied to your Question",
      excerpt:
        "You can return it from the loader instead of fetching on mount.",
      subject: "Loaders and Data",
      href: "/courses",
      minutesAgo: 6,
      read: false,
    },
    {
      id: 2,
      kind: "reply",
      actor: "Marco Rossi",
      title: "Marco Rossi replied",
      excerpt: "Same issue here, Priya's fix worked for me too.",
      subject: "Loaders and Data",
      href: "/courses",
      minutesAgo: 25,
      read: false,
    },
    {
      id: 3,
      kind: "lesson",
      actor: null,
      title: "New lesson in Full-Stack React Router",
      excerpt: "Streaming with Suspense",
      subject: "Full-Stack React Router",
      href: "/courses",
      minutesAgo: 2 * H,
      read: false,
    },
    {
      id: 4,
      kind: "reply",
      actor: "Priya Shah",
      title: "Priya Shah replied",
      excerpt: "Also check the docs on revalidation.",
      subject: "Loaders and Data",
      href: "/courses",
      minutesAgo: 3 * H,
      read: false,
    },
    {
      id: 5,
      kind: "refund-decided",
      actor: null,
      title: "Your Refund Request was approved",
      excerpt: "Intro to Testing · $49",
      subject: "Refund Requests",
      href: "/dashboard",
      minutesAgo: 1 * D + 4 * H,
      read: true,
    },
    {
      id: 6,
      kind: "lesson",
      actor: null,
      title: "New lesson in TypeScript Fundamentals",
      excerpt: "Narrowing with satisfies",
      subject: "TypeScript Fundamentals",
      href: "/courses",
      minutesAgo: 4 * D,
      read: true,
    },
  ];
}

// ---------- shared in-memory state ----------

interface Ctx {
  items: SampleNotification[];
  unread: number;
  markRead: (id: number) => void;
  toggleRead: (id: number) => void;
  markAllRead: () => void;
  reset: () => void;
  // Variant C only: "seen" clears the badge without marking items read.
  unseen: number;
  markAllSeen: () => void;
}

const NotificationsCtx = createContext<Ctx | null>(null);

export function useSampleNotifications() {
  const ctx = useContext(NotificationsCtx);
  if (!ctx) throw new Error("PrototypeNotificationsProvider missing");
  return ctx;
}

export function PrototypeNotificationsProvider({
  role,
  children,
}: {
  role: UserRole | null;
  children: ReactNode;
}) {
  const [items, setItems] = useState(() => sampleFor(role));
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setItems(sampleFor(role));
    setSeenIds(new Set());
  }, [role]);

  const value = useMemo<Ctx>(() => {
    const unreadItems = items.filter((n) => !n.read);
    return {
      items,
      unread: unreadItems.length,
      unseen: unreadItems.filter((n) => !seenIds.has(n.id)).length,
      markRead: (id) =>
        setItems((xs) =>
          xs.map((n) => (n.id === id ? { ...n, read: true } : n))
        ),
      toggleRead: (id) =>
        setItems((xs) =>
          xs.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
        ),
      markAllRead: () =>
        setItems((xs) => xs.map((n) => ({ ...n, read: true }))),
      markAllSeen: () => setSeenIds(new Set(items.map((n) => n.id))),
      reset: () => {
        setItems(sampleFor(role));
        setSeenIds(new Set());
      },
    };
  }, [items, seenIds, role]);

  return (
    <NotificationsCtx.Provider value={value}>
      {children}
    </NotificationsCtx.Provider>
  );
}

export function useNotificationVariant() {
  const [params] = useSearchParams();
  return params.get("variant") ?? "A";
}

// ---------- small shared bits (icons, time) ----------

function KindIcon({ kind, className }: { kind: Kind; className?: string }) {
  const c = cn("size-4", className);
  switch (kind) {
    case "question":
      return <MessageSquare className={c} />;
    case "reply":
      return <Reply className={c} />;
    case "lesson":
      return <BookOpen className={c} />;
    default:
      return <Receipt className={c} />;
  }
}

function ago(m: number) {
  if (m < 60) return `${m}m`;
  if (m < D) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / D)}d`;
}

function Badge({ count, className }: { count: number; className?: string }) {
  if (count === 0) return null;
  return (
    <span
      className={cn(
        "flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white",
        className
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

function StateReadout() {
  const { items, unread, unseen, reset } = useSampleNotifications();
  return (
    <div className="border-t px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
      PROTOTYPE · {items.length} total · {unread} unread · {unseen} unseen ·{" "}
      <button onClick={reset} className="underline">
        reset
      </button>
    </div>
  );
}

// =====================================================================
// Variant A (CHOSEN): bell in the sidebar header, popover flies out to the
// right with Unread / Read tabs. Clicking a row marks it read and follows
// the link. "Mark all read".
// =====================================================================

export function VariantAHeaderBell() {
  const { unread } = useSampleNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        className="relative rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <Bell className="size-4" />
        <Badge count={unread} className="absolute -right-1 -top-1" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-[calc(100%+1.25rem)] top-0 z-50 w-96 rounded-lg border bg-popover text-popover-foreground shadow-xl">
            <PopoverFeed onNavigate={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}

function PopoverFeed({ onNavigate }: { onNavigate: () => void }) {
  const { items, unread, markRead, markAllRead } = useSampleNotifications();
  // Chosen on #6: Unread tab first, everything already read in the second.
  const [tab, setTab] = useState<"unread" | "read">("unread");
  const shown = items.filter((n) => (tab === "unread" ? !n.read : n.read));
  return (
    <div>
      <div className="flex items-center justify-between border-b px-3 pt-2">
        <div className="flex gap-1">
          {(["unread", "read"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "-mb-px border-b-2 px-2 pb-2 text-sm capitalize",
                tab === t
                  ? "border-primary font-semibold"
                  : "border-transparent text-muted-foreground"
              )}
            >
              {t}
              {t === "unread" && unread > 0 ? ` (${unread})` : ""}
            </button>
          ))}
        </div>
        <button
          onClick={markAllRead}
          disabled={unread === 0}
          className="mb-2 flex items-center gap-1 text-xs text-primary disabled:text-muted-foreground"
        >
          <CheckCheck className="size-3.5" /> Mark all read
        </button>
      </div>
      <ul className="max-h-[28rem] overflow-y-auto">
        {shown.length === 0 && (
          <li className="p-6 text-center text-sm text-muted-foreground">
            {tab === "unread" ? "You're all caught up." : "Nothing read yet."}
          </li>
        )}
        {shown.map((n) => (
          <li key={n.id}>
            <Link
              to={n.href}
              onClick={() => {
                markRead(n.id);
                onNavigate();
              }}
              className={cn(
                "flex gap-3 border-b px-3 py-2.5 hover:bg-accent",
                !n.read && "bg-primary/5"
              )}
            >
              <KindIcon
                kind={n.kind}
                className="mt-0.5 shrink-0 text-muted-foreground"
              />
              <div className="min-w-0 flex-1">
                <div className={cn("text-sm", !n.read && "font-semibold")}>
                  {n.title}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {n.excerpt}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {n.subject} · {ago(n.minutesAgo)}
                </div>
              </div>
              {!n.read && (
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
              )}
            </Link>
          </li>
        ))}
      </ul>
      <StateReadout />
    </div>
  );
}

// =====================================================================
// Variant B: "Notifications" is a nav item with an unread pill; the feed
// is a full page at /notifications with Unread/All tabs, per-row
// read/unread toggle, and mark-all. Nothing opens over the content.
// =====================================================================

export function VariantBNavItem() {
  const { unread } = useSampleNotifications();
  return (
    <NavLink
      to="/notifications?variant=B"
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )
      }
    >
      <Bell className="size-4" />
      <span className="flex-1">Notifications</span>
      {unread > 0 && (
        <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
          {unread}
        </span>
      )}
    </NavLink>
  );
}

function dayBucket(m: number) {
  if (m < D) return "Today";
  if (m < 2 * D) return "Yesterday";
  return "Earlier";
}

export function VariantBInboxPage() {
  const { items, unread, toggleRead, markRead, markAllRead } =
    useSampleNotifications();
  const [tab, setTab] = useState<"unread" | "all">("unread");
  const shown = tab === "unread" ? items.filter((n) => !n.read) : items;
  const buckets = ["Today", "Yesterday", "Earlier"]
    .map((b) => ({
      b,
      rows: shown.filter((n) => dayBucket(n.minutesAgo) === b),
    }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">{unread} unread</p>
        </div>
        <button
          onClick={markAllRead}
          disabled={unread === 0}
          className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
        >
          <CheckCheck className="size-4" /> Mark all read
        </button>
      </div>

      <div className="mb-4 flex gap-1 border-b">
        {(["unread", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm capitalize",
              tab === t
                ? "border-primary font-semibold"
                : "border-transparent text-muted-foreground"
            )}
          >
            {t}
            {t === "unread" && unread > 0 ? ` (${unread})` : ""}
          </button>
        ))}
      </div>

      {buckets.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Nothing unread. Switch to “All” to see older Notifications.
        </div>
      )}

      {buckets.map(({ b, rows }) => (
        <section key={b} className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {b}
          </h2>
          <ul className="divide-y rounded-lg border">
            {rows.map((n) => (
              <li
                key={n.id}
                className="group flex items-center gap-4 px-4 py-3"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <KindIcon kind={n.kind} />
                </div>
                <Link
                  to={n.href}
                  onClick={() => markRead(n.id)}
                  className="min-w-0 flex-1"
                >
                  <div className={cn("text-sm", !n.read && "font-semibold")}>
                    {n.title}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {n.excerpt}
                  </div>
                </Link>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <div>{n.subject}</div>
                  <div>{ago(n.minutesAgo)} ago</div>
                </div>
                <button
                  onClick={() => toggleRead(n.id)}
                  className="shrink-0 rounded-md border px-2 py-1 text-xs opacity-0 hover:bg-accent group-hover:opacity-100"
                >
                  Mark {n.read ? "unread" : "read"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className="rounded border">
        <StateReadout />
      </div>
    </div>
  );
}

// =====================================================================
// Variant C: bell next to the avatar in the sidebar footer, opens a
// full-height drawer from the right. The badge counts *unseen*: opening
// the drawer clears it, but items stay unread (bold) until clicked.
// Notifications about the same subject collapse into one row.
// =====================================================================

export function VariantCFooterBell() {
  const { unseen, markAllSeen } = useSampleNotifications();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          markAllSeen();
        }}
        title="Notifications"
        className="relative rounded-md p-1 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <Bell className="size-4" />
        {unseen > 0 && (
          <span className="absolute right-0.5 top-0.5 size-2 rounded-full bg-red-500 ring-2 ring-sidebar" />
        )}
      </button>
      {open && <GroupedDrawer onClose={() => setOpen(false)} />}
    </>
  );
}

function GroupedDrawer({ onClose }: { onClose: () => void }) {
  const { items, unread, markRead, markAllRead } = useSampleNotifications();
  const [expanded, setExpanded] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, SampleNotification[]>();
    for (const n of items) {
      const key = `${n.kind}:${n.subject}`;
      map.set(key, [...(map.get(key) ?? []), n]);
    }
    return [...map.entries()].map(([key, rows]) => ({ key, rows }));
  }, [items]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-screen w-[26rem] flex-col border-l bg-background shadow-2xl">
        <div className="flex h-14 items-center justify-between border-b px-4">
          <span className="font-semibold">Notifications</span>
          <div className="flex items-center gap-3">
            <button
              onClick={markAllRead}
              disabled={unread === 0}
              className="text-xs text-primary disabled:text-muted-foreground"
            >
              Mark all read
            </button>
            <button onClick={onClose} className="rounded p-1 hover:bg-accent">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {groups.map(({ key, rows }) => {
            const first = rows[0];
            const groupUnread = rows.filter((r) => !r.read).length;
            const many = rows.length > 1;
            const isOpen = expanded === key;
            const actors = [
              ...new Set(rows.map((r) => r.actor).filter(Boolean)),
            ];
            const headline = many
              ? summary(
                  first.kind,
                  rows.length,
                  actors as string[],
                  first.subject
                )
              : first.title;
            return (
              <div key={key} className="border-b">
                <div
                  className={cn(
                    "flex gap-3 px-4 py-3",
                    groupUnread > 0 && "bg-primary/5"
                  )}
                >
                  <KindIcon
                    kind={first.kind}
                    className="mt-0.5 shrink-0 text-muted-foreground"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={first.href}
                      onClick={() => {
                        rows.forEach((r) => markRead(r.id));
                        onClose();
                      }}
                      className={cn(
                        "block text-sm hover:underline",
                        groupUnread > 0 && "font-semibold"
                      )}
                    >
                      {headline}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">
                      “{first.excerpt}”
                    </div>
                    <div className="mt-1 flex gap-2 text-[11px] text-muted-foreground">
                      <span>{ago(first.minutesAgo)}</span>
                      {many && (
                        <button
                          onClick={() => setExpanded(isOpen ? null : key)}
                          className="underline"
                        >
                          {isOpen ? "hide" : `show all ${rows.length}`}
                        </button>
                      )}
                    </div>
                  </div>
                  {groupUnread > 0 && (
                    <span className="mt-1 h-fit rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                      {groupUnread}
                    </span>
                  )}
                </div>
                {isOpen && (
                  <ul className="bg-muted/40 pb-2 pl-11 pr-4">
                    {rows.map((r) => (
                      <li key={r.id} className="py-1 text-xs">
                        <span className={cn(!r.read && "font-semibold")}>
                          {r.actor ?? r.title}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {r.excerpt} · {ago(r.minutesAgo)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
        <StateReadout />
      </aside>
    </>
  );
}

function summary(kind: Kind, count: number, actors: string[], subject: string) {
  const who =
    actors.length === 0
      ? ""
      : actors.length === 1
        ? actors[0]
        : `${actors[0]} and ${actors.length - 1} other${actors.length > 2 ? "s" : ""}`;
  switch (kind) {
    case "reply":
      return `${count} new Replies on “${subject}” from ${who}`;
    case "question":
      return `${count} new Questions on “${subject}”`;
    case "lesson":
      return `${count} new lessons in ${subject}`;
    case "refund-raised":
      return `${count} new Refund Requests from ${who}`;
    default:
      return `${count} updates on ${subject}`;
  }
}
