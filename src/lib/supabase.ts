/// <reference types="vite/client" />
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  type CampusEvent,
  type EventCategory,
  type GatePass,
  type NotificationItem,
  INITIAL_EVENTS,
  INITIAL_NOTIFICATIONS,
  parseEventDate,
  parseEventTime,
} from "@/components/portal/data";

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

/**
 * Lazily creates the singleton client, so importing this module (SSR, unit
 * tests) never throws when the env vars are missing.
 */
export function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file."
    );
  }
  client ??= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/* ------------------------------------------------------------------ */
/* Row types + mappers (snake_case DB <-> camelCase app models)        */
/* ------------------------------------------------------------------ */

export interface EventRow {
  id: string;
  code: string;
  title: string;
  category: EventCategory;
  description: string | null;
  venue: string;
  date_label: string;
  capacity: number;
  taken: number;
  image: string | null;
  status_note: string | null;
  cancelled: boolean | null;
}

export interface RegistrationRow {
  ticket_id: string;
  event_id: string;
  attendee: string;
  division: string | null;
  roll: string | null;
  issued_at: string;
}

export interface NotificationRow {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  kind: "info" | "alert";
}

export function eventFromRow(row: EventRow): CampusEvent {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    category: row.category,
    description: row.description ?? "",
    venue: row.venue,
    dateLabel: row.date_label,
    capacity: row.capacity,
    taken: row.taken,
    image: row.image ?? "",
    statusNote: row.status_note ?? undefined,
    cancelled: row.cancelled ?? false,
  };
}

export function eventToRow(event: CampusEvent): EventRow {
  return {
    id: event.id,
    code: event.code,
    title: event.title,
    category: event.category,
    description: event.description,
    venue: event.venue,
    date_label: event.dateLabel,
    capacity: event.capacity,
    taken: event.taken,
    image: event.image,
    status_note: event.statusNote ?? null,
    cancelled: event.cancelled ?? false,
  };
}

export function passFromRow(row: RegistrationRow): GatePass {
  return {
    eventId: row.event_id,
    ticketId: row.ticket_id,
    attendee: row.attendee,
    division: row.division ?? "",
    issuedAt: row.issued_at,
  };
}

export function passToRow(pass: GatePass, roll: string): RegistrationRow {
  return {
    ticket_id: pass.ticketId,
    event_id: pass.eventId,
    attendee: pass.attendee,
    division: pass.division,
    roll,
    issued_at: pass.issuedAt,
  };
}

export function notificationFromRow(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    time: formatRelativeTime(row.time),
    unread: row.unread,
    kind: row.kind,
  };
}

/**
 * New notifications store an ISO timestamp in the `time` column; seeded rows
 * keep their human labels ("2h ago"). ISO values are shown as relative text.
 */
