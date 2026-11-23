import {
  type CampusEvent,
  type EventDraft,
  type GatePass,
  type NotificationItem,
  type EventCategory,
  CATEGORIES,
  parseEventDate,
  parseEventTime,
} from "./data";
import {
  SeatUnavailableError,
  DuplicateRegistrationError,
  adjustSeatsTaken,
  fetchEvents,
  getSupabase,
  insertEventRow,
  isUniqueViolation,
  markEventCancelled,
} from "@/lib/supabase";

export interface RegistrationResult {
  events: CampusEvent[];
  pass: GatePass;
}

/**
 * Ticket id: MIT-ADT-2025-<EVENT-CODE>, or MIT-ADT-2025-<EVENT-CODE>-<ENROLLMENT-ID>
 * when an Enrollment ID is supplied (every real registration passes one).
 */
export function makeTicketId(event: Pick<CampusEvent, "code">, enrollmentId?: string): string {
  const base = `MIT-ADT-2025-${event.code}`;
  const suffix = enrollmentId ? enrollmentId.replace(/[^A-Za-z0-9]/g, "").toUpperCase() : "";
  return suffix ? `${base}-${suffix}` : base;
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
  division: string,
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

  const updatedEvents = events.map((e) => (e.id === eventId ? { ...e, taken: e.taken + 1 } : e));
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
  eventId: string,
): { events: CampusEvent[]; passes: GatePass[] } {
  const hasPass = passes.some((p) => p.eventId === eventId);
  const updatedEvents = events.map((e) =>
    e.id === eventId && hasPass ? { ...e, taken: Math.max(0, e.taken - 1) } : e,
  );
  return {
    events: updatedEvents,
    passes: passes.filter((p) => p.eventId !== eventId),
  };
}

export const DUPLICATE_EVENT_TITLE_MESSAGE = "An event with this title already exists.";

export class DuplicateEventTitleError extends Error {
  constructor(message: string = DUPLICATE_EVENT_TITLE_MESSAGE) {
    super(message);
    this.name = "DuplicateEventTitleError";
  }
}

/**
 * True when an ACTIVE event with the same title (trimmed, case-insensitive) exists.
 * Cancelled events don't count, so their titles can be published again.
 */
export function isDuplicateEventTitle(events: CampusEvent[], title: string): boolean {
  const wanted = title.trim().toLowerCase();
  return events.some((ev) => !ev.cancelled && ev.title.trim().toLowerCase() === wanted);
}

export const PAST_EVENT_DATE_MESSAGE = "Event date cannot be in the past.";

/** Midnight at the start of the local calendar day containing `now`. */
export function startOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Today's LOCAL date as YYYY-MM-DD, for `<input type="date" min>` (toISOString would give the UTC day). */
export function localIsoDate(now: Date = new Date()): string {
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}

/** True when an ISO date (YYYY-MM-DD) or "DD Mon YYYY, …" label falls before today's local date. */
export function isPastEventDate(value: string, now: Date = new Date()): boolean {
  const parsed = parseEventDate(value);
  return parsed !== null && parsed.getTime() < startOfToday(now).getTime();
}

/**
 * Ticket codes are derived from the title, and ticket ids from the code, so a re-used
 * (cancelled) title must not reuse its old code: pick the first free variant.
 */
function uniqueEventCode(events: CampusEvent[], title: string): string {
  const taken = new Set(events.map((ev) => ev.code.toUpperCase()));
  let code = makeEventCode(title);
  for (let n = 2; taken.has(code.toUpperCase()); n++) code = makeEventCode(`${title}#${n}`);
  return code;
}

/** Prepends a freshly published event to the grid. Throws DuplicateEventTitleError on a repeated title. */
export function publishEvent(events: CampusEvent[], draft: EventDraft): CampusEvent[] {
  if (isDuplicateEventTitle(events, draft.title)) throw new DuplicateEventTitleError();
  const categoryImages: Record<EventCategory, string> = {
    Technical: events.find((e) => e.category === "Technical")?.image ?? "",
    Cultural: events.find((e) => e.category === "Cultural")?.image ?? "",
    Workshops: events.find((e) => e.category === "Workshops")?.image ?? "",
    Competitions: events.find((e) => e.category === "Competitions")?.image ?? "",
  };
  const newEvent: CampusEvent = {
    id: `evt-${hashString(draft.title + draft.dateLabel)}-${events.length}`,
    code: uniqueEventCode(events, draft.title),
    title: draft.title,
    category: draft.category,
    description: `Newly published ${draft.category.toLowerCase()} event hosted at ${draft.venue}.`,
    venue: draft.venue,
    dateLabel: draft.dateLabel,
    capacity: Math.max(1, draft.capacity),
    taken: 0,
    image: draft.image || categoryImages[draft.category],
  };
  return [newEvent, ...events];
}

/** Flags an event as cancelled (emergency cancel) — registration is blocked. */
export function cancelEvent(events: CampusEvent[], eventId: string): CampusEvent[] {
  return events.map((e) => (e.id === eventId ? { ...e, cancelled: true } : e));
}

/* ------------------------------------------------------------------ */
/* Supabase-backed event operations                                    */
/* ------------------------------------------------------------------ */

