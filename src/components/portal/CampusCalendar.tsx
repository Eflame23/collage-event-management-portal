import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  TicketCheck,
  Users,
  X,
} from "lucide-react";

import {
  type CampusEvent,
  type EventCategory,
  CATEGORIES,
  earliestUpcomingEvent,
  isSameDay,
  monthGridCells,
  parseEventDate,
  parseEventTime,
} from "./data";
import { seatPercent } from "./portal-logic";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MAX_CHIPS_PER_CELL = 2;
const CATEGORY_CHIP_STYLE: Record<EventCategory, string> = {
  Technical:
    "border-l-category-technical bg-gradient-to-r from-category-technical/15 to-card text-category-technical",
  Cultural:
    "border-l-category-cultural bg-gradient-to-r from-category-cultural/15 to-card text-category-cultural",
  Workshops:
    "border-l-category-workshop bg-gradient-to-r from-category-workshop/15 to-card text-category-workshop",
  Competitions:
    "border-l-category-competition bg-gradient-to-r from-category-competition/15 to-card text-category-competition",
};

type CalendarFilter = "all" | "mine";

interface CampusCalendarProps {
  events: CampusEvent[];
  registeredIds: Set<string>;
  onRegister: (event: CampusEvent) => void;
  onViewPass: (event: CampusEvent) => void;
  onJoinWaitlist: (event: CampusEvent) => void;
}

