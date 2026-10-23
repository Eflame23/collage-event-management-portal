import { useEffect, useRef, useState } from "react";
import { Bell, CalendarDays, Search } from "lucide-react";
import crestAsset from "@/assets/mit-adt-logo.jpg.asset.json";
import { STUDENT } from "./data";

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
}

export function Header({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  unreadCount,
  passesCount,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-portal-gold/30 bg-portal-purple/95 shadow-portal backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        {/* Crest emblem + wordmark */}
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
              className="font-display text-base font-bold tracking-wider text-white sm:text-lg"
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

        {/* Dedicated search with breathing room before the tabs */}
        <div className="relative mr-6 hidden w-52 shrink-0 md:block lg:w-64">
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
        <nav className="scrollbar-thin flex min-w-0 flex-1 items-end gap-1 overflow-x-auto md:flex-none md:justify-end">
          {TABS.map((tab) => {
            const active = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange(tab)}
                aria-current={active ? "page" : undefined}
                className={`relative whitespace-nowrap rounded-t-md px-2.5 pb-2.5 pt-1.5 text-[13px] font-semibold leading-tight transition-colors sm:px-3 ${
                  active ? "text-white" : "text-white/70 hover:text-white"
                }`}
              >
                {tab === "Campus Calendar" ? (
                  <span className="flex items-center justify-center gap-1">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {tab}
                  </span>
                ) : (
                  <span className={`block max-w-[7rem] ${tab === "Discovery & Events" ? "text-center" : ""}`}>
                    {tab}
                  </span>
                )}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-1 bottom-0 h-[3px] rounded-full bg-portal-gold"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bell + compact profile avatar */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-label={`Notifications, ${unreadCount} unread`}
            onClick={() => onTabChange("My Passes & Alerts")}
            className="relative rounded-full p-2 text-white transition-colors hover:bg-white/10"
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4.5 items-center justify-center rounded-full bg-portal-magenta text-[10px] font-bold text-white shadow-[0_0_8px_var(--portal-magenta)]">
                {unreadCount}
              </span>
            )}
          </button>
          <ProfilePopover unreadCount={unreadCount} passesCount={passesCount} />
        </div>
      </div>
    </header>
  );
}

function ProfilePopover({ unreadCount, passesCount }: { unreadCount: number; passesCount: number }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Open profile menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-portal-gold text-xs font-bold text-portal-purple ring-2 ring-white/20 transition-all hover:ring-portal-gold"
      >
        {STUDENT.initials}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-portal-hairline bg-card shadow-portal">
          <div className="border-b border-portal-hairline px-4 py-3">
            <p className="font-bold text-foreground">{STUDENT.name}</p>
            <p className="text-xs text-muted-foreground">Division: {STUDENT.division}</p>
            <span className="mt-2 inline-flex items-center rounded-full bg-portal-gold-soft px-2 py-0.5 text-[10px] font-semibold text-portal-gold-text">
              Verified Student Attendee • MIT-ADT
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 px-4 py-3">
            <div className="rounded-xl bg-secondary px-3 py-2">
              <p className="text-lg font-extrabold text-portal-regal">{passesCount}</p>
              <p className="text-[10px] font-semibold text-muted-foreground">Registered Passes</p>
            </div>
            <div className="rounded-xl bg-secondary px-3 py-2">
              <p className="text-lg font-extrabold text-portal-magenta">{unreadCount}</p>
              <p className="text-[10px] font-semibold text-muted-foreground">Unread Alerts</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
