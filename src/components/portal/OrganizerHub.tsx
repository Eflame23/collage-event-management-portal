import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CircleCheck,
  Gauge,
  Lock,
  Megaphone,
  ScanLine,
  Search,
  Send,
  ShieldCheck,
  Ticket,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  CATEGORIES,
  COVER_IMAGE_PRESETS,
  formatEventDate,
  parseEventDate,
  type CampusEvent,
  type EventCategory,
  type EventDraft,
} from "./data";
import {
  ROLE_LABELS,
  attendeeFromEnrollmentId,
  canAccessOrganizerHub,
  DUPLICATE_EVENT_TITLE_MESSAGE,
  INVALID_STUDENT_ID_MESSAGE,
  PAST_EVENT_DATE_MESSAGE,
  computeAnalytics,
  groupByEnrollment,
  hasPermission,
  isDuplicateEventTitle,
  isPastEventDate,
  isValidStudentEnrollmentId,
  localIsoDate,
  normalizeId,
  sessionSummary,
  waitlistPosition,
  type AttendeeInfo,
  type PortalAnalytics,
  type Registration,
  type RegistrationStatus,
  type SessionProfile,
} from "./portal-logic";

/** Result of a publish attempt; the form only resets after "published". */
export type PublishOutcome = "published" | "duplicate" | "past_date" | "failed";

export interface VerifyResult {
  ok: boolean;
  message: string;
}

interface OrganizerHubProps {
  /** The signed-in Faculty / Administrator (or a Student, who gets the restricted screen). */
  session: SessionProfile;
  events: CampusEvent[];
  /** Every registration row (all students, all statuses). */
  registrations: Registration[];
  onLogout: () => void;
  onPublish: (draft: EventDraft) => Promise<PublishOutcome> | PublishOutcome;
  onEmergencyCancel: (event: CampusEvent) => void;
  onApprove: (event: CampusEvent, registration: Registration) => Promise<void> | void;
  onReject: (event: CampusEvent, registration: Registration) => Promise<void> | void;
  onRemove: (event: CampusEvent, registration: Registration) => Promise<void> | void;
  onToggleCheckIn: (
    event: CampusEvent,
    registration: Registration,
    checkedIn: boolean,
  ) => Promise<void> | void;
  onVerifyTicket: (event: CampusEvent, ticketId: string) => Promise<VerifyResult>;
  onAddAttendee: (event: CampusEvent, who: AttendeeInfo) => Promise<void> | void;
}

/** RBAC gate: students get the restricted screen, staff get the workspace. */
export function OrganizerHub(props: OrganizerHubProps) {
  if (!canAccessOrganizerHub(props.session.role)) {
    return <RestrictedAccess session={props.session} onLogout={props.onLogout} />;
  }
  return <OrganizerWorkspace {...props} />;
}

function RestrictedAccess({
  session,
  onLogout,
}: {
  session: SessionProfile;
  onLogout: () => void;
}) {
  return (
    <section
      role="alert"
      className="mx-auto max-w-xl rounded-2xl border border-portal-hairline bg-card p-8 text-center shadow-portal sm:p-12"
    >
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <Lock className="size-7" aria-hidden />
      </span>
      <h2 className="mt-5 font-display text-2xl font-bold text-portal-regal">
        Restricted: Faculty / Admin Role Required
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        The Organizer Hub — publishing events, participant management and gate check-in — is
        available to Faculty and Administrators. You are currently signed in as{" "}
        <span className="font-mono font-semibold text-foreground">{sessionSummary(session)}</span>.
      </p>
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg bg-portal-gold px-5 py-2.5 text-sm font-bold text-white shadow-gold transition-colors hover:bg-portal-gold/90"
        >
          Sign in as Faculty or Administrator
        </button>
      </div>
    </section>
  );
}

type HubView = "events" | "directory";