/** Inserts the new event into `events`, then prepends it to the local grid. */
export async function publishEventRemote(
  events: CampusEvent[],
  draft: EventDraft,
): Promise<CampusEvent[]> {
  const [draftEvent] = publishEvent(events, draft);
  const newEvent: CampusEvent = {
    ...draftEvent!,
    // Random suffix: the PK must stay unique even after a reload resets events.length.
    id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  };
  try {
    await insertEventRow(newEvent);
  } catch (error) {
    // 23505 = unique_violation: another organizer published this title first.
    if (isUniqueViolation(error)) throw new DuplicateEventTitleError();
    throw error;
  }
  return [newEvent, ...events];
}

/** Sets `cancelled = true` in Supabase, then flags the event locally. */
export async function cancelEventRemote(
  events: CampusEvent[],
  eventId: string,
): Promise<CampusEvent[]> {
  await markEventCancelled(eventId);
  return cancelEvent(events, eventId);
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
  if (event.capacity <= 0) return 0;
  return Math.min(100, Math.round((event.taken / event.capacity) * 100));
}

/* ================================================================== */
/* 1. Role-based access control + dynamic session                      */
/* ================================================================== */

export type Role = "student" | "faculty" | "admin";

export const ROLES: readonly Role[] = ["student", "faculty", "admin"];

/** Tab / badge labels for each role. */
export const ROLE_LABELS: Record<Role, string> = {
  student: "Student",
  faculty: "Faculty",
  admin: "Administrator",
};

/** What the ID field is called for each role. */
export const ROLE_ID_LABELS: Record<Role, string> = {
  student: "Enrollment ID",
  faculty: "Faculty Employee ID",
  admin: "Admin ID",
};

const ROLE_BADGES: Record<Role, string> = {
  student: "Verified Student Attendee • MIT-ADT",
  faculty: "Verified Faculty Organizer • MIT-ADT",
  admin: "University Administrator • MIT-ADT",
};

/**
 * The signed-in user. Built entirely from what was typed on the login screen,
 * so no name or ID is ever hardcoded.
 */
export interface SessionProfile {
  role: Role;
  /** Normalised (trimmed, UPPERCASE) Enrollment / Faculty / Admin ID. */
  userId: string;
  displayName: string;
  subtitle: string;
  initials: string;
}

export function roleBadge(role: Role): string {
  return ROLE_BADGES[role];
}

/** "<displayName> • <Role>" one-liner for banners and restricted screens. */
export function sessionSummary(profile: SessionProfile): string {
  return `${profile.displayName} • ${ROLE_LABELS[profile.role]}`;
}

/** Trim + uppercase: the canonical form of every ID stored or compared. */
export function normalizeId(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Non-empty, at least 4 characters, letters and digits only. */
export function isValidLoginId(raw: string): boolean {
  return /^[A-Z0-9]{4,}$/.test(normalizeId(raw));
}

/** Student Enrollment IDs: ADT + 2-digit year + 3-4 letter school/program code + 4-digit serial. */
const STUDENT_ID_PATTERN = /^ADT\d{2}[A-Z]{3,4}\d{4}$/i;

export const INVALID_STUDENT_ID_MESSAGE =
  "Invalid Enrollment ID format. Must end with 4 digits (e.g., ADT24SOCB0621).";

export function isValidStudentEnrollmentId(raw: string): boolean {
  return STUDENT_ID_PATTERN.test(raw.trim());
}

/** Role-aware ID check: every role needs 4+ alphanumerics; students must also match the Enrollment ID format. */
export function isValidIdForRole(role: Role, raw: string): boolean {
  return isValidLoginId(raw) && (role !== "student" || isValidStudentEnrollmentId(raw));
}

/**
 * Format error to show under the ID field, or null. Empty input is left to the
 * generic credentials error, so a blank ID never reveals the expected format.
 */
export function idFormatError(role: Role, raw: string): string | null {
  if (role === "student" && raw.trim() !== "" && !isValidStudentEnrollmentId(raw)) {
    return INVALID_STUDENT_ID_MESSAGE;
  }
  return null;
}

/** Builds the session for ANY valid ID entered on the login screen. */
export function buildSession(role: Role, rawId: string): SessionProfile {
  const cleanId = normalizeId(rawId);
  switch (role) {
    case "student":
      return {
        role,
        userId: cleanId,
        displayName: cleanId,
        subtitle: "Student • MIT-ADT",
        initials: cleanId.slice(-2),
      };
    case "faculty":
      return {
        role,
        userId: cleanId,
        displayName: cleanId,
        subtitle: "Faculty Organizer • MIT-ADT",
        initials: "FC",
      };
    case "admin":
      return {
        role,
        userId: cleanId,
        displayName: cleanId,
        subtitle: "Administrator • MIT-ADT",
        initials: "AD",
      };
  }
}

/* ------------------------------------------------------------------ */
/* Authentication (demo): ID + PIN check, sessionStorage session       */
/* ------------------------------------------------------------------ */

/** Shared demo PIN (shown as a helper line on the login screen). */
export const DEMO_PASSWORD = "696969";

export const AUTH_ERROR_MESSAGE = "Invalid ID or password. Please verify your MIT-ADT credentials.";

/** Only the exact portal PIN passes; empty or anything else is rejected. */
export function validatePassword(input: string): boolean {
  return input === DEMO_PASSWORD;
}

/** TC01 / TC02: a valid ID (4+ alphanumerics) AND the portal PIN. */
export function validateCredentials(role: Role, rawId: string, password: string): boolean {
  return isValidIdForRole(role, rawId) && validatePassword(password);
}

export const SESSION_STORAGE_KEY = "mitadt.portal.session";

function getSessionStore(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null; // storage blocked (private mode / sandboxed iframe)
  }
}

