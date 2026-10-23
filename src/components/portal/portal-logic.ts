import {
  type CampusEvent,
  type EventDraft,
  type GatePass,
  type NotificationItem,
  type EventCategory,
  CATEGORIES,
} from "./data";

export interface RegistrationResult {
  events: CampusEvent[];
  pass: GatePass;
}

/** Deterministic ticket id: MIT-ADT-2025-<EVENT-CODE>. */
export function makeTicketId(event: Pick<CampusEvent, "code">): string {
  return `MIT-ADT-2025-${event.code}`;
}

export function makeEventCode(title: string): string {
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
  const stamp = String(100 + (Math.abs(hashString(title)) % 900));
  return (initials || "EV") + stamp;
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

/**
 * Registers the student for an event. Returns the updated event list and the
 * issued gate pass. Throws when the event is cancelled, already full, or the
 * student already holds a pass (double-registration guardrail).
 */
export function registerForEvent(
  events: CampusEvent[],
  passes: GatePass[],
  eventId: string,
  attendee: string,
  division: string
): RegistrationResult {
  const event = events.find((e) => e.id === eventId);
  if (!event) throw new Error("Event not found.");
  if (event.cancelled) throw new Error(`${event.title} has been cancelled by the organizer.`);
  if (passes.some((p) => p.eventId === eventId)) {
    throw new Error(`You already hold a pass for ${event.title}. Double registration is blocked.`);
  }
  if (event.taken >= event.capacity) {
    throw new Error(`${event.title} is full — join the waitlist instead.`);
  }

  const updatedEvents = events.map((e) =>
    e.id === eventId ? { ...e, taken: e.taken + 1 } : e
  );
  const pass: GatePass = {
    eventId,
    ticketId: makeTicketId(event),
    attendee,
    division,
    issuedAt: new Date().toISOString(),
  };
  return { events: updatedEvents, pass };
}

/** Cancels a registration and restores exactly one seat to the event. */
export function cancelRegistration(
  events: CampusEvent[],
  passes: GatePass[],
  eventId: string
): { events: CampusEvent[]; passes: GatePass[] } {
  const hasPass = passes.some((p) => p.eventId === eventId);
  const updatedEvents = events.map((e) =>
    e.id === eventId && hasPass ? { ...e, taken: Math.max(0, e.taken - 1) } : e
  );
  return {
    events: updatedEvents,
    passes: passes.filter((p) => p.eventId !== eventId),
  };
}

/** Prepends a freshly published event to the grid. */
export function publishEvent(events: CampusEvent[], draft: EventDraft): CampusEvent[] {
  const categoryImages: Record<EventCategory, string> = {
    Technical: events.find((e) => e.category === "Technical")?.image ?? "",
    Cultural: events.find((e) => e.category === "Cultural")?.image ?? "",
    Workshops: events.find((e) => e.category === "Workshops")?.image ?? "",
    Competitions: events.find((e) => e.category === "Competitions")?.image ?? "",
  };
  const newEvent: CampusEvent = {
    id: `evt-${hashString(draft.title + draft.dateLabel)}-${events.length}`,
    code: makeEventCode(draft.title),
    title: draft.title,
    category: draft.category,
    description: `Newly published ${draft.category.toLowerCase()} event hosted at ${draft.venue}.`,
    venue: draft.venue,
    dateLabel: draft.dateLabel,
    capacity: Math.max(1, draft.capacity),
    taken: 0,
    image: categoryImages[draft.category],
  };
  return [newEvent, ...events];
}

/** Flags an event as cancelled (emergency cancel) — registration is blocked. */
export function cancelEvent(events: CampusEvent[], eventId: string): CampusEvent[] {
  return events.map((e) => (e.id === eventId ? { ...e, cancelled: true } : e));
}

export function matchesSearch(event: CampusEvent, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [event.title, event.category, event.venue, event.description]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export function categoryCounts(events: CampusEvent[]): Record<string, number> {
  const counts: Record<string, number> = { All: 0 };
  for (const c of CATEGORIES) counts[c] = 0;
  for (const e of events) {
    if (e.cancelled) continue;
    counts["All"] = (counts["All"] ?? 0) + 1;
    counts[e.category] = (counts[e.category] ?? 0) + 1;
  }
  return counts;
}

export function seatPercent(event: CampusEvent): number {
  return Math.min(100, Math.round((event.taken / event.capacity) * 100));
}