function formatRelativeTime(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return value;
  const minutes = Math.floor((Date.now() - then) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Newest real notifications first; the seeded "ntf-1..3" rows keep their original order after them. */
function notificationRank(id: string): [number, number] {
  const n = Number(/^ntf-(\d+)/.exec(id)?.[1] ?? Number.NaN);
  if (Number.isFinite(n) && n >= 1e12) return [0, -n];
  return [1, Number.isFinite(n) ? n : 0];
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

/** Postgres unique_violation, e.g. UNIQUE(event_id, attendee) on `registrations`. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

export class DuplicateRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateRegistrationError";
  }
}

export class SeatUnavailableError extends Error {
  readonly reason: "full" | "cancelled";
  constructor(reason: "full" | "cancelled") {
    super(reason === "full" ? "Event is full." : "Event has been cancelled.");
    this.name = "SeatUnavailableError";
    this.reason = reason;
  }
}

/** PostgrestError is not guaranteed to be an `Error` instance, so read `.message` defensively. */
export function getErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/* Reads + first-run seeding                                           */
/* ------------------------------------------------------------------ */

function sortByDate(events: CampusEvent[]): CampusEvent[] {
  const stamp = (event: CampusEvent) => {
    const date = parseEventDate(event.dateLabel);
    return date ? date.getTime() + parseEventTime(event.dateLabel) * 60_000 : Number.MAX_SAFE_INTEGER;
  };
  return [...events].sort((a, b) => stamp(a) - stamp(b));
}

export async function fetchEvents(): Promise<CampusEvent[]> {
  const { data, error } = await getSupabase().from("events").select("*");
  if (error) throw error;
  return sortByDate(((data ?? []) as EventRow[]).map(eventFromRow));
}

export async function fetchRegistrations(attendee: string): Promise<GatePass[]> {
  const { data, error } = await getSupabase()
    .from("registrations")
    .select("*")
    .eq("attendee", attendee);
  if (error) throw error;
  return ((data ?? []) as RegistrationRow[]).map(passFromRow);
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const { data, error } = await getSupabase().from("notifications").select("*");
  if (error) throw error;
  return ((data ?? []) as NotificationRow[])
    .sort((a, b) => {
      const [ga, ka] = notificationRank(a.id);
      const [gb, kb] = notificationRank(b.id);
      return ga - gb || ka - kb;
    })
    .map(notificationFromRow);
}

/**
 * Inserts the starter catalog + notifications. `ignoreDuplicates` makes it safe
 * if two tabs (or React StrictMode's double effect) seed at the same moment.
 */
async function seedDatabase(): Promise<void> {
  const supabase = getSupabase();
  const { error: eventsError } = await supabase
    .from("events")
    .upsert(INITIAL_EVENTS.map(eventToRow), { onConflict: "id", ignoreDuplicates: true });
  if (eventsError) throw eventsError;

  const { error: notificationsError } = await supabase.from("notifications").upsert(
    INITIAL_NOTIFICATIONS.map(
      (n): NotificationRow => ({
        id: n.id,
        title: n.title,
        body: n.body,
        time: n.time,
        unread: n.unread,
        kind: n.kind,
      })
    ),
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (notificationsError) throw notificationsError;
}

export interface PortalData {
  events: CampusEvent[];
  passes: GatePass[];
  notifications: NotificationItem[];
}

/** Fetches everything the portal needs; seeds the database first if `events` is empty. */
export async function loadPortalData(attendee: string): Promise<PortalData> {
  let events = await fetchEvents();
  if (events.length === 0) {
    await seedDatabase();
    events = await fetchEvents();
  }
  const [passes, notifications] = await Promise.all([
    fetchRegistrations(attendee),
    fetchNotifications(),
  ]);
  return { events, passes, notifications };
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

/** Throws the raw PostgrestError on failure — check it with `isUniqueViolation`. */
export async function insertRegistration(pass: GatePass, roll: string): Promise<void> {
  const { error } = await getSupabase().from("registrations").insert(passToRow(pass, roll));
  if (error) throw error;
}

/** Returns true when a row was actually deleted. */
export async function deleteRegistration(eventId: string, attendee: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("registrations")
    .delete()
    .eq("event_id", eventId)
    .eq("attendee", attendee)
    .select("ticket_id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/**
 * Adds `delta` (+1 / -1) to `events.taken` and returns the confirmed value.
 *
 * supabase-js cannot express `taken = taken + 1`, so this is an optimistic
 * compare-and-swap: the UPDATE only applies if `taken` still equals the value
 * we just read, otherwise it re-reads and retries. Seats can never be
 * overbooked or lost to a concurrent registration.
 */
export async function adjustSeatsTaken(eventId: string, delta: 1 | -1): Promise<number> {
  const supabase = getSupabase();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: current, error } = await supabase
      .from("events")
      .select("taken, capacity, cancelled")
      .eq("id", eventId)
      .single();
    if (error) throw error;

    const row = current as Pick<EventRow, "taken" | "capacity" | "cancelled">;
    if (delta > 0) {
      if (row.cancelled) throw new SeatUnavailableError("cancelled");
      if (row.taken >= row.capacity) throw new SeatUnavailableError("full");
    }
    const next = Math.max(0, row.taken + delta);
    if (next === row.taken) return next;

    const { data: updated, error: updateError } = await supabase
      .from("events")
      .update({ taken: next })
      .eq("id", eventId)
      .eq("taken", row.taken)
      .select("taken");
    if (updateError) throw updateError;
    if (updated && updated.length > 0) return (updated[0] as { taken: number }).taken;
  }
  throw new Error("Too many people are registering right now — please try again.");
}

export async function insertEventRow(event: CampusEvent): Promise<void> {
  const { error } = await getSupabase().from("events").insert(eventToRow(event));
  if (error) throw error;
}

export async function markEventCancelled(eventId: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from("events")
    .update({ cancelled: true })
    .eq("id", eventId)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Event not found.");
}

/** `createdAt` (ISO) is stored in the text `time` column; it is rendered as "5m ago" on read. */
export async function insertNotificationRow(
  item: NotificationItem,
  createdAt: string
): Promise<void> {
  const row: NotificationRow = {
    id: item.id,
    title: item.title,
    body: item.body,
    time: createdAt,
    unread: item.unread,
    kind: item.kind,
  };
  const { error } = await getSupabase().from("notifications").insert(row);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await getSupabase()
    .from("notifications")
    .update({ unread: false })
    .eq("unread", true);
  if (error) throw error;
}