/** The active session, or null when signed out / the stored value is invalid. */
export function readSession(): SessionProfile | null {
  const store = getSessionStore();
  if (!store) return null;
  try {
    const raw = store.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { role?: unknown; userId?: unknown };
    const role = ROLES.find((r) => r === parsed.role);
    if (!role || typeof parsed.userId !== "string" || !isValidIdForRole(role, parsed.userId)) {
      return null;
    }
    return buildSession(role, parsed.userId);
  } catch {
    return null;
  }
}

export function writeSession(profile: SessionProfile): void {
  try {
    getSessionStore()?.setItem(SESSION_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* session just won't survive a refresh */
  }
}

export function clearSession(): void {
  try {
    getSessionStore()?.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}

export type Permission = "register" | "publishEvents" | "manageParticipants" | "emergencyCancel";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  // Browse / search / view passes are open to everyone; register + cancel own pass is student-only.
  student: ["register"],
  faculty: ["publishEvents", "manageParticipants"],
  admin: ["publishEvents", "manageParticipants", "emergencyCancel"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** The Organizer Hub is visible to Faculty and Administrators only. */
export function canAccessOrganizerHub(role: Role): boolean {
  return hasPermission(role, "manageParticipants");
}

/* ================================================================== */
/* Registrations: status model, mappers, Supabase reads                */
/* ================================================================== */

export type RegistrationStatus = "Approved" | "Pending" | "Waitlisted" | "Rejected";

/** A `registrations` row. Extends GatePass so it can be used anywhere a pass is expected. */
export interface Registration extends GatePass {
  /** Primary identity of the registrant (`registrations.enrollment_id`). */
  enrollmentId: string;
  roll: string;
  status: RegistrationStatus;
  checkedIn: boolean;
  /** ISO timestamp of the gate scan. */
  checkedInAt?: string;
}

export interface RegistrationDbRow {
  ticket_id: string;
  event_id: string;
  attendee: string;
  enrollment_id: string | null;
  division: string | null;
  roll: string | null;
  issued_at: string;
  status: string | null;
  checked_in: boolean | null;
  checked_in_at: string | null;
}

/**
 * Rows written before the status column existed (or with an unexpected
 * value) already hold a seat, so anything that is not explicitly
 * Waitlisted / Rejected / Pending is treated as Approved.
 */
export function normalizeStatus(value: unknown): RegistrationStatus {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (v === "waitlisted" || v === "waitlist") return "Waitlisted";
  if (v === "rejected" || v === "declined") return "Rejected";
  if (v === "pending") return "Pending";
  return "Approved";
}

export function registrationFromRow(row: RegistrationDbRow): Registration {
  return {
    eventId: row.event_id,
    ticketId: row.ticket_id,
    attendee: row.attendee,
    enrollmentId: (row.enrollment_id ?? "").trim(),
    division: row.division ?? "",
    roll: row.roll ?? "",
    issuedAt: row.issued_at,
    status: normalizeStatus(row.status),
    checkedIn: row.checked_in ?? false,
    checkedInAt: row.checked_in_at ?? undefined,
  };
}

export function registrationToRow(reg: Registration): RegistrationDbRow {
  return {
    ticket_id: reg.ticketId,
    event_id: reg.eventId,
    attendee: reg.enrollmentId,
    enrollment_id: reg.enrollmentId,
    division: reg.division,
    roll: reg.roll,
    issued_at: reg.issuedAt,
    status: reg.status,
    checked_in: reg.checkedIn,
    checked_in_at: reg.checkedInAt ?? null,
  };
}

/** Every registration row (all students, all statuses), oldest first. */
export async function fetchAllRegistrations(): Promise<Registration[]> {
  const { data, error } = await getSupabase()
    .from("registrations")
    .select("*")
    .order("issued_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as RegistrationDbRow[]).map(registrationFromRow);
}

/** Deletes one registration by (event, Enrollment ID); true when a row was actually removed. */
async function deleteRegistrationRow(eventId: string, enrollmentId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("registrations")
    .delete()
    .eq("event_id", eventId)
    .eq("enrollment_id", enrollmentId)
    .select("ticket_id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

async function fetchRegistrationRow(
  eventId: string,
  enrollmentId: string,
): Promise<Registration | null> {
  const { data, error } = await getSupabase()
    .from("registrations")
    .select("*")
    .eq("event_id", eventId)
    .eq("enrollment_id", enrollmentId)
    .limit(1);
  if (error) throw error;
  const row = (data ?? [])[0] as RegistrationDbRow | undefined;
  return row ? registrationFromRow(row) : null;
}

/** Updates one registration row; throws if nothing matched. */
async function updateRegistrationFields(
  eventId: string,
  enrollmentId: string,
  patch: Partial<Pick<RegistrationDbRow, "status" | "checked_in" | "checked_in_at">>,
): Promise<RegistrationDbRow> {
  const { data, error } = await getSupabase()
    .from("registrations")
    .update(patch)
    .eq("event_id", eventId)
    .eq("enrollment_id", enrollmentId)
    .select("*");
  if (error) throw error;
  const row = (data ?? [])[0] as RegistrationDbRow | undefined;
  if (!row) throw new Error("This registration no longer exists.");
  return row;
}

/** Combines the local grid order with fresh database values (keeps the UI from reshuffling). */
export function mergeEvents(local: CampusEvent[], fresh: CampusEvent[]): CampusEvent[] {
  const byId = new Map(fresh.map((e) => [e.id, e]));
  const merged = local.map((e) => byId.get(e.id) ?? e);
  const localIds = new Set(local.map((e) => e.id));
  return [...merged, ...fresh.filter((e) => !localIds.has(e.id))];
}

/* ------------------------------------------------------------------ */
/* Waitlist helpers                                                    */
/* ------------------------------------------------------------------ */

export function findRegistration(
  registrations: Registration[],
  eventId: string,
  enrollmentId: string,
): Registration | undefined {
  return registrations.find((r) => r.eventId === eventId && r.enrollmentId === enrollmentId);
}

/** Waitlisted students for an event, earliest first. */
export function waitlistQueue(registrations: Registration[], eventId: string): Registration[] {
  return registrations
    .filter((r) => r.eventId === eventId && r.status === "Waitlisted")
    .sort(
      (a, b) =>
        new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime() ||
        a.ticketId.localeCompare(b.ticketId),
    );
}

/** 1-based waitlist position, or 0 when the attendee is not waitlisted. */
export function waitlistPosition(
  registrations: Registration[],
  eventId: string,
  enrollmentId: string,
): number {
  return (
    waitlistQueue(registrations, eventId).findIndex((r) => r.enrollmentId === enrollmentId) + 1
  );
}

/** eventId -> 1-based waitlist position for one attendee. */
export function waitlistPositions(
  registrations: Registration[],
  enrollmentId: string,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const reg of registrations) {
    if (reg.enrollmentId === enrollmentId && reg.status === "Waitlisted") {
      out[reg.eventId] = waitlistPosition(registrations, reg.eventId, enrollmentId);
    }
  }
  return out;
}

/** MIT-ADT-2025-<EVENT_CODE>-<ENROLLMENT_ID>: unique per student, so many students can hold passes for one event. */
export function makeAttendeeTicketId(
  event: Pick<CampusEvent, "code">,
  enrollmentId: string,
): string {
  return makeTicketId(event, enrollmentId || "NA");
}

export interface AttendeeInfo {
  enrollmentId: string;
  division: string;
  roll: string;
}

/**
 * Registrant details derived purely from an Enrollment ID: the ID is normalised
 * (trim + UPPERCASE) and the roll is its last four characters.
 */
export function attendeeFromEnrollmentId(rawId: string): AttendeeInfo {
  const enrollmentId = normalizeId(rawId);
  return { enrollmentId, division: "", roll: enrollmentId.slice(-4) };
}

/** Common return shape for every operation that changes seats / registrations. */
export interface MutationResult {
  events: CampusEvent[];
  registrations: Registration[];
  /** Waitlisted students promoted to Approved by this operation. */
  promoted: Registration[];
}

export interface RegistrationOutcome extends MutationResult {
  registration: Registration;
  waitlisted: boolean;
  /** 1-based waitlist position (0 when approved). */
  position: number;
}

function adjustTaken(events: CampusEvent[], eventId: string, delta: 1 | -1): CampusEvent[] {
  return events.map((e) => (e.id === eventId ? { ...e, taken: Math.max(0, e.taken + delta) } : e));
}

function describeExisting(event: CampusEvent, existing: Registration, all: Registration[]): string {
  switch (existing.status) {
    case "Approved":
      return `You already hold a pass for ${event.title}. Double registration is blocked.`;
    case "Waitlisted":
      return `You're already on the waitlist for ${event.title} — Waitlist #${waitlistPosition(all, event.id, existing.enrollmentId)}.`;
    case "Pending":
      return `Your registration for ${event.title} is awaiting organizer approval.`;
    case "Rejected":
      return `Your registration for ${event.title} was rejected by the organizer. Please contact them to be reconsidered.`;
  }
}

/* ------------------------------------------------------------------ */
/* 3. Smart waitlist — local (offline / test) implementations          */
/* ------------------------------------------------------------------ */

/**
 * Registers an attendee, or puts them on the waitlist when the event is full
 * (`taken >= capacity`). `taken` is never pushed past `capacity`.
 */
export function registerOrWaitlist(
  events: CampusEvent[],
  registrations: Registration[],
  eventId: string,
  who: AttendeeInfo,
): RegistrationOutcome {
  const event = events.find((e) => e.id === eventId);
  if (!event) throw new Error("Event not found.");
  if (event.cancelled) throw new Error(`${event.title} has been cancelled by the organizer.`);

  const existing = findRegistration(registrations, eventId, who.enrollmentId);
  if (existing) {
    throw new DuplicateRegistrationError(describeExisting(event, existing, registrations));
  }

  const full = event.taken >= event.capacity;
  const registration: Registration = {
    eventId,
    ticketId: makeAttendeeTicketId(event, who.enrollmentId),
    attendee: who.enrollmentId,
    enrollmentId: who.enrollmentId,
    division: who.division,
    roll: who.roll,
    issuedAt: new Date().toISOString(),
    status: full ? "Waitlisted" : "Approved",
    checkedIn: false,
  };
  const nextRegistrations = [...registrations, registration];
  return {
    events: full ? events : adjustTaken(events, eventId, 1),
    registrations: nextRegistrations,
    promoted: [],
    registration,
    waitlisted: full,
    position: full ? waitlistPosition(nextRegistrations, eventId, who.enrollmentId) : 0,
  };
}

/** Promotes the earliest waitlisted student if (and only if) a seat is free. */
function promoteLocal(
  events: CampusEvent[],
  registrations: Registration[],
  eventId: string,
): MutationResult {
  const event = events.find((e) => e.id === eventId);
  const head = waitlistQueue(registrations, eventId)[0];
  if (!event || event.cancelled || event.taken >= event.capacity || !head) {
    return { events, registrations, promoted: [] };
  }
  const promotedReg: Registration = { ...head, status: "Approved" };
  return {
    events: adjustTaken(events, eventId, 1),
    registrations: registrations.map((r) => (r === head ? promotedReg : r)),
    promoted: [promotedReg],
  };
}

/**
 * Deletes a registration (student cancel or organizer remove). If it held a
 * seat, the seat is freed and the earliest waitlisted student is promoted.
 */
export function removeAndPromote(
  events: CampusEvent[],
  registrations: Registration[],
  eventId: string,
  enrollmentId: string,
): MutationResult {
  const target = findRegistration(registrations, eventId, enrollmentId);
  if (!target) return { events, registrations, promoted: [] };
  const remaining = registrations.filter((r) => r !== target);
  if (target.status !== "Approved") return { events, registrations: remaining, promoted: [] };
  return promoteLocal(adjustTaken(events, eventId, -1), remaining, eventId);
}

/** Organizer Approve / Reject. Approving needs a free seat; rejecting an Approved row frees one. */
export function changeRegistrationStatus(
  events: CampusEvent[],
  registrations: Registration[],
  eventId: string,
  enrollmentId: string,
  next: "Approved" | "Rejected",
): MutationResult {
  const target = findRegistration(registrations, eventId, enrollmentId);
  const event = events.find((e) => e.id === eventId);
  if (!target || !event) throw new Error("This registration no longer exists.");
  if (target.status === next) return { events, registrations, promoted: [] };

  if (next === "Approved") {
    if (event.cancelled) throw new Error(`${event.title} has been cancelled by the organizer.`);
    if (event.taken >= event.capacity) {
      throw new Error(
        `${event.title} is full — reject or remove an approved attendee first to free a seat.`,
      );
    }
    return {
      events: adjustTaken(events, eventId, 1),
      registrations: registrations.map((r) => (r === target ? { ...r, status: "Approved" } : r)),
      promoted: [],
    };
  }

  const rejected: Registration = {
    ...target,
    status: "Rejected",
    checkedIn: false,
    checkedInAt: undefined,
  };
  const updated = registrations.map((r) => (r === target ? rejected : r));
  if (target.status !== "Approved") return { events, registrations: updated, promoted: [] };
  return promoteLocal(adjustTaken(events, eventId, -1), updated, eventId);
}

/* ------------------------------------------------------------------ */
/* 4. QR gate check-in — local implementation + ticket verification    */
/* ------------------------------------------------------------------ */

export function setCheckIn(
  registrations: Registration[],
  eventId: string,
  enrollmentId: string,
  checkedIn: boolean,
): Registration[] {
  const target = findRegistration(registrations, eventId, enrollmentId);
  if (!target) throw new Error("This registration no longer exists.");
  if (target.status !== "Approved") throw new Error("Only approved attendees can be checked in.");
  return registrations.map((r) =>
    r === target
      ? { ...r, checkedIn, checkedInAt: checkedIn ? new Date().toISOString() : undefined }
      : r,
  );
}

export type TicketVerification =
  | { kind: "valid"; registration: Registration; message: string }
  | { kind: "already"; registration: Registration; message: string }
  | { kind: "invalid"; message: string };

/** Looks a typed / scanned ticket id up inside one event's registrations. */
export function verifyTicket(
  registrations: Registration[],
  eventId: string,
  ticketId: string,
): TicketVerification {
  const wanted = ticketId.trim().toLowerCase();
  if (!wanted) return { kind: "invalid", message: "Enter or scan a ticket ID first." };
  const registration = registrations.find(
    (r) => r.eventId === eventId && r.ticketId.toLowerCase() === wanted,
  );
  if (!registration) {
    return { kind: "invalid", message: `No ticket "${ticketId.trim()}" exists for this event.` };
  }
  if (registration.status !== "Approved") {
    return {
      kind: "invalid",
      message: `${registration.enrollmentId}'s ticket is ${registration.status} — not valid for entry.`,
    };
  }
  if (registration.checkedIn) {
    return {
      kind: "already",
      registration,
      message: `${registration.enrollmentId} is already checked in.`,
    };
  }
  return {
    kind: "valid",
    registration,
    message: `Valid ticket — ${registration.enrollmentId} (${registration.division}).`,
  };
}

/* ================================================================== */
/* Supabase-backed registration operations (multi-student)             */
/* ================================================================== */

async function refreshState(
  events: CampusEvent[],
  promoted: Registration[],
): Promise<MutationResult> {
  const [freshEvents, registrations] = await Promise.all([fetchEvents(), fetchAllRegistrations()]);
  return { events: mergeEvents(events, freshEvents), registrations, promoted };
}

/**
 * Gives the earliest waitlisted student a seat, if one is free. The seat is
 * claimed first (compare-and-swap, never over capacity), then the row is
 * flipped to Approved; if that second step loses a race the seat is returned.
 */
export async function promoteNextWaitlisted(eventId: string): Promise<Registration | null> {
  const supabase = getSupabase();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("registrations")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "Waitlisted")
      .order("issued_at", { ascending: true })
      .limit(1);
    if (error) throw error;
    const head = (data ?? [])[0] as RegistrationDbRow | undefined;
    if (!head) return null;

    try {
      await adjustSeatsTaken(eventId, 1);
    } catch (error) {
      if (error instanceof SeatUnavailableError) return null; // event is full again or cancelled
      throw error;
    }

    const { data: updated, error: updateError } = await supabase
      .from("registrations")
      .update({ status: "Approved" })
      .eq("event_id", eventId)
      .eq("ticket_id", head.ticket_id)
      .eq("status", "Waitlisted")
      .select("*");
    if (updateError) {
      await adjustSeatsTaken(eventId, -1).catch((e) => console.error("Seat rollback failed", e));
      throw updateError;
    }
    if (updated && updated.length > 0) {
      return registrationFromRow(updated[0] as RegistrationDbRow);
    }
    // Someone else already promoted / removed this student: hand the seat back, try the next one.
    await adjustSeatsTaken(eventId, -1);
  }
  return null;
}

/**
 * Register — or join the waitlist when the event is full — in Supabase.
 * Approved: insert row + bump `taken` (rolled back / downgraded to Waitlisted
 * if the last seat was taken meanwhile). Waitlisted: insert row only, `taken`
 * is untouched.
 */
export async function registerOrWaitlistRemote(
  events: CampusEvent[],
  registrations: Registration[],
  eventId: string,
  who: AttendeeInfo,
): Promise<RegistrationOutcome> {
  const planned = registerOrWaitlist(events, registrations, eventId, who); // validates
  const event = events.find((e) => e.id === eventId)!;

  try {
    const { error } = await getSupabase()
      .from("registrations")
      .insert(registrationToRow(planned.registration));
    if (error) throw error;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DuplicateRegistrationError(
        `You already have a registration for ${event.title}. Double registration is blocked.`,
      );
    }
    throw error;
  }

  let promotedOthers: Registration[] = [];
  if (planned.registration.status === "Approved") {
    try {
      await adjustSeatsTaken(eventId, 1);
    } catch (error) {
      if (error instanceof SeatUnavailableError && error.reason === "full") {
        // Lost the race for the last seat: keep the booking as a waitlist entry.
        await updateRegistrationFields(eventId, who.enrollmentId, { status: "Waitlisted" });
      } else {
        await deleteRegistrationRow(eventId, who.enrollmentId).catch((e) =>
          console.error("Could not roll back registration", e),
        );
        if (error instanceof SeatUnavailableError) {
          throw new Error(`${event.title} has been cancelled by the organizer.`);
        }
        throw error;
      }
    }
  } else {
    // A seat may have been released since this page last loaded.
    const promoted = await promoteNextWaitlisted(eventId).catch((e) => {
      console.error("Waitlist promotion check failed", e);
      return null;
    });
    if (promoted && promoted.enrollmentId !== who.enrollmentId) promotedOthers = [promoted];
  }

  const fresh = await refreshState(events, promotedOthers);
  const registration =
    findRegistration(fresh.registrations, eventId, who.enrollmentId) ?? planned.registration;
  const waitlisted = registration.status === "Waitlisted";
  return {
    ...fresh,
    registration,
    waitlisted,
    position: waitlisted ? waitlistPosition(fresh.registrations, eventId, who.enrollmentId) : 0,
  };
}

/**
 * Deletes a registration row (student cancel or organizer remove). If the row
 * held a seat: `taken` is decremented and the earliest Waitlisted student is
 * promoted to Approved (taken is bumped back up for them).
 */
export async function removeRegistrationRemote(
  events: CampusEvent[],
  _registrations: Registration[],
  eventId: string,
  enrollmentId: string,
): Promise<MutationResult> {
  const current = await fetchRegistrationRow(eventId, enrollmentId);
  const removed = await deleteRegistrationRow(eventId, enrollmentId);
  const promoted: Registration[] = [];
  if (removed && current?.status === "Approved") {
    await adjustSeatsTaken(eventId, -1);
    const next = await promoteNextWaitlisted(eventId);
    if (next) promoted.push(next);
  }
  return refreshState(events, promoted);
}

/** Organizer Approve / Reject, kept in step with `events.taken` and the waitlist. */
export async function setRegistrationStatusRemote(
  events: CampusEvent[],
  _registrations: Registration[],
  eventId: string,
  enrollmentId: string,
  next: "Approved" | "Rejected",
): Promise<MutationResult> {
  const current = await fetchRegistrationRow(eventId, enrollmentId);
  if (!current) throw new Error("This registration no longer exists.");
  const promoted: Registration[] = [];

  if (next === "Approved") {
    if (current.status !== "Approved") {
      try {
        await adjustSeatsTaken(eventId, 1);
      } catch (error) {
        if (error instanceof SeatUnavailableError) {
          throw new Error(
            error.reason === "full"
              ? "This event is full — reject or remove an approved attendee first to free a seat."
              : "This event has been cancelled.",
          );
        }
        throw error;
      }
      try {
        await updateRegistrationFields(eventId, enrollmentId, { status: "Approved" });
      } catch (error) {
        await adjustSeatsTaken(eventId, -1).catch((e) => console.error("Seat rollback failed", e));
        throw error;
      }
    }
  } else if (current.status !== "Rejected") {
    await updateRegistrationFields(eventId, enrollmentId, {
      status: "Rejected",
      checked_in: false,
      checked_in_at: null,
    });
    if (current.status === "Approved") {
      await adjustSeatsTaken(eventId, -1);
      const nextUp = await promoteNextWaitlisted(eventId);
      if (nextUp) promoted.push(nextUp);
    }
  }
  return refreshState(events, promoted);
}

/** Gate check-in: writes `checked_in` + `checked_in_at` to Supabase. */
export async function setCheckInRemote(
  events: CampusEvent[],
  eventId: string,
  enrollmentId: string,
  checkedIn: boolean,
): Promise<MutationResult> {
  const current = await fetchRegistrationRow(eventId, enrollmentId);
  if (!current) throw new Error("This registration no longer exists.");
  if (current.status !== "Approved") throw new Error("Only approved attendees can be checked in.");
  await updateRegistrationFields(eventId, enrollmentId, {
    checked_in: checkedIn,
    checked_in_at: checkedIn ? new Date().toISOString() : null,
  });
  return refreshState(events, []);
}

/* ================================================================== */
/* Enrollment-grouped directory (Organizer Hub)                        */
/* ================================================================== */

export interface EnrollmentGroup {
  /** The Enrollment ID, or "" for legacy rows that carry none. */
  enrollmentId: string;
  /** Every registration row under this ID (all statuses), oldest first. */
  registrations: Registration[];
  /** Number of events registered under this ID. */
  total: number;
  approved: number;
  waitlisted: number;
  checkedIn: number;
}

/** Groups every registration row by `enrollment_id`, IDs in alphabetical order. */
export function groupByEnrollment(registrations: Registration[]): EnrollmentGroup[] {
  const byId = new Map<string, Registration[]>();
  for (const reg of registrations) {
    const bucket = byId.get(reg.enrollmentId);
    if (bucket) bucket.push(reg);
    else byId.set(reg.enrollmentId, [reg]);
  }
  return [...byId.entries()]
    .map(([enrollmentId, rows]) => {
      const sorted = [...rows].sort(
        (a, b) =>
          new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime() ||
          a.ticketId.localeCompare(b.ticketId),
      );
      return {
        enrollmentId,
        registrations: sorted,
        total: sorted.length,
        approved: sorted.filter((r) => r.status === "Approved").length,
        waitlisted: sorted.filter((r) => r.status === "Waitlisted").length,
        checkedIn: sorted.filter((r) => r.status === "Approved" && r.checkedIn).length,
      };
    })
    .sort((a, b) => {
      // Legacy rows without an ID go last.
      if (!a.enrollmentId !== !b.enrollmentId) return a.enrollmentId ? -1 : 1;
      return a.enrollmentId.localeCompare(b.enrollmentId);
    });
}

/* ================================================================== */
/* Per-user notifications (no schema change)                           */
/* ================================================================== */

/**
 * `notifications` has no recipient column, so a notification meant for one
 * user carries their ID after an "@" in its row id (`ntf-<time>-<rand>@<ID>`).
 * Ids without the suffix are campus-wide broadcasts.
 */
export function makeNotificationId(recipientId?: string): string {
  const base = `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  return recipientId ? `${base}@${recipientId}` : base;
}

export function isNotificationVisibleTo(notificationId: string, userId: string): boolean {
  const at = notificationId.indexOf("@");
  return at < 0 || notificationId.slice(at + 1) === userId;
}

/* ================================================================== */
/* 2. Live analytics                                                   */
/* ================================================================== */

export interface CategoryFill {
  category: EventCategory;
  taken: number;
  capacity: number;
  pct: number;
}

export interface PortalAnalytics {
  totalEvents: number;
  activeEvents: number;
  cancelledEvents: number;
  /** Seats booked across live events (`events.taken`, the number seats are enforced on). */
  totalRegistrations: number;
  waitlisted: number;
  /** Approved attendees scanned in at the gate. */
  checkedIn: number;
  approvedRows: number;
  fillRate: number;
  byCategory: CategoryFill[];
}

const percent = (part: number, whole: number) =>
  whole <= 0 ? 0 : Math.min(100, Math.round((part / whole) * 100));

export function computeAnalytics(
  events: CampusEvent[],
  registrations: Registration[],
): PortalAnalytics {
  const live = events.filter((e) => !e.cancelled);
  const liveIds = new Set(live.map((e) => e.id));
  const taken = live.reduce((sum, e) => sum + e.taken, 0);
  const capacity = live.reduce((sum, e) => sum + e.capacity, 0);
  const liveRegs = registrations.filter((r) => liveIds.has(r.eventId));

  return {
    totalEvents: events.length,
    activeEvents: live.length,
    cancelledEvents: events.length - live.length,
    totalRegistrations: taken,
    waitlisted: liveRegs.filter((r) => r.status === "Waitlisted").length,
    checkedIn: liveRegs.filter((r) => r.status === "Approved" && r.checkedIn).length,
    approvedRows: liveRegs.filter((r) => r.status === "Approved").length,
    fillRate: percent(taken, capacity),
    byCategory: CATEGORIES.map((category) => {
      const inCategory = live.filter((e) => e.category === category);
      const catTaken = inCategory.reduce((sum, e) => sum + e.taken, 0);
      const catCapacity = inCategory.reduce((sum, e) => sum + e.capacity, 0);
      return {
        category,
        taken: catTaken,
        capacity: catCapacity,
        pct: percent(catTaken, catCapacity),
      };
    }),
  };
}

/* ================================================================== */
/* 5. Schedule-conflict detector + .ics export                         */
/* ================================================================== */

const normalizeLabel = (label: string) => label.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Returns another event the attendee already holds an Approved pass for on the
 * same `date_label`, if any. Used to warn (not block) before registering.
 */
export function findScheduleConflict(
  events: CampusEvent[],
  registrations: Registration[],
  eventId: string,
  enrollmentId: string,
): CampusEvent | undefined {
  const target = events.find((e) => e.id === eventId);
  if (!target) return undefined;
  const label = normalizeLabel(target.dateLabel);
  for (const reg of registrations) {
    if (reg.enrollmentId !== enrollmentId || reg.status !== "Approved" || reg.eventId === eventId)
      continue;
    const other = events.find((e) => e.id === reg.eventId);
    if (other && !other.cancelled && normalizeLabel(other.dateLabel) === label) return other;
  }
  return undefined;
}

// MIT-ADT is in Pune: IST is UTC+05:30 all year (no daylight saving), so the
// event's wall-clock time converts to UTC unambiguously.
const IST_OFFSET_MINUTES = 330;
const EVENT_DURATION_MINUTES = 120;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

function icsUtcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function icsDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function icsEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 §3.1: lines are folded at 75 octets with a leading space on continuations. */
function foldIcsLine(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

/** Builds a valid iCalendar (RFC 5545) document for one event. */
export function buildIcs(event: CampusEvent, ticketId?: string): string {
  const date = parseEventDate(event.dateLabel);
  if (!date) {
    throw new Error("This event's date couldn't be read, so a calendar file can't be created.");
  }
  const hasTime = /\d{1,2}:\d{2}\s*(AM|PM)/i.test(event.dateLabel);

  const when: string[] = [];
  if (hasTime) {
    const start = new Date(
      Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        0,
        parseEventTime(event.dateLabel) - IST_OFFSET_MINUTES,
      ),
    );
    const end = new Date(start.getTime() + EVENT_DURATION_MINUTES * 60_000);
    when.push(`DTSTART:${icsUtcStamp(start)}`, `DTEND:${icsUtcStamp(end)}`);
  } else {
    const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    when.push(`DTSTART;VALUE=DATE:${icsDate(date)}`, `DTEND;VALUE=DATE:${icsDate(nextDay)}`);
  }

  const description = [
    `${event.category} event at MIT-ADT University.`,
    event.description,
    ticketId ? `Gate pass ticket: ${ticketId}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MIT-ADT University//Campus Event Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${(ticketId ?? event.code).replace(/\s+/g, "")}@campus-events.mit-adt`,
    `DTSTAMP:${icsUtcStamp(new Date())}`,
    ...when,
    `SUMMARY:${icsEscape(event.title)}`,
    `LOCATION:${icsEscape(event.venue)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    `STATUS:${event.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(`${event.title} starts in 1 hour`)}`,
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

/** Triggers a browser download of the `.ics` file for an event. */
export function downloadIcs(event: CampusEvent, ticketId?: string): void {
  const ics = buildIcs(event, ticketId);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const slug = event.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  link.href = url;
  link.download = `${slug || "event"}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}