import { Bell, CalendarDays, Search } from "lucide-react";
import crestAsset from "@/assets/mit-adt-crest.png.asset.json";
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
}

export function Header({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  unreadCount,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-portal-purple shadow-portal">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        {/* Crest emblem + wordmark */}
        <div className="flex shrink-0 items-center gap-2.5">
          <img
            src={crestAsset.url}
            alt="MIT-ADT University crest"
            className="h-10 w-10 rounded-full border-2 border-portal-gold bg-white object-cover sm:h-12 sm:w-12"
          />
          <div className="hidden leading-tight sm:block">
            <p className="font-display text-base font-bold tracking-wide text-white sm:text-lg">
              MIT-ADT UNIVERSITY
            </p>
            <p className="text-[11px] font-semibold text-portal-gold sm:text-xs">
              Campus Event Management Portal
            </p>
          </div>
        </div>

        {/* Integrated search */}
        <div className="relative mx-1 hidden min-w-0 flex-1 md:block lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/60" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            aria-label="Search events"
            className="w-full rounded-full border border-white/20 bg-white/10 py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/50 focus:border-portal-gold focus:outline-none focus:ring-1 focus:ring-portal-gold"
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

        {/* Bell + profile capsule */}
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
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1 pl-1 pr-2.5 sm:pr-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-portal-gold text-[11px] font-extrabold text-white">
              {STUDENT.initials}
            </span>
            <span className="hidden text-xs font-semibold text-white sm:block">
              {STUDENT.name} | {STUDENT.division}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
