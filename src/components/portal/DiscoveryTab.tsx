import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import { type CampusEvent, CATEGORIES, HERO_PORTRAIT } from "./data";
import { categoryCounts, matchesSearch, seatPercent } from "./portal-logic";

interface DiscoveryTabProps {
  events: CampusEvent[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  registeredIds: Set<string>;
  onRegister: (event: CampusEvent) => void;
  onViewPass: (event: CampusEvent) => void;
  onJoinWaitlist: (event: CampusEvent) => void;
}

export function DiscoveryTab({
  events,
  searchQuery,
  onSearchChange,
  category,
  onCategoryChange,
  registeredIds,
  onRegister,
  onViewPass,
  onJoinWaitlist,
}: DiscoveryTabProps) {
  const counts = categoryCounts(events);
  const visible = events.filter(
    (e) => (category === "All Events" || e.category === category) && matchesSearch(e, searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <section className="relative overflow-hidden rounded-2xl border border-portal-hairline bg-portal-cream shadow-portal">
        <div className="flex flex-col gap-6 p-6 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h1 className="font-display text-4xl font-bold leading-tight text-portal-regal sm:text-5xl">
              Discover. Register. Participate.
            </h1>
            <div className="mt-4 flex items-center gap-3">
              <span aria-hidden className="h-1 w-14 rounded-full bg-portal-gold" />
              <p className="text-sm font-semibold text-muted-foreground sm:text-base">
                — Make Every Moment Count at MIT-ADT
              </p>
            </div>
          </div>
          <div className="relative shrink-0 self-end md:self-center">
            <div
              aria-hidden
              className="absolute -inset-3 rounded-3xl bg-portal-purple/10 rotate-3"
            />
            <img
              src={HERO_PORTRAIT}
              alt="MIT-ADT faculty speaker in festive attire"
              className="relative h-40 w-32 rounded-2xl border border-portal-hairline object-cover shadow-portal sm:h-48 sm:w-40"
            />
          </div>
        </div>
      </section>

      {/* Full-width search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by event, category, hall or tag..."
          aria-label="Search by event, category, hall or tag"
          className="w-full rounded-full border border-portal-hairline bg-card py-3 pl-11 pr-5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-portal-gold focus:outline-none focus:ring-2 focus:ring-portal-gold/30"
        />
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {(["All Events", ...CATEGORIES] as const).map((pill) => {
          const active = pill === category;
          const count = counts[pill === "All Events" ? "All" : pill] ?? 0;
          return (
            <button
              key={pill}
              type="button"
              onClick={() => onCategoryChange(pill)}
              aria-pressed={active}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-portal-purple text-white shadow-portal"
                  : "border border-portal-hairline bg-card text-foreground hover:border-portal-purple/40 hover:bg-secondary"
              }`}
            >
              {pill} <span className={`ml-1 text-xs ${active ? "text-white/70" : "text-muted-foreground"}`}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Event cards grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            registered={registeredIds.has(event.id)}
            onRegister={onRegister}
            onViewPass={onViewPass}
            onJoinWaitlist={onJoinWaitlist}
          />
        ))}
        {visible.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-portal-hairline bg-card py-12 text-center text-sm text-muted-foreground">
            No events match your filters yet — try another category or publish one from the Organizer Hub.
          </p>
        )}
      </div>
    </div>
  );
}

interface EventCardProps {
  event: CampusEvent;
  registered: boolean;
  onRegister: (event: CampusEvent) => void;
  onViewPass: (event: CampusEvent) => void;
  onJoinWaitlist: (event: CampusEvent) => void;
}

function EventCard({ event, registered, onRegister, onViewPass, onJoinWaitlist }: EventCardProps) {
  const pct = seatPercent(event);
  const full = event.taken >= event.capacity;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-portal-hairline bg-card shadow-portal transition-transform hover:-translate-y-0.5">
      <div className="relative aspect-video overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          className={`size-full object-cover ${event.cancelled ? "opacity-40 grayscale" : ""}`}
        />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-portal-purple px-2.5 py-1 text-[11px] font-bold text-white">
          {event.category}
        </span>
        <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-portal-gold-soft px-2.5 py-1 text-[11px] font-bold text-portal-gold-text">
          <CalendarDays className="size-3" />
          {event.dateLabel}
        </span>
        {event.cancelled && (
          <span className="absolute inset-0 flex items-center justify-center bg-portal-regal/40 text-sm font-extrabold uppercase tracking-widest text-white">
            Cancelled
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-lg font-bold text-portal-regal">{event.title}</h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {event.description}
        </p>
        {event.statusNote && (
          <p className="text-xs font-semibold text-portal-gold-text">{event.statusNote}</p>
        )}
        <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <MapPin className="size-3.5 text-portal-gold" />
          {event.venue}
        </p>

        <div className="mt-auto space-y-1 pt-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {`${pct}% filled`}
            </span>
            <span>
              {event.taken}/{event.capacity} seats
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-portal-hairline">
            <div
              className="h-full rounded-full bg-portal-gold transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {event.cancelled ? (
          <button
            type="button"
            disabled
            className="mt-2 w-full cursor-not-allowed rounded-lg bg-muted py-2.5 text-sm font-bold text-muted-foreground"
          >
            Cancelled by Organizer
          </button>
        ) : registered ? (
          <button
            type="button"
            onClick={() => onViewPass(event)}
            className="mt-2 w-full rounded-lg border border-portal-gold bg-portal-gold-soft py-2.5 text-sm font-bold text-portal-gold-text transition-colors hover:bg-portal-gold hover:text-white"
          >
            View My Pass
          </button>
        ) : full ? (
          <button
            type="button"
            onClick={() => onJoinWaitlist(event)}
            className="mt-2 w-full cursor-pointer rounded-lg bg-secondary py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-portal-hairline"
          >
            Full (Join Waitlist)
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onRegister(event)}
            className="mt-2 w-full rounded-lg bg-portal-gold py-2.5 text-sm font-bold text-white shadow-gold transition-colors hover:bg-portal-gold/90"
          >
            Register Now
          </button>
        )}
      </div>
    </article>
  );
}
