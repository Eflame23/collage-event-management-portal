import { BellRing, CalendarDays, MapPin, Ticket, TriangleAlert, XCircle } from "lucide-react";
import { type CampusEvent, type GatePass, type NotificationItem } from "./data";
import { QrCode } from "./QrCode";

interface PassesAlertsProps {
  passes: GatePass[];
  events: CampusEvent[];
  notifications: NotificationItem[];
  onCancelRegistration: (event: CampusEvent) => void;
}

export function PassesAlerts({
  passes,
  events,
  notifications,
  onCancelRegistration,
}: PassesAlertsProps) {
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

        {passes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-portal-hairline bg-card py-12 text-center text-sm text-muted-foreground">
            No passes yet — register for an event from Discovery & Events.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {passes.map((pass) => {
              const event = events.find((e) => e.id === pass.eventId);
              if (!event) return null;
              return (
                <article
                  key={pass.eventId}
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
                    <QrCode value={pass.ticketId} className="size-14 shrink-0 rounded bg-white p-1 text-portal-regal" />
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
                    <div className="flex items-center justify-between border-t border-dashed border-portal-hairline pt-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{pass.attendee}</p>
                        <p className="text-[11px]">{pass.division} | Roll 104</p>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-portal-regal">
                        {pass.ticketId}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCancelRegistration(event)}
                      className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/40 py-2 text-xs font-bold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <XCircle className="size-3.5" />
                      Cancel Registration
                    </button>
                  </div>
                </article>
              );
            })}
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