function OrganizerWorkspace({
  session,
  events,
  registrations,
  onPublish,
  onEmergencyCancel,
  onApprove,
  onReject,
  onRemove,
  onToggleCheckIn,
  onVerifyTicket,
  onAddAttendee,
}: OrganizerHubProps) {
  const role = session.role;
  const [view, setView] = useState<HubView>("events");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EventCategory>("Technical");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState(50);
  const [imageUrl, setImageUrl] = useState("");
  const [coverImage, setCoverImage] = useState(COVER_IMAGE_PRESETS[0]?.image ?? "");
  const [participantsEventId, setParticipantsEventId] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const canPublishEvents = hasPermission(role, "publishEvents");
  const canEmergencyCancel = hasPermission(role, "emergencyCancel");
  const analytics = useMemo(() => computeAnalytics(events, registrations), [events, registrations]);
  const participantsEvent = participantsEventId
    ? events.find((e) => e.id === participantsEventId)
    : undefined;

  const canPublish =
    canPublishEvents && title.trim() && venue.trim() && date && capacity > 0 && capacity <= 999 && coverImage.trim();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPublish || publishing) return;
    // Validate everything first so both problems show at once.
    const duplicate = isDuplicateEventTitle(events, title);
    const pastDate = isPastEventDate(date);
    setTitleError(duplicate ? DUPLICATE_EVENT_TITLE_MESSAGE : null);
    setDateError(pastDate ? PAST_EVENT_DATE_MESSAGE : null);
    if (duplicate || pastDate) return;
    setPublishing(true);
    let outcome: PublishOutcome;
    try {
      outcome = await onPublish({
        title: title.trim(),
        category,
        venue: venue.trim(),
        dateLabel: formatDateLabel(date),
        capacity,
        image: coverImage,
      });
    } finally {
      setPublishing(false);
    }
    if (outcome === "duplicate") {
      setTitleError(DUPLICATE_EVENT_TITLE_MESSAGE);
      return;
    }
    if (outcome === "past_date") {
      setDateError(PAST_EVENT_DATE_MESSAGE);
      return;
    }
    if (outcome !== "published") return;
    setTitle("");
    setVenue("");
    setDate("");
    setCapacity(50);
    setImageUrl("");
    setCoverImage(COVER_IMAGE_PRESETS[0]?.image ?? "");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-portal-gold-soft px-3 py-1 font-bold text-portal-gold-text">
          <ShieldCheck className="size-3.5" aria-hidden />
          {ROLE_LABELS[role]} · <span className="font-mono">{session.displayName}</span>
        </span>
        {!canEmergencyCancel && (
          <span className="text-muted-foreground">
            Emergency Cancel is available to Administrators only.
          </span>
        )}
      </div>

      {/* Sub-tabs */}
      <div
        role="tablist"
        aria-label="Organizer Hub views"
        className="inline-flex gap-1 rounded-xl border border-portal-hairline bg-card p-1 shadow-sm"
      >
        {(
          [
            ["events", "Event Management"],
            ["directory", "Student Enrollment Directory"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors sm:text-sm ${
              view === key
                ? "bg-portal-gold text-white shadow-gold"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "directory" && (
        <EnrollmentDirectory events={events} registrations={registrations} />
      )}

      {view === "events" && (
        <>
          <AnalyticsStrip analytics={analytics} />

          {/* Publish form */}
          <section className="rounded-xl border border-portal-hairline bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-portal-gold-soft text-portal-gold-text">
                <Megaphone className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold text-portal-regal">
                  Publish a New Event
                </h2>
                <p className="text-xs text-muted-foreground">
                  Published events appear instantly on the Discovery grid.
                </p>
              </div>
            </div>

            <form
              onSubmit={submit}
              noValidate
              className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <Field label="Event Title">
                <input
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (titleError) setTitleError(null);
                  }}
                  placeholder="e.g. RoboWars 3.0"
                  aria-invalid={titleError ? true : undefined}
                  aria-describedby={titleError ? "event-title-error" : undefined}
                  className={`${inputClass} ${titleError ? "border-destructive focus:border-destructive focus:ring-destructive/25" : ""}`}
                />
                {titleError && (
                  <span
                    id="event-title-error"
                    role="alert"
                    className="mt-1.5 block text-xs font-semibold text-destructive"
                  >
                    {titleError}
                  </span>
                )}
              </Field>
              <Field label="Category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EventCategory)}
                  className={inputClass}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Venue / Hall">
                <input
                  required
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Innovation Lab, SOC"
                  className={inputClass}
                />
              </Field>
              <Field label="Date">
                <input
                  required
                  type="date"
                  value={date}
                  min={localIsoDate()}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (dateError) setDateError(null);
                  }}
                  aria-invalid={dateError ? true : undefined}
                  aria-describedby={dateError ? "event-date-error" : undefined}
                  className={`${inputClass} ${dateError ? "border-destructive focus:border-destructive focus:ring-destructive/25" : ""}`}
                />
                {dateError && (
                  <span
                    id="event-date-error"
                    role="alert"
                    className="mt-1.5 block text-xs font-semibold text-destructive"
                  >
                    {dateError}
                  </span>
                )}
              </Field>
              <Field label="Capacity">
                <input
                  type="number"
                  min={1}
                  max={999}
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
              <div className="space-y-3 sm:col-span-2 lg:col-span-3">
                <div>
                  <h3 className="text-xs font-bold uppercase text-muted-foreground">Cover Image</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Paste an image link, upload a file, or select a banner.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {COVER_IMAGE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      aria-pressed={coverImage === preset.image}
                      onClick={() => {
                        setCoverImage(preset.image);
                        setImageUrl("");
                      }}
                      className={`min-w-0 overflow-hidden rounded-lg border text-left transition-colors ${
                        coverImage === preset.image
                          ? "border-portal-gold ring-2 ring-portal-gold/30"
                          : "border-portal-hairline hover:border-portal-gold/60"
                      }`}
                    >
                      <img src={preset.image} alt="" className="aspect-video w-full object-cover" />
                      <span className="block truncate px-2 py-1.5 text-[11px] font-semibold text-foreground">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(12rem,20rem)]">
                  <div className="space-y-3">
                    <Field label="Image URL">
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(event) => {
                          const value = event.target.value;
                          setImageUrl(value);
                          setCoverImage(value.trim() || COVER_IMAGE_PRESETS[0]?.image || "");
                        }}
                        placeholder="https://example.com/event-cover.jpg"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Upload local image">
                      <input
                        type="file"
                        accept="image/*"
                        aria-label="Upload local event cover image"
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          if (!file || !file.type.startsWith("image/")) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === "string") {
                              setCoverImage(reader.result);
                              setImageUrl("");
                            }
                          };
                          reader.readAsDataURL(file);
                          event.currentTarget.value = "";
                        }}
                        className="block w-full rounded-lg border border-portal-hairline bg-background px-3 py-2 text-xs text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground"
                      />
                    </Field>
                  </div>
                  {coverImage && (
                    <figure className="overflow-hidden rounded-lg border border-portal-hairline bg-secondary">
                      <img
                        src={coverImage}
                        alt="Selected event cover preview"
                        className="aspect-video w-full object-cover"
                      />
                      <figcaption className="px-3 py-2 text-[11px] font-semibold text-muted-foreground">
                        Selected cover preview
                      </figcaption>
                    </figure>
                  )}
                </div>
              </div>
              <div className="flex items-end justify-end sm:col-span-2 lg:col-span-3">
                <button
                  type="submit"
                  disabled={!canPublish || publishing}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-portal-gold px-4 py-2.5 text-sm font-bold text-white shadow-gold transition-colors hover:bg-portal-gold/90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-48"
                >
                  <Send className="size-4" />
                  Publish Event
                </button>
              </div>
            </form>
          </section>

          {/* Live events table */}
          <section className="overflow-hidden rounded-xl border border-portal-hairline bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-portal-hairline px-6 py-4">
              <h2 className="font-display text-lg font-bold text-portal-regal">Live Event Table</h2>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="size-3.5" />
                {events.length} events tracked
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="border-b border-portal-hairline bg-secondary text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    <th className="px-6 py-3">Event</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Venue</th>
                    <th className="px-4 py-3">Seats</th>
                    <th className="px-4 py-3">Checked In</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const rows = registrations.filter((r) => r.eventId === event.id);
                    const checkedIn = rows.filter(
                      (r) => r.status === "Approved" && r.checkedIn,
                    ).length;
                    return (
                      <tr key={event.id} className="border-b border-portal-hairline last:border-0">
                        <td className="px-6 py-3 font-semibold text-foreground">{event.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{event.category}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="size-3.5 text-portal-gold" />
                            {event.dateLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{event.venue}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {event.taken}/{event.capacity}
                        </td>
                        <td className="px-4 py-3">
                          {checkedIn > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-portal-ok/15 px-2.5 py-1 text-[11px] font-bold text-portal-ok">
                              <CircleCheck className="size-3" aria-hidden />
                              {checkedIn} Checked In
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill event={event} />
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setParticipantsEventId(event.id)}
                              className="rounded-lg border border-portal-gold bg-portal-gold-soft px-3 py-1.5 text-xs font-bold text-portal-gold-text transition-colors hover:bg-portal-gold hover:text-white"
                            >
                              Participants ({rows.length})
                            </button>
                            {canEmergencyCancel && (
                              <button
                                type="button"
                                disabled={event.cancelled}
                                onClick={() => onEmergencyCancel(event)}
                                className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Emergency Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {participantsEvent && (
        <ParticipantsDrawer
          event={participantsEvent}
          registrations={registrations}
          onClose={() => setParticipantsEventId(null)}
          onApprove={onApprove}
          onReject={onReject}
          onRemove={onRemove}
          onToggleCheckIn={onToggleCheckIn}
          onVerifyTicket={onVerifyTicket}
          onAddAttendee={onAddAttendee}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */

function AnalyticsStrip({ analytics }: { analytics: PortalAnalytics }) {
  const cards = [
    {
      label: "Total Events",
      value: String(analytics.totalEvents),
      sub: `${analytics.activeEvents} live · ${analytics.cancelledEvents} cancelled`,
      Icon: CalendarDays,
    },
    {
      label: "Total Registrations",
      value: String(analytics.totalRegistrations),
      sub: `${analytics.waitlisted} on waitlists`,
      Icon: Ticket,
    },
    {
      label: "Checked-In Attendance",
      value: String(analytics.checkedIn),
      sub: `of ${analytics.approvedRows} approved passes`,
      Icon: UserCheck,
    },
    {
      label: "Overall Fill Rate",
      value: `${analytics.fillRate}%`,
      sub: "seats booked across live events",
      Icon: Gauge,
    },
  ];

  return (
    <section aria-label="Live analytics" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, sub, Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-portal-hairline bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {label}
              </p>
              <span className="flex size-8 items-center justify-center rounded-lg bg-portal-gold-soft text-portal-gold-text">
                <Icon className="size-4" aria-hidden />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-extrabold text-portal-regal">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-portal-hairline bg-card p-5 shadow-sm">
        <h2 className="font-display text-base font-bold text-portal-regal">
          Fill Rate by Category
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {analytics.byCategory.map((row) => (
            <div key={row.category}>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">{row.category}</span>
                <span className="text-muted-foreground">
                  {row.taken}/{row.capacity} · {row.pct}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`${row.category} fill rate`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={row.pct}
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-portal-hairline"
              >
                <div
                  className="h-full rounded-full bg-portal-gold transition-[width] duration-500"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Participants drawer: approve / reject / remove, QR gate check-in    */
/* ------------------------------------------------------------------ */

const STATUS_RANK: Record<RegistrationStatus, number> = {
  Approved: 0,
  Pending: 1,
  Waitlisted: 2,
  Rejected: 3,
};

interface ParticipantsDrawerProps {
  event: CampusEvent;
  registrations: Registration[];
  onClose: () => void;
  onApprove: OrganizerHubProps["onApprove"];
  onReject: OrganizerHubProps["onReject"];
  onRemove: OrganizerHubProps["onRemove"];
  onToggleCheckIn: OrganizerHubProps["onToggleCheckIn"];
  onVerifyTicket: OrganizerHubProps["onVerifyTicket"];
  onAddAttendee: OrganizerHubProps["onAddAttendee"];
}

function ParticipantsDrawer({
  event,
  registrations,
  onClose,
  onApprove,
  onReject,
  onRemove,
  onToggleCheckIn,
  onVerifyTicket,
  onAddAttendee,
}: ParticipantsDrawerProps) {
  const [ticketInput, setTicketInput] = useState("");
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [walkId, setWalkId] = useState("");
  const [walkError, setWalkError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const rows = useMemo(() => {
    const mine = registrations.filter((r) => r.eventId === event.id);
    return mine.sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime(),
    );
  }, [registrations, event.id]);

  const waitlisted = rows.filter((r) => r.status === "Waitlisted").length;
  const checkedIn = rows.filter((r) => r.status === "Approved" && r.checkedIn).length;

  const run = async (key: string, action: () => Promise<void> | void) => {
    setBusyKey(key);
    try {
      await action();
    } finally {
      setBusyKey(null);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketInput.trim()) {
      setVerifyResult({ ok: false, message: "Enter or scan a ticket ID first." });
      return;
    }
    setBusyKey("verify");
    try {
      const result = await onVerifyTicket(event, ticketInput);
      setVerifyResult(result);
      if (result.ok) setTicketInput("");
    } finally {
      setBusyKey(null);
    }
  };

  const addWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidStudentEnrollmentId(walkId)) {
      setWalkError(INVALID_STUDENT_ID_MESSAGE);
      return;
    }
    setWalkError(null);
    await run("walk-in", () => onAddAttendee(event, attendeeFromEnrollmentId(walkId)));
    setWalkId("");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Participants for ${event.title}`}
      className="fixed inset-0 z-50 flex justify-end bg-portal-regal/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-4xl flex-col overflow-hidden bg-card shadow-portal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-portal-purple px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close participants"
            className="absolute right-4 top-4 rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
          <p className="text-[11px] font-bold uppercase tracking-widest text-portal-gold">
            Participants ({rows.length})
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-white">{event.title}</h2>
          <p className="mt-1 text-xs text-white/70">
            {event.dateLabel} · {event.venue} · {event.taken}/{event.capacity} seats · {waitlisted}{" "}
            waitlisted · {checkedIn} checked in
          </p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Gate: verify ticket id */}
          <form
            onSubmit={verify}
            className="rounded-xl border border-portal-hairline bg-secondary p-4"
          >
            <label
              htmlFor="verify-ticket"
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              <ScanLine className="size-4 text-portal-gold" aria-hidden />
              Verify Ticket ID
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id="verify-ticket"
                value={ticketInput}
                onChange={(e) => {
                  setTicketInput(e.target.value);
                  setVerifyResult(null);
                }}
                placeholder="Scan or type ticket ID (MIT-ADT-2025-<EVENT>-<ENROLLMENT ID>)"
                autoComplete="off"
                spellCheck={false}
                className={`${inputClass} font-mono`}
              />
              <button
                type="submit"
                disabled={busyKey === "verify" || event.cancelled}
                className="shrink-0 rounded-lg bg-portal-gold px-4 py-2.5 text-sm font-bold text-white shadow-gold transition-colors hover:bg-portal-gold/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Verify &amp; Check In
              </button>
            </div>
            {verifyResult && (
              <p
                role="status"
                className={`mt-2 text-xs font-semibold ${
                  verifyResult.ok ? "text-portal-ok" : "text-destructive"
                }`}
              >
                {verifyResult.message}
              </p>
            )}
          </form>

          {/* Manual / walk-in attendee */}
          <details className="rounded-xl border border-portal-hairline px-4 py-3">
            <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold text-portal-regal">
              <UserPlus className="size-4 text-portal-gold" aria-hidden />
              Add walk-in / manual registration by Enrollment ID
            </summary>
            <form
              onSubmit={addWalkIn}
              noValidate
              className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"
            >
              <input
                value={walkId}
                onChange={(e) => {
                  setWalkId(e.target.value);
                  if (walkError) setWalkError(null);
                }}
                placeholder="Enter Student Enrollment ID (e.g. ADT24SOCB0000)"
                aria-label="Walk-in Enrollment ID"
                aria-invalid={walkError ? true : undefined}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className={`${inputClass} font-mono`}
              />
              <button
                type="submit"
                disabled={busyKey === "walk-in" || event.cancelled}
                className="rounded-lg border border-portal-gold bg-portal-gold-soft px-4 py-2.5 text-sm font-bold text-portal-gold-text transition-colors hover:bg-portal-gold hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add
              </button>
            </form>
            {walkError && (
              <p role="alert" className="mt-2 text-xs font-semibold text-destructive">
                {walkError}
              </p>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              Registers the ID under this event, or joins the waitlist automatically when the event
              is full.
            </p>
          </details>

          {/* Participant table */}
          <div className="overflow-x-auto rounded-xl border border-portal-hairline">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-portal-hairline bg-secondary text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  <th className="px-4 py-3">Enrollment ID</th>
                  <th className="px-3 py-3">Ticket ID</th>
                  <th className="px-3 py-3">Roll</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Check-In</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      No registrations for this event yet.
                    </td>
                  </tr>
                )}
                {rows.map((reg) => {
                  const key = reg.ticketId;
                  const busy = busyKey === key;
                  const isApproved = reg.status === "Approved";
                  return (
                    <tr key={key} className="border-b border-portal-hairline last:border-0">
                      <td className="px-4 py-3 font-mono text-sm font-extrabold text-foreground">
                        {reg.enrollmentId || "—"}
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] font-bold text-portal-regal">
                        {reg.ticketId}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{reg.roll || "—"}</td>
                      <td className="px-3 py-3">
                        <ParticipantStatus
                          status={reg.status}
                          position={waitlistPosition(registrations, reg.eventId, reg.enrollmentId)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={reg.checkedIn}
                            aria-label={`Check in ${reg.enrollmentId}`}
                            disabled={!isApproved || busy || event.cancelled}
                            onClick={() =>
                              run(key, () => onToggleCheckIn(event, reg, !reg.checkedIn))
                            }
                            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                              reg.checkedIn ? "bg-portal-ok" : "bg-portal-hairline"
                            }`}
                          >
                            <span
                              aria-hidden
                              className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left] ${
                                reg.checkedIn ? "left-[1.125rem]" : "left-0.5"
                              }`}
                            />
                          </button>
                          {isApproved && reg.checkedIn ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-portal-ok/15 px-2 py-0.5 text-[11px] font-bold text-portal-ok">
                              <CircleCheck className="size-3" aria-hidden />
                              Checked In
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              {isApproved ? "Not yet" : "—"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isApproved || busy}
                            onClick={() => run(key, () => onApprove(event, reg))}
                            className="rounded-md border border-portal-ok/40 px-2.5 py-1 text-[11px] font-bold text-portal-ok transition-colors hover:bg-portal-ok hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={reg.status === "Rejected" || busy}
                            onClick={() => run(key, () => onReject(event, reg))}
                            className="rounded-md border border-portal-gold px-2.5 py-1 text-[11px] font-bold text-portal-gold-text transition-colors hover:bg-portal-gold hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Remove ${reg.enrollmentId} from ${event.title}? ${
                                    isApproved
                                      ? "Their seat will go to the next student on the waitlist."
                                      : "This deletes their registration."
                                  }`,
                                )
                              ) {
                                void run(key, () => onRemove(event, reg));
                              }
                            }}
                            className="rounded-md border border-destructive/40 px-2.5 py-1 text-[11px] font-bold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Student Enrollment Directory: every registration grouped by ID      */
/* ------------------------------------------------------------------ */

const DIRECTORY_BADGE: Record<RegistrationStatus, string> = {
  Approved: "bg-portal-ok/15 text-portal-ok",
  Pending: "bg-portal-gold-soft text-portal-gold-text",
  Waitlisted: "bg-secondary text-foreground",
  Rejected: "bg-destructive/10 text-destructive",
};

function EnrollmentDirectory({
  events,
  registrations,
}: {
  events: CampusEvent[];
  registrations: Registration[];
}) {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => groupByEnrollment(registrations), [registrations]);
  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  const needle = normalizeId(query);
  const visible = needle ? groups.filter((g) => g.enrollmentId.includes(needle)) : groups;

  return (
    <section
      aria-label="Student Enrollment Directory"
      className="overflow-hidden rounded-xl border border-portal-hairline bg-card shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-portal-hairline px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-portal-regal">
            Student Enrollment Directory
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {groups.length} Enrollment {groups.length === 1 ? "ID" : "IDs"} · {registrations.length}{" "}
            {registrations.length === 1 ? "registration" : "registrations"} · grouped live from
            Supabase
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by Enrollment ID"
            aria-label="Filter by Enrollment ID"
            autoComplete="off"
            spellCheck={false}
            className={`${inputClass} pl-9 font-mono`}
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">
          No registrations yet — each Enrollment ID appears here after its first registration.
        </p>
      ) : visible.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">
          No Enrollment ID matches “{query.trim()}”.
        </p>
      ) : (
        <ul className="divide-y divide-portal-hairline">
          {visible.map((group) => (
            <li key={group.enrollmentId || "no-enrollment-id"} className="px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Enrollment ID
                  </p>
                  <p className="break-all font-mono text-base font-extrabold text-foreground">
                    {group.enrollmentId || "No Enrollment ID (legacy rows)"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                  <span className="rounded-full bg-portal-gold-soft px-2.5 py-1 text-portal-gold-text">
                    {group.total} {group.total === 1 ? "event" : "events"} registered
                  </span>
                  {group.checkedIn > 0 && (
                    <span className="rounded-full bg-portal-ok/15 px-2.5 py-1 text-portal-ok">
                      {group.checkedIn} checked in
                    </span>
                  )}
                </div>
              </div>

              <ul className="mt-3 space-y-2">
                {group.registrations.map((reg) => {
                  const event = eventById.get(reg.eventId);
                  const isCheckedIn = reg.status === "Approved" && reg.checkedIn;
                  return (
                    <li
                      key={reg.ticketId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-portal-hairline bg-secondary/60 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {event?.title ?? `Event ${reg.eventId}`}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {event ? `${event.dateLabel} · ${event.venue}` : "Event no longer listed"}
                          {event?.cancelled ? " · Cancelled" : ""}
                        </p>
                        <p className="mt-0.5 break-all font-mono text-[11px] font-bold text-portal-regal">
                          {reg.ticketId}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${DIRECTORY_BADGE[reg.status]}`}
                        >
                          {reg.status === "Waitlisted"
                            ? `Waitlisted #${waitlistPosition(registrations, reg.eventId, reg.enrollmentId)}`
                            : reg.status}
                        </span>
                        {isCheckedIn && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-portal-ok/15 px-2.5 py-1 text-[11px] font-bold text-portal-ok">
                            <CircleCheck className="size-3" aria-hidden />
                            Checked In
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ParticipantStatus({ status, position }: { status: RegistrationStatus; position: number }) {
  const styles: Record<RegistrationStatus, string> = {
    Approved: "bg-portal-ok/15 text-portal-ok",
    Pending: "bg-portal-gold-soft text-portal-gold-text",
    Waitlisted: "bg-secondary text-foreground",
    Rejected: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${styles[status]}`}>
      {status === "Waitlisted" ? `Waitlist #${position}` : status}
    </span>
  );
}

function StatusPill({ event }: { event: CampusEvent }) {
  if (event.cancelled) {
    return (
      <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive">
        Cancelled
      </span>
    );
  }
  if (event.taken >= event.capacity) {
    return (
      <span className="rounded-full bg-portal-gold-soft px-2.5 py-1 text-[11px] font-bold text-portal-gold-text">
        Full
      </span>
    );
  }
  return (
    <span className="rounded-full bg-portal-ok/15 px-2.5 py-1 text-[11px] font-bold text-portal-ok">
      Open
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-portal-hairline bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-portal-gold focus:outline-none focus:ring-2 focus:ring-portal-gold/25";

function formatDateLabel(iso: string): string {
  const parsed = parseEventDate(iso);
  return parsed ? formatEventDate(parsed, 10) : "";
}