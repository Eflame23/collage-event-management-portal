import { BadgeCheck, CalendarDays, MapPin, ShieldCheck, X } from "lucide-react";
import { type CampusEvent, STUDENT } from "./data";
import { seatPercent } from "./portal-logic";
import { QrCode } from "./QrCode";

interface RegisterModalProps {
  event: CampusEvent;
  /** "confirm" for a fresh registration, "pass" to view an existing pass. */
  stage: "confirm" | "pass";
  ticketId: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function RegisterModal({ event, stage, ticketId, onClose, onConfirm }: RegisterModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={stage === "confirm" ? `Register for ${event.title}` : `Gate pass for ${event.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-portal-regal/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative my-8 w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-portal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-4.5" />
        </button>

        {stage === "confirm" ? (
          <ConfirmStage event={event} onConfirm={onConfirm} onClose={onClose} />
        ) : (
          <PassStage event={event} ticketId={ticketId} />
        )}
      </div>
    </div>
  );
}

function ConfirmStage({
  event,
  onConfirm,
  onClose,
}: Pick<RegisterModalProps, "event" | "onConfirm" | "onClose">) {
  const pct = seatPercent(event);
  return (
    <div>
      <div className="bg-portal-purple px-6 py-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-portal-gold">
          Confirm Registration
        </p>
        <h2 className="mt-1 font-display text-xl font-bold text-white">{event.title}</h2>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
          <CalendarDays className="size-3.5" />
          {event.dateLabel} · <MapPin className="size-3.5" /> {event.venue}
        </p>
      </div>

      <div className="space-y-4 p-6">
        <div className="rounded-xl border border-portal-hairline bg-secondary p-4">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            <ShieldCheck className="size-4 text-portal-gold" />
            Verifying attendee identity
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-portal-gold text-sm font-extrabold text-white">
              {STUDENT.initials}
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">
                {STUDENT.name} | {STUDENT.division}
              </p>
              <p className="text-xs text-muted-foreground">Roll {STUDENT.roll} · Verified student</p>
            </div>
            <BadgeCheck className="ml-auto size-5 text-portal-ok" />
          </div>
        </div>

        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Seats</span>
            <span className="font-semibold text-foreground">
              {event.taken}/{event.capacity} ({pct}% filled)
            </span>
          </div>
          <div className="flex justify-between">
            <span>Category</span>
            <span className="font-semibold text-foreground">{event.category}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-portal-hairline bg-card py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-portal-gold py-2.5 text-sm font-bold text-white shadow-gold transition-colors hover:bg-portal-gold/90"
          >
            Confirm Registration
          </button>
        </div>
      </div>
    </div>
  );
}

function PassStage({ event, ticketId }: { event: CampusEvent; ticketId: string }) {
  return (
    <div>
      <div className="bg-portal-gold px-6 py-5 text-center">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/90">
          Digital Event Gate Pass
        </p>
        <h2 className="mt-0.5 font-display text-lg font-bold text-white">
          MIT-ADT UNIVERSITY
        </h2>
      </div>

      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold text-portal-regal">{event.title}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />
              {event.dateLabel}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              {event.venue}
            </p>
          </div>
          <QrCode value={ticketId} className="size-20 shrink-0 text-portal-regal" />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-portal-hairline bg-portal-cream px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-portal-gold text-xs font-extrabold text-white">
              {STUDENT.initials}
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">{STUDENT.name}</p>
              <p className="text-xs text-muted-foreground">
                {STUDENT.division} | Roll {STUDENT.roll}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-portal-gold-soft px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-portal-gold-text">
            Valid
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-dashed border-portal-hairline pt-4">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Ticket ID
          </span>
          <span className="font-mono text-sm font-bold text-portal-regal">{ticketId}</span>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Present this pass at the entry gate. Carrying a copy on your phone is sufficient.
        </p>
      </div>
    </div>
  );
}
