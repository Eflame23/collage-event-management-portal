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
  isSameDay,
  monthGridCells,
  parseEventDate,
  parseEventTime,
} from "./data";
import { seatPercent } from "./portal-logic";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MAX_CHIPS_PER_CELL = 2;
const PANEL =
  "overflow-hidden rounded-xl border border-slate-300/80 bg-card shadow-md dark:border-portal-hairline dark:shadow-sm";
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
const CATEGORY_DOT_STYLE: Record<EventCategory, string> = {
  Technical: "bg-category-technical",
  Cultural: "bg-category-cultural",
  Workshops: "bg-category-workshop",
  Competitions: "bg-category-competition",
};
const CATEGORY_PILL_STYLE: Record<EventCategory, string> = {
  Technical: "bg-category-technical/10 text-category-technical",
  Cultural: "bg-category-cultural/10 text-category-cultural",
  Workshops: "bg-category-workshop/10 text-category-workshop",
  Competitions: "bg-category-competition/10 text-category-competition",
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

  // Initial view: the month with the most upcoming events, so the grid opens
  // rich with events instead of sparse (falls back to the current month).
  const [view, setView] = useState(() => busiestUpcomingMonth(events));
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [selected, setSelected] = useState<CampusEvent | null>(null);

  const visibleEvents = useMemo(
    () => (filter === "mine" ? events.filter((e) => registeredIds.has(e.id)) : events),
    [events, filter, registeredIds],
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

  // Chronological agenda for the viewed month (respects the All / Mine filter).
  const agendaEvents = useMemo(
    () =>
      [...eventsByDay.entries()]
        .sort(([a], [b]) => a - b)
        .flatMap(([day, list]) =>
          list.map((event, index) => ({ day, event, firstOfDay: index === 0 })),
        ),
    [eventsByDay],
  );

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

  const scrollToAgendaDay = (day: number) => {
    document
      .getElementById(`agenda-day-${day}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openEvent = (event: CampusEvent) => {
    setSelected(event);
    if (registeredIds.has(event.id)) onViewPass(event);
  };

  if (!mounted) {
    return (
      <div
        aria-hidden
        className="h-[30rem] animate-pulse rounded-2xl border border-slate-300/80 bg-card shadow-md dark:border-portal-hairline"
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
            nextUpcoming.startsAt.getDate(),
          ).getTime() -
            todayStart.getTime()) /
            86_400_000,
        ),
      )
    : null;

  return (
    <div className="space-y-5">
      <section aria-label="Calendar summary" className={`grid grid-cols-1 sm:grid-cols-3 ${PANEL}`}>
        <div className="flex items-center gap-3 border-b border-portal-hairline px-4 py-4 sm:border-b-0 sm:border-r sm:px-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-portal-gold-soft text-portal-gold-text">
            <CalendarDays className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase text-muted-foreground">
              Total Events This Month
            </p>
            <p className="text-xl font-extrabold text-foreground">{monthEvents.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 border-b border-portal-hairline px-4 py-4 sm:border-b-0 sm:border-r sm:px-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-category-competition/10 text-category-competition">
            <TicketCheck className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase text-muted-foreground">
              Your Registered Events
            </p>
            <p className="text-xl font-extrabold text-foreground">{registeredThisMonth}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-category-workshop/10 text-category-workshop">
            <Clock3 className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase text-muted-foreground">
              Next Upcoming Event
            </p>
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

      <section className={PANEL}>
        {/* Header: title + month navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-portal-hairline px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-portal-gold-soft text-portal-gold-text">
              <CalendarDays className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-portal-regal">Campus Calendar</h2>
              <p className="text-xs text-muted-foreground">
                Every MIT-ADT event on a live month grid
              </p>
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
            <span
              className="min-w-[9.5rem] text-center text-sm font-bold text-portal-regal"
              aria-live="polite"
            >
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
              <span aria-hidden className={`h-3 w-1 rounded-sm ${CATEGORY_DOT_STYLE[category]}`} />
              {category}
            </span>
          ))}
        </div>

        {/* Weekday header + day grid (scrolls sideways on narrow screens) */}
        <div className="scrollbar-thin overflow-x-auto">
          <div className="min-w-[840px]">
            <div className="grid grid-cols-7 border-t border-portal-hairline bg-secondary/60 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {WEEKDAYS.map((day) => (
                <div key={day} className="px-2 py-2 text-center">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {cells.map((day, index) => {
                const inMonth = day !== null;
                const dayEvents = inMonth ? (eventsByDay.get(day) ?? []) : [];
                const hasEvents = dayEvents.length > 0;
                const isToday = inMonth && isSameDay(new Date(view.year, view.month, day), today);
                return (
                  <div
                    key={index}
                    className={`relative min-h-[135px] border-b border-r border-portal-hairline p-2 transition-colors duration-200 last:border-r-0 hover:z-10 hover:bg-secondary/60 ${
                      !inMonth ? "bg-secondary/50" : hasEvents ? "bg-portal-gold-soft/30" : ""
                    } ${isToday ? "z-10 bg-portal-gold-soft/40 ring-2 ring-portal-gold ring-inset" : ""}`}
                  >
                    {inMonth && (
                      <>
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            isToday
                              ? "border border-portal-gold bg-portal-purple text-white ring-2 ring-portal-gold/40"
                              : hasEvents
                                ? "bg-portal-gold-soft text-portal-gold-text"
                                : "bg-secondary/70 text-foreground"
                          }`}
                        >
                          {day}
                        </span>
                        <div className="mt-1.5 space-y-1.5">
                          {dayEvents.slice(0, MAX_CHIPS_PER_CELL).map((event) => (
                            <EventChip
                              key={event.id}
                              event={event}
                              registered={registeredIds.has(event.id)}
                              onClick={() => openEvent(event)}
                            />
                          ))}
                          {dayEvents.length > MAX_CHIPS_PER_CELL && (
                            <button
                              type="button"
                              onClick={() => scrollToAgendaDay(day)}
                              className="w-full rounded-md px-1.5 py-0.5 text-left text-[10px] font-bold text-portal-gold-text underline-offset-2 hover:underline"
                            >
                              +{dayEvents.length - MAX_CHIPS_PER_CELL} more — see schedule
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 px-5 py-3 text-[11px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full bg-portal-gold" />
            Event card — click for details
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full bg-portal-ok" />✓ Registered
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full bg-destructive" />
            Cancelled
          </span>
        </div>
      </section>

      {/* Selected month schedule agenda */}
      <section aria-label={`${monthLabel} schedule`} className={PANEL}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-portal-hairline px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-portal-gold-soft text-portal-gold-text">
              <Clock3 className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-portal-regal">
                {monthLabel} Schedule
              </h2>
              <p className="text-xs text-muted-foreground">
                {agendaEvents.length} event{agendaEvents.length === 1 ? "" : "s"} in chronological
                order
              </p>
            </div>
          </div>
        </div>

        {agendaEvents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <CalendarDays className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm font-bold text-foreground">No events scheduled in {monthLabel}</p>
            <p className="text-xs text-muted-foreground">
              Use the arrows above to browse other months
              {filter === "mine" ? ", or switch back to All Campus Events." : "."}
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-portal-hairline">
            {agendaEvents.map(({ day, event, firstOfDay }) => (
              <AgendaRow
                key={event.id}
                anchorId={firstOfDay ? `agenda-day-${day}` : undefined}
                date={new Date(view.year, view.month, day)}
                event={event}
                registered={registeredIds.has(event.id)}
                onOpen={() => setSelected(event)}
                onRegister={onRegister}
                onViewPass={onViewPass}
                onJoinWaitlist={onJoinWaitlist}
              />
            ))}
          </ol>
        )}
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
  const time = eventTimeLabel(event.dateLabel);
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${event.title} — ${event.dateLabel} — ${event.venue}`}
      className={`block w-full overflow-hidden rounded-md border border-l-4 px-2 py-1.5 text-left shadow-sm transition-[filter,box-shadow] hover:shadow-md ${
        event.cancelled
          ? "border-destructive/40 border-l-destructive bg-destructive/10 text-destructive"
          : `${CATEGORY_CHIP_STYLE[event.category]} hover:brightness-95 dark:hover:brightness-110`
      }`}
    >
      <span className="flex items-start gap-1">
        <span
          className={`line-clamp-1 min-w-0 flex-1 text-xs font-bold ${event.cancelled ? "line-through" : ""}`}
        >
          {event.title}
        </span>
        {event.cancelled ? (
          <span className="shrink-0 rounded-full bg-destructive px-1 py-px text-[8px] font-extrabold uppercase text-white">
            Cancelled
          </span>
        ) : registered ? (
          <span
            aria-label="Registered"
            className="flex size-4 shrink-0 items-center justify-center rounded-full bg-portal-ok text-[9px] font-extrabold text-white"
          >
            ✓
          </span>
        ) : null}
      </span>
      <span className="mt-0.5 block truncate text-[10px] opacity-80">
        {time ? `${time} · ${event.venue}` : event.venue}
      </span>
    </button>
  );
}

function AgendaRow({
  anchorId,
  date,
  event,
  registered,
  onOpen,
  onRegister,
  onViewPass,
  onJoinWaitlist,
}: {
  anchorId?: string;
  date: Date;
  event: CampusEvent;
  registered: boolean;
  onOpen: () => void;
  onRegister: (event: CampusEvent) => void;
  onViewPass: (event: CampusEvent) => void;
  onJoinWaitlist: (event: CampusEvent) => void;
}) {
  const time = eventTimeLabel(event.dateLabel);
  const seatsLeft = Math.max(0, event.capacity - event.taken);
  const full = seatsLeft === 0;
  return (
    <li
      id={anchorId}
      className="flex scroll-mt-24 flex-col gap-4 px-5 py-4 transition-colors hover:bg-secondary/40 sm:flex-row sm:items-center"
    >
      {/* Date badge */}
      <div
        aria-hidden
        className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-portal-gold/40 bg-portal-gold-soft py-1.5 text-portal-gold-text"
      >
        <span className="text-[10px] font-bold uppercase tracking-wider">
          {date.toLocaleDateString("en-US", { weekday: "short" })}
        </span>
        <span className="text-xl font-extrabold leading-none">{date.getDate()}</span>
        <span className="mt-0.5 text-[10px] font-bold uppercase">
          {date.toLocaleDateString("en-US", { month: "short" })}
        </span>
      </div>

      {/* Title, time, venue */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpen}
            className={`text-left text-sm font-bold text-foreground underline-offset-2 hover:underline ${
              event.cancelled ? "line-through opacity-70" : ""
            }`}
          >
            {event.title}
          </button>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CATEGORY_PILL_STYLE[event.category]}`}
          >
            {event.category}
          </span>
          {event.cancelled && (
            <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
              Cancelled
            </span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock3 className="size-3.5 text-portal-gold" aria-hidden />
            {time || "Time TBA"}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-portal-gold" aria-hidden />
            {event.venue}
          </span>
        </div>
      </div>

      {/* Seat availability */}
      <div className="w-full shrink-0 sm:w-40">
        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="size-3" aria-hidden />
            {full ? "Full" : `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left`}
          </span>
          <span>
            {event.taken}/{event.capacity}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-portal-hairline">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${full ? "bg-destructive" : "bg-portal-gold"}`}
            style={{ width: `${seatPercent(event)}%` }}
          />
        </div>
      </div>

      <AgendaAction
        event={event}
        registered={registered}
        onRegister={onRegister}
        onViewPass={onViewPass}
        onJoinWaitlist={onJoinWaitlist}
      />
    </li>
  );
}

function AgendaAction({
  event,
  registered,
  onRegister,
  onViewPass,
  onJoinWaitlist,
}: DrawerActionProps) {
  const base = "w-full shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition-colors sm:w-36";
  if (event.cancelled) {
    return (
      <button
        type="button"
        disabled
        className={`${base} cursor-not-allowed bg-muted text-muted-foreground`}
      >
        Cancelled
      </button>
    );
  }
  if (registered) {
    return (
      <button
        type="button"
        onClick={() => onViewPass(event)}
        className={`${base} border border-portal-gold bg-portal-gold-soft text-portal-gold-text hover:bg-portal-gold hover:text-white`}
      >
        View Pass
      </button>
    );
  }
  if (event.taken >= event.capacity) {
    return (
      <button
        type="button"
        onClick={() => onJoinWaitlist(event)}
        className={`${base} bg-secondary text-muted-foreground hover:bg-portal-hairline`}
      >
        Join Waitlist
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onRegister(event)}
      className={`${base} bg-portal-gold text-white shadow-gold hover:bg-portal-gold/90`}
    >
      Register
    </button>
  );
}

/** "25 Nov 2026, 10:00 AM" -> "10:00 AM" (empty string if no time is present). */
function eventTimeLabel(dateLabel: string): string {
  const match = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(dateLabel);
  if (!match) return "";
  return `${Number(match[1])}:${match[2]} ${match[3]!.toUpperCase()}`;
}

/** Month (from today onward) holding the most non-cancelled events; ties go to the earlier month. */
function busiestUpcomingMonth(events: CampusEvent[]): { year: number; month: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = new Map<number, { year: number; month: number; count: number }>();
  for (const event of events) {
    if (event.cancelled) continue;
    const date = parseEventDate(event.dateLabel);
    if (!date || date.getTime() < today.getTime()) continue;
    const key = date.getFullYear() * 12 + date.getMonth();
    const bucket = buckets.get(key) ?? {
      year: date.getFullYear(),
      month: date.getMonth(),
      count: 0,
    };
    bucket.count += 1;
    buckets.set(key, bucket);
  }
  const best = [...buckets.entries()].sort(
    ([keyA, a], [keyB, b]) => b.count - a.count || keyA - keyB,
  )[0]?.[1];
  return best
    ? { year: best.year, month: best.month }
    : { year: today.getFullYear(), month: today.getMonth() };
}

function getNextUpcomingEvent(
  events: CampusEvent[],
  now: Date,
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
        entry !== null && entry.startsAt.getTime() >= now.getTime(),
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
