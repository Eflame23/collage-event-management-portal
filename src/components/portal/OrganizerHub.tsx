import { useState } from "react";
import { CalendarDays, Megaphone, Send, Users } from "lucide-react";
import {
  CATEGORIES,
  COVER_IMAGE_PRESETS,
  formatEventDate,
  parseEventDate,
  type CampusEvent,
  type EventCategory,
  type EventDraft,
} from "./data";

interface OrganizerHubProps {
  events: CampusEvent[];
  onPublish: (draft: EventDraft) => void;
  onEmergencyCancel: (event: CampusEvent) => void;
}

export function OrganizerHub({ events, onPublish, onEmergencyCancel }: OrganizerHubProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EventCategory>("Technical");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState(50);
  const [imageUrl, setImageUrl] = useState("");
  const [coverImage, setCoverImage] = useState(COVER_IMAGE_PRESETS[0]?.image ?? "");

  const canPublish = title.trim() && venue.trim() && date && capacity > 0 && coverImage.trim();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPublish) return;
    onPublish({
      title: title.trim(),
      category,
      venue: venue.trim(),
      dateLabel: formatDateLabel(date),
      capacity,
      image: coverImage,
    });
    setTitle("");
    setVenue("");
    setDate("");
    setCapacity(50);
    setImageUrl("");
    setCoverImage(COVER_IMAGE_PRESETS[0]?.image ?? "");
  };

  return (
    <div className="space-y-6">
      {/* Publish form */}
      <section className="rounded-xl border border-portal-hairline bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-portal-gold-soft text-portal-gold-text">
            <Megaphone className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold text-portal-regal">Publish a New Event</h2>
            <p className="text-xs text-muted-foreground">
              Published events appear instantly on the Discovery grid.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Event Title">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. RoboWars 3.0"
              className={inputClass}
            />
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
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
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
                  <img src={coverImage} alt="Selected event cover preview" className="aspect-video w-full object-cover" />
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
              disabled={!canPublish}
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
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-portal-hairline bg-secondary text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                <th className="px-6 py-3">Event</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Venue</th>
                <th className="px-4 py-3">Seats</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
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
                    <StatusPill event={event} />
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      type="button"
                      disabled={event.cancelled}
                      onClick={() => onEmergencyCancel(event)}
                      className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Emergency Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
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
