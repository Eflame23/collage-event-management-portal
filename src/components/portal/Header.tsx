import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  CircleAlert,
  Info,
  Lock,
  LogOut,
  Moon,
  Search,
  Sun,
} from "lucide-react";
import crestAsset from "@/assets/mit-adt-logo.jpg.asset.json";
import { type NotificationItem } from "./data";
import { ROLE_ID_LABELS, ROLE_LABELS, roleBadge, type SessionProfile } from "./portal-logic";

export const TABS = [
  "Discovery & Events",
  "Campus Calendar",
  "Organizer Hub",
  "My Passes & Alerts",
] as const;

export type TabName = (typeof TABS)[number];

interface HeaderProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  unreadCount: number;
  passesCount: number;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  /** The signed-in user (built from the ID entered at login). */
  session: SessionProfile;
  onLogout: () => void;
}

export function Header({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  unreadCount,
  passesCount,
  notifications,
  onMarkAllRead,
  theme,
  onThemeToggle,
  session,
  onLogout,
}: HeaderProps) {
  const role = session.role;
  return (
    <header className="sticky top-0 z-40 border-b border-portal-gold/30 bg-portal-purple/95 shadow-portal backdrop-blur-md">
      <div className="flex w-full items-center justify-between gap-6 px-6 py-3 lg:px-10">
        {/* Left: crest emblem + wordmark */}
        <div className="flex shrink-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-md ring-2 ring-portal-gold sm:h-14 sm:w-14">
            <img
              src={crestAsset.url}
              alt="MIT-ADT University crest"
              className="size-full object-cover"
            />
          </span>
          <div className="hidden leading-tight sm:block">
            <p
              className="font-display text-base font-bold tracking-wider text-white xl:text-lg"
              style={{
                textShadow:
                  "0 1px 3px color-mix(in oklab, var(--portal-gold) 55%, transparent)",
              }}
            >
              MIT-ADT UNIVERSITY
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-portal-gold sm:text-xs">
              Campus Event Management Portal
            </p>
          </div>
        </div>

        {/* Search: fills the space between the logo and the nav tabs */}
        <div className="relative hidden min-w-[9rem] max-w-md flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/60" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search events..."
            aria-label="Search events"
            className="w-full rounded-full border border-white/15 bg-white/10 py-2 pl-9 pr-4 text-sm text-white placeholder:text-slate-300 transition-colors focus:border-portal-gold focus:bg-white/20 focus:outline-none"
          />
        </div>

        {/* Nav tabs */}
        <nav className="scrollbar-thin flex min-w-0 items-center gap-2 overflow-x-auto max-md:flex-1 lg:gap-4">
          {TABS.map((tab) => {
            const active = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange(tab)}
                aria-current={active ? "page" : undefined}
                className={`relative shrink-0 whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-semibold leading-tight transition-colors lg:text-[15px] ${
                  active ? "text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab === "Campus Calendar" ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <CalendarDays className="size-4" aria-hidden />
                    {tab}
                  </span>
                ) : tab === "Organizer Hub" && role === "student" ? (
                  <span
                    className="flex items-center justify-center gap-1.5"
                    title="Faculty / Admin role required"
                  >
                    {tab}
                    <Lock className="size-3.5 opacity-70" aria-label="Restricted" />
                  </span>
                ) : (
                  <span className="block">{tab}</span>
                )}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-2 bottom-0 h-[3px] rounded-full bg-portal-gold"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Far right: notifications, theme toggle, profile avatar */}
        <div className="flex shrink-0 items-center gap-3">
          <NotificationPopover
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={onMarkAllRead}
          />
          <button
            type="button"
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            aria-pressed={theme === "dark"}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            onClick={onThemeToggle}
            className="rounded-full p-2 text-white transition-colors hover:bg-white/10"
          >
            {theme === "light" ? <Moon className="size-5" /> : <Sun className="size-5" />}
          </button>
          <ProfilePopover
            unreadCount={unreadCount}
            passesCount={passesCount}
            session={session}
            onLogout={onLogout}
          />
        </div>
      </div>
    </header>
  );
}

function NotificationPopover({
  notifications,
  unreadCount,
  onMarkAllRead,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkAllRead: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
        aria-controls="live-notifications"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-full p-2 text-white transition-colors hover:bg-white/10"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4.5 items-center justify-center rounded-full bg-portal-magenta text-[10px] font-bold text-white shadow-[0_0_8px_var(--portal-magenta)]">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <section
          id="live-notifications"
          aria-label="Live notifications"
          className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-portal-hairline bg-card shadow-portal"
        >
          <div className="flex items-center justify-between gap-3 border-b border-portal-hairline px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Notifications</h2>
              <p className="text-[11px] text-muted-foreground">
                {unreadCount} unread
              </p>
            </div>
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
              className="text-xs font-bold text-portal-gold-text transition-colors hover:text-portal-gold disabled:cursor-default disabled:opacity-50"
            >
              Mark all as read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                You’re all caught up.
              </p>
            ) : (
              notifications.map((item) => {
                const ItemIcon = item.kind === "alert" ? CircleAlert : Info;
                return (
                  <article
                    key={item.id}
                    className="flex gap-3 border-b border-portal-hairline px-4 py-3 last:border-b-0 hover:bg-secondary/60"
                  >
                    <span className="relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                      <ItemIcon
                        className={`size-4 ${item.kind === "alert" ? "text-destructive" : "text-portal-gold-text"}`}
                        aria-hidden
                      />
                      {item.unread && (
                        <span
                          aria-label="Unread"
                          className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-portal-magenta"
                        />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold leading-snug text-foreground">{item.title}</p>
                        <time className="shrink-0 text-[10px] text-muted-foreground">{item.time}</time>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.body}</p>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function ProfilePopover({
  unreadCount,
  passesCount,
  session,
  onLogout,
}: {
  unreadCount: number;
  passesCount: number;
  session: SessionProfile;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { role } = session;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Open profile menu"
        aria-expanded={open}
        title={`${session.displayName} (${ROLE_LABELS[role]})`}
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-portal-gold text-xs font-bold text-portal-purple ring-2 ring-white/20 transition-all hover:ring-portal-gold"
      >
        {session.initials}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-2xl border border-portal-hairline bg-card shadow-portal">
          <div className="border-b border-portal-hairline px-4 py-3">
            <p className="break-all font-mono text-sm font-bold text-foreground">
              {session.displayName}
            </p>
            <p className="text-xs text-muted-foreground">{session.subtitle}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {ROLE_ID_LABELS[role]}:{" "}
              <span className="break-all font-mono font-semibold text-foreground">
                {session.userId}
              </span>
            </p>
            <span className="mt-2 inline-flex items-center rounded-full bg-portal-gold-soft px-2 py-0.5 text-[10px] font-semibold text-portal-gold-text">
              {roleBadge(role)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 px-4 py-3">
            <div className="rounded-xl bg-secondary px-3 py-2">
              <p className="text-lg font-extrabold text-portal-regal">{passesCount}</p>
              <p className="text-[10px] font-semibold text-muted-foreground">
                {role === "student" ? "Registered Passes" : "My Passes"}
              </p>
            </div>
            <div className="rounded-xl bg-secondary px-3 py-2">
              <p className="text-lg font-extrabold text-portal-magenta">{unreadCount}</p>
              <p className="text-[10px] font-semibold text-muted-foreground">Unread Alerts</p>
            </div>
          </div>

          <div className="border-t border-portal-hairline p-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90"
            >
              <LogOut className="size-4" aria-hidden />
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}