export function CampusCalendar({
  events,
  registeredIds,
  onRegister,
  onViewPass,
  onJoinWaitlist,
}: CampusCalendarProps) {
  // The active month depends on the viewer's clock, so the grid renders
  // client-side only to avoid a server/client hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Initial view: month & year of the earliest upcoming event, else this month.
  const [view, setView] = useState(() => {
    const first = earliestUpcomingEvent(events);
    const reference = (first && parseEventDate(first.dateLabel)) ?? new Date();
    return { year: reference.getFullYear(), month: reference.getMonth() };
  });
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [selected, setSelected] = useState<CampusEvent | null>(null);

  const visibleEvents = useMemo(
    () => (filter === "mine" ? events.filter((e) => registeredIds.has(e.id)) : events),
    [events, filter, registeredIds]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CampusEvent[]>();
    for (const event of visibleEvents) {
      const date = parseEventDate(event.dateLabel);
      if (!date || date.getFullYear() !== view.year || date.getMonth() !== view.month) continue;
      const day = date.getDate();
      const list = map.get(day) ?? [];
      list.push(event);
      map.set(day, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => parseEventTime(a.dateLabel) - parseEventTime(b.dateLabel));
    }
    return map;
  }, [visibleEvents, view.year, view.month]);

  const cells = monthGridCells(view.year, view.month);
  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const stepMonth = (delta: number) => {
    const next = new Date(view.year, view.month + delta, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  };

  const goToday = () => {
    const now = new Date();
    setView({ year: now.getFullYear(), month: now.getMonth() });
  };

  const openEvent = (event: CampusEvent) => {
    setSelected(event);
    if (registeredIds.has(event.id)) onViewPass(event);
  };

  if (!mounted) {
    return (
      <div
        aria-hidden
        className="h-[30rem] animate-pulse rounded-2xl border border-portal-hairline bg-card"
      />
    );
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const monthEvents = events.filter((event) => {
    const date = parseEventDate(event.dateLabel);
    return date?.getFullYear() === view.year && date.getMonth() === view.month;
  });
  const registeredThisMonth = monthEvents.filter((event) => registeredIds.has(event.id)).length;
  const nextUpcoming = getNextUpcomingEvent(events, today);
  const countdownDays = nextUpcoming
    ? Math.max(
        0,
        Math.ceil(
          (new Date(
            nextUpcoming.startsAt.getFullYear(),
            nextUpcoming.startsAt.getMonth(),
            nextUpcoming.startsAt.getDate()
          ).getTime() -
            todayStart.getTime()) /
            86_400_000
        )
      )
    : null;

  return (
    <div className="space-y-5">
      <section
        aria-label="Calendar summary"
        className="grid grid-cols-1 overflow-hidden rounded-xl border border-portal-hairline bg-card shadow-sm sm:grid-cols-3"
      >
        <div className="flex items-center gap-3 border-b border-portal-hairline px-4 py-4 sm:border-b-0 sm:border-r sm:px-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-portal-gold-soft text-portal-gold-text">
            <CalendarDays className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase text-muted-foreground">Total Events This Month</p>
            <p className="text-xl font-extrabold text-foreground">{monthEvents.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 border-b border-portal-hairline px-4 py-4 sm:border-b-0 sm:border-r sm:px-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-category-competition/10 text-category-competition">
            <TicketCheck className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase text-muted-foreground">Your Registered Events</p>
            <p className="text-xl font-extrabold text-foreground">{registeredThisMonth}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-category-workshop/10 text-category-workshop">
            <Clock3 className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase text-muted-foreground">Next Upcoming Event</p>
            <p className="truncate text-sm font-bold text-foreground">
              {nextUpcoming?.event.title ?? "No upcoming events"}
            </p>
          </div>
          {countdownDays !== null && (
            <span className="shrink-0 rounded-full bg-portal-gold-soft px-2.5 py-1 text-[10px] font-extrabold text-portal-gold-text">
              {countdownDays === 0
                ? "Today"
                : `In ${countdownDays} day${countdownDays === 1 ? "" : "s"}`}
            </span>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-portal-hairline bg-card shadow-sm">
        {/* Header: title + month navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-portal-hairline px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-portal-gold-soft text-portal-gold-text">
              <CalendarDays className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-portal-regal">Campus Calendar</h2>
              <p className="text-xs text-muted-foreground">Every MIT-ADT event on a live month grid</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => stepMonth(-1)}
              aria-label="Previous month"
              className="rounded-lg border border-portal-hairline p-2 text-foreground transition-colors hover:bg-secondary"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[9.5rem] text-center text-sm font-bold text-portal-regal" aria-live="polite">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => stepMonth(1)}
              aria-label="Next month"
              className="rounded-lg border border-portal-hairline p-2 text-foreground transition-colors hover:bg-secondary"
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="ml-1 rounded-lg border border-portal-gold bg-portal-gold-soft px-3 py-1.5 text-xs font-bold text-portal-gold-text transition-colors hover:bg-portal-gold hover:text-white"
            >
              Today
            </button>
          </div>
        </div>

        {/* Filter toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
          <div className="flex rounded-full border border-portal-hairline bg-secondary p-1 text-xs font-bold">
            {(
              [
                { key: "all", label: "All Campus Events" },
                { key: "mine", label: "My Registered Only" },
              ] as const
            ).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setFilter(option.key)}
                aria-pressed={filter === option.key}
                className={`rounded-full px-4 py-1.5 transition-colors ${
                  filter === option.key
                    ? "bg-portal-purple text-white shadow-portal"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs font-semibold text-muted-foreground">
            {visibleEvents.length} event{visibleEvents.length === 1 ? "" : "s"} this view
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-portal-hairline px-5 py-3 text-[11px] font-semibold text-muted-foreground">
          <span className="font-bold text-foreground">Categories</span>
          {CATEGORIES.map((category) => (
            <span key={category} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={`h-3 w-1 rounded-sm ${CATEGORY_CHIP_STYLE[category].split(" ")[0]}`}
              />
              {category}
            </span>
          ))}
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 border-t border-portal-hairline bg-secondary/60 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-2 py-2 text-center">
              {day}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, index) => {
            const inMonth = day !== null;
            const dayEvents = inMonth ? (eventsByDay.get(day) ?? []) : [];
            const isToday =
              inMonth && isSameDay(new Date(view.year, view.month, day), today);
            return (
              <div
                key={index}
                className={`relative min-h-[6.25rem] border-b border-r border-portal-hairline p-1.5 transition-transform duration-200 last:border-r-0 hover:z-10 hover:-translate-y-0.5 hover:bg-secondary/60 ${
                  inMonth ? "" : "bg-secondary/50"
                } ${isToday ? "z-10 bg-portal-gold-soft/25 ring-2 ring-portal-gold ring-inset" : ""}`}
              >
                {inMonth && (
                  <>
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                        isToday
                          ? "border border-portal-gold bg-portal-purple text-white ring-2 ring-portal-gold/40"
                          : "text-foreground"
                      }`}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, MAX_CHIPS_PER_CELL).map((event) => (
                        <EventChip
                          key={event.id}
                          event={event}
                          registered={registeredIds.has(event.id)}
                          onClick={() => openEvent(event)}
                        />
                      ))}
                      {dayEvents.length > MAX_CHIPS_PER_CELL && dayEvents[MAX_CHIPS_PER_CELL] && (
                        <button
                          type="button"
                          onClick={() => {
                            const event = dayEvents[MAX_CHIPS_PER_CELL];
                            if (event) openEvent(event);
                          }}
                          className="w-full rounded-md px-1.5 py-0.5 text-left text-[10px] font-bold text-portal-gold-text underline-offset-2 hover:underline"
                        >
                          +{dayEvents.length - MAX_CHIPS_PER_CELL} more
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 px-5 py-3 text-[11px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full bg-portal-gold" />
            Event chip — click for details
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full bg-portal-ok" />
            ✓ Registered
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full bg-destructive" />
            Cancelled
          </span>
        </div>
      </section>

      {/* Event details side drawer */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${selected.title} details`}
          className="fixed inset-0 z-50"
        >
          <div
            className="absolute inset-0 bg-portal-regal/50 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md animate-in slide-in-from-right flex-col overflow-y-auto bg-background shadow-portal duration-300">
            <div className="relative">
              <img
                src={selected.image}
                alt={selected.title}
                className={`h-40 w-full object-cover ${selected.cancelled ? "opacity-40 grayscale" : ""}`}
              />
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close details"
                className="absolute right-3 top-3 rounded-full bg-portal-regal/60 p-2 text-white transition-colors hover:bg-portal-regal"
              >
                <X className="size-4" />
              </button>
              <span className="absolute left-3 top-3 rounded-full bg-portal-purple px-2.5 py-1 text-[11px] font-bold text-white">
                {selected.category}
              </span>
            </div>

            <div className="flex-1 space-y-4 p-5">
              <div>
                <h3 className="font-display text-2xl font-bold text-portal-regal">
                  {selected.title}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5 text-portal-gold" />
                    {selected.dateLabel}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-portal-gold" />
                    {selected.venue}
                  </span>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">
                {selected.description}
              </p>

              {selected.statusNote && (
                <p className="text-xs font-semibold text-portal-gold-text">{selected.statusNote}</p>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="size-3" />
                    {`${seatPercent(selected)}% filled`}
                  </span>
                  <span>
                    {selected.taken}/{selected.capacity} seats
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-portal-hairline">
                  <div
                    className="h-full rounded-full bg-portal-gold transition-[width] duration-500"
                    style={{ width: `${seatPercent(selected)}%` }}
                  />
                </div>
              </div>

              <DrawerAction
                event={selected}
                registered={registeredIds.has(selected.id)}
                onRegister={(event) => {
                  setSelected(null);
                  onRegister(event);
                }}
                onViewPass={(event) => {
                  setSelected(null);
                  onViewPass(event);
                }}
                onJoinWaitlist={(event) => {
                  setSelected(null);
                  onJoinWaitlist(event);
                }}
              />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function EventChip({
  event,
  registered,
  onClick,
}: {
  event: CampusEvent;
  registered: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${event.title} — ${event.dateLabel}`}
      className={`flex w-full items-center gap-1 overflow-hidden rounded-md border border-l-4 px-1.5 py-1 text-left text-[10px] font-semibold leading-tight transition-colors ${
        event.cancelled
          ? "border-destructive/40 border-l-destructive bg-destructive/10 text-destructive"
          : `${CATEGORY_CHIP_STYLE[event.category]} hover:brightness-95 dark:hover:brightness-110`
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{event.title}</span>
      {event.cancelled ? (
        <span className="shrink-0 rounded-full bg-destructive px-1 py-px text-[8px] font-extrabold uppercase text-white">
          Cancelled
        </span>
      ) : registered ? (
        <span className="shrink-0 whitespace-nowrap rounded-full bg-portal-ok px-1 py-px text-[8px] font-extrabold text-white">
          ✓ Registered
        </span>
      ) : null}
    </button>
  );
}

function getNextUpcomingEvent(
  events: CampusEvent[],
  now: Date
): { event: CampusEvent; startsAt: Date } | undefined {
  return events
    .filter((event) => !event.cancelled)
    .map((event) => {
      const date = parseEventDate(event.dateLabel);
      if (!date) return null;
      const startsAt = new Date(date);
      const minutes = parseEventTime(event.dateLabel);
      startsAt.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      return { event, startsAt };
    })
    .filter(
      (entry): entry is { event: CampusEvent; startsAt: Date } =>
        entry !== null && entry.startsAt.getTime() >= now.getTime()
    )
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
}

interface DrawerActionProps {
  event: CampusEvent;
  registered: boolean;
  onRegister: (event: CampusEvent) => void;
  onViewPass: (event: CampusEvent) => void;
  onJoinWaitlist: (event: CampusEvent) => void;
}

function DrawerAction({
  event,
  registered,
  onRegister,
  onViewPass,
  onJoinWaitlist,
}: DrawerActionProps) {
  if (event.cancelled) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-lg bg-muted py-2.5 text-sm font-bold text-muted-foreground"
      >
        Cancelled by Organizer
      </button>
    );
  }
  if (registered) {
    return (
      <button
        type="button"
        onClick={() => onViewPass(event)}
        className="w-full rounded-lg border border-portal-gold bg-portal-gold-soft py-2.5 text-sm font-bold text-portal-gold-text transition-colors hover:bg-portal-gold hover:text-white"
      >
        View My Pass
      </button>
    );
  }
  if (event.taken >= event.capacity) {
    return (
      <button
        type="button"
        onClick={() => onJoinWaitlist(event)}
        className="w-full cursor-pointer rounded-lg bg-secondary py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-portal-hairline"
      >
        Full (Join Waitlist)
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onRegister(event)}
      className="w-full rounded-lg bg-portal-gold py-2.5 text-sm font-bold text-white shadow-gold transition-colors hover:bg-portal-gold/90"
    >
      Register Now
    </button>
  );
}
