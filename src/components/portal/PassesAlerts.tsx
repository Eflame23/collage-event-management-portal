import {
  BellRing,
  CalendarDays,
  CalendarPlus,
  CircleCheck,
  Hourglass,
  MapPin,
  Ticket,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { type CampusEvent, type NotificationItem } from "./data";
import { downloadIcs, type Registration } from "./portal-logic";
import { QrCode } from "./QrCode";

interface PassesAlertsProps {
  /** The signed-in student's Enrollment ID: the only ID whose passes are shown. */
  enrollmentId: string;
  /** Registrations already filtered to `enrollmentId`, every status. */
  passes: Registration[];
  events: CampusEvent[];
  notifications: NotificationItem[];
  /** eventId -> 1-based waitlist position for this student. */
  waitlistPositions: Record<string, number>;
  onCancelRegistration: (event: CampusEvent) => void;
  /** Faculty / Admin can look but not cancel a student's pass. */
  readOnly?: boolean;
}

function formatCheckInTime(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PassesAlerts({
  enrollmentId,
  passes,
  events,
  notifications,
  waitlistPositions,
  onCancelRegistration,
  readOnly = false,
}: PassesAlertsProps) {
  // Strict per-enrollment isolation: never render a row that belongs to another ID.
  const mine = passes.filter((p) => p.enrollmentId === enrollmentId);
  const approved = mine.filter((p) => p.status === "Approved");
  const others = mine.filter((p) => p.status !== "Approved");

  const handleDownloadIcs = (event: CampusEvent, pass: Registration) => {
    try {
      downloadIcs(event, pass.ticketId);
      toast.success(`Calendar file saved for ${event.title}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create the calendar file.");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Confirmed passes */}
      <section className="lg:col-span-2 space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-portal-gold-soft text-portal-gold-text">
            <Ticket className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold text-portal-regal">My Passes</h2>
            <p className="text-xs text-muted-foreground">
              Confirmed digital gate passes issued to you
            </p>
          </div>
        </div>

        <p className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-portal-gold-soft px-3 py-1 text-[11px] font-bold text-portal-gold-text">
          Enrollment ID:
          <span className="break-all font-mono">{enrollmentId}</span>
        </p>

        {readOnly && (
          <p className="rounded-xl border border-portal-hairline bg-secondary px-4 py-2.5 text-xs font-semibold text-muted-foreground">
            Read-only view — switch to the Student role to cancel registrations.
          </p>
        )}

        {approved.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-portal-hairline bg-card py-12 text-center text-sm text-muted-foreground">
            No passes yet — register for an event from Discovery & Events.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {approved.map((pass) => {
              const event = events.find((e) => e.id === pass.eventId);
              if (!event) return null;
              return (
                <article
                  key={`${pass.eventId}:${pass.enrollmentId}`}
                  className="overflow-hidden rounded-2xl border border-portal-hairline bg-card shadow-portal"
                >
                  <div className="flex items-start justify-between gap-3 bg-portal-purple px-5 py-4">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-portal-gold">
                        Digital Gate Pass
                      </p>
                      <h3 className="mt-0.5 font-display text-lg font-bold text-white">
                        {event.title}
                      </h3>
                    </div>
                    <QrCode
                      value={pass.ticketId}
                      className="size-14 shrink-0 rounded bg-white p-1 text-portal-regal"
                    />
                  </div>
                  <div className="space-y-2 px-5 py-4 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <CalendarDays className="size-3.5 text-portal-gold" />
                      {event.dateLabel}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-portal-gold" />
                      {event.venue}
                    </p>
                    {pass.checkedIn && (
                      <p className="flex items-center gap-1.5 rounded-lg bg-portal-ok/15 px-2.5 py-1.5 font-bold text-portal-ok">
                        <CircleCheck className="size-3.5" aria-hidden />
                        Checked In
                        {pass.checkedInAt && (
                          <span className="ml-auto font-semibold opacity-80">
                            {formatCheckInTime(pass.checkedInAt)}
                          </span>
                        )}
                      </p>
                    )}
                    <div className="flex items-center justify-between border-t border-dashed border-portal-hairline pt-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest">
                          Enrollment ID
                        </p>
                        <p className="break-all font-mono text-sm font-bold text-foreground">
                          {pass.enrollmentId}
                        </p>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-portal-regal">
                        {pass.ticketId}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadIcs(event, pass)}
                      className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-portal-gold bg-portal-gold-soft py-2 text-xs font-bold text-portal-gold-text transition-colors hover:bg-portal-gold hover:text-white"
                    >
                      <CalendarPlus className="size-3.5" />
                      Download .ics
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onCancelRegistration(event)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/40 py-2 text-xs font-bold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <XCircle className="size-3.5" />
                        Cancel Registration
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {others.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-portal-regal">
              <Hourglass className="size-4 text-portal-gold" aria-hidden />
              Waitlist & Requests
            </h3>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {others.map((reg) => {
                const event = events.find((e) => e.id === reg.eventId);
                if (!event) return null;
                const position = waitlistPositions[reg.eventId];
                const badge =
                  reg.status === "Waitlisted"
                    ? {
                        text: `Waitlist #${position ?? "?"}`,
                        cls: "bg-portal-gold-soft text-portal-gold-text",
                      }
                    : reg.status === "Pending"
                      ? {
                          text: "Pending approval",
                          cls: "bg-portal-gold-soft text-portal-gold-text",
                        }
                      : { text: "Rejected", cls: "bg-destructive/10 text-destructive" };
                return (
                  <li
                    key={`${reg.eventId}:${reg.enrollmentId}`}
                    className="rounded-2xl border border-portal-hairline bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-display text-base font-bold text-portal-regal">
                        {event.title}
                      </h4>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${badge.cls}`}
                      >
                        {badge.text}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="size-3.5 text-portal-gold" />
                      {event.dateLabel}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {reg.status === "Waitlisted" &&
                        "No seat is held yet. Your pass is issued automatically the moment a seat opens up."}
                      {reg.status === "Pending" &&
                        "The organizer will review your request shortly."}
                      {reg.status === "Rejected" && "The organizer declined this registration."}
                    </p>
                    {!readOnly && reg.status !== "Rejected" && (
                      <button
                        type="button"
                        onClick={() => onCancelRegistration(event)}
                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/40 py-2 text-xs font-bold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <XCircle className="size-3.5" />
                        {reg.status === "Waitlisted" ? "Leave Waitlist" : "Withdraw Request"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Notifications */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-portal-gold-soft text-portal-gold-text">
            <BellRing className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold text-portal-regal">Recent Alerts</h2>
            <p className="text-xs text-muted-foreground">Campus broadcasts & event updates</p>
          </div>
        </div>
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-2xl border p-4 shadow-sm ${
                n.kind === "alert"
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-portal-hairline bg-card"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {n.kind === "alert" ? (
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                ) : (
                  <BellRing className="mt-0.5 size-4 shrink-0 text-portal-gold" />
                )}
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <span className="truncate">{n.title}</span>
                    {n.unread && (
                      <span
                        aria-label="Unread"
                        className="size-2 shrink-0 rounded-full bg-portal-magenta"
                      />
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {n.time}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
