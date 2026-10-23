import codefusionImg from "@/assets/codefusion.jpg";
import nrityaImg from "@/assets/nritya.jpg";
import quizImg from "@/assets/quiz.jpg";
import uiuxImg from "@/assets/uiux.jpg";
import heroPortrait from "@/assets/hero-portrait.jpg";

export const HERO_PORTRAIT = heroPortrait;

export type EventCategory = "Technical" | "Cultural" | "Workshops" | "Competitions";

export const CATEGORIES: EventCategory[] = [
  "Technical",
  "Cultural",
  "Workshops",
  "Competitions",
];

export const STUDENT = {
  name: "Eshan Manoj",
  division: "AIA-3",
  roll: "104",
  initials: "EM",
} as const;

export interface CampusEvent {
  id: string;
  code: string;
  title: string;
  category: EventCategory;
  description: string;
  venue: string;
  dateLabel: string;
  capacity: number;
  taken: number;
  image: string;
  statusNote?: string;
  cancelled?: boolean;
}

export interface EventDraft {
  title: string;
  category: EventCategory;
  venue: string;
  dateLabel: string;
  capacity: number;
}

export interface GatePass {
  eventId: string;
  ticketId: string;
  attendee: string;
  division: string;
  issuedAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  kind: "info" | "alert";
}

/* ------------------------------------------------------------------ */
/* Dynamic date helpers — the calendar must never hardcode a month or  */
/* year, so seed dates and parsing are built on native Date methods.   */
/* ------------------------------------------------------------------ */

const MONTH_PREFIXES = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

/** Parses "24 May 2025, 10:00 AM" (or any "DD Month YYYY" label) into a Date. */
export function parseEventDate(dateLabel: string): Date | null {
  const match = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(dateLabel);
  if (!match) return null;
  const monthIndex = MONTH_PREFIXES.indexOf(match[2]!.toLowerCase().slice(0, 3));
  if (monthIndex < 0) return null;
  return new Date(Number(match[3]), monthIndex, Number(match[1]));
}

/** Parses the "10:00 AM" half of a dateLabel into minutes since midnight. */
export function parseEventTime(dateLabel: string): number {
  const match = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(dateLabel);
  if (!match) return 0;
  let hours = Number(match[1]) % 12;
  if (match[3]!.toUpperCase() === "PM") hours += 12;
  return hours * 60 + Number(match[2]);
}

/** Formats a Date as "24 Oct 2026, 10:00 AM" without any hardcoded month names. */
export function formatEventDate(date: Date, hours = 10, minutes = 0): string {
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const hh = hours % 12 === 0 ? 12 : hours % 12;
  const mm = String(minutes).padStart(2, "0");
  const suffix = hours < 12 ? "AM" : "PM";
  return `${String(date.getDate()).padStart(2, "0")} ${month} ${date.getFullYear()}, ${hh}:${mm} ${suffix}`;
}

function seedDateLabel(daysAhead: number, hours: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hours, 0, 0, 0);
  return formatEventDate(date, hours);
}

/** Grid cells (Sunday-first) for any month/year, padded to whole weeks. */
export function monthGridCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: firstDay.getDay() }, () => null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Earliest non-cancelled event on or after today (drives the initial calendar view). */
export function earliestUpcomingEvent(events: CampusEvent[]): CampusEvent | undefined {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events
    .filter((e) => !e.cancelled)
    .map((e) => ({ event: e, date: parseEventDate(e.dateLabel) }))
    .filter(
      (entry): entry is { event: CampusEvent; date: Date } =>
        entry.date !== null && entry.date.getTime() >= today.getTime()
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0]?.event;
}

export const INITIAL_EVENTS: CampusEvent[] = [
  {
    id: "evt-codefusion",
    code: "CF982",
    title: "CodeFusion 2.0",
    category: "Technical",
    description:
      "Exciting student hackathon and competitive programming battle across two thrilling rounds.",
    venue: "Seminar Hall, SOC",
    dateLabel: seedDateLabel(3, 10),
    capacity: 100,
    taken: 78,
    image: codefusionImg,
  },
  {
    id: "evt-nritya",
    code: "NU417",
    title: "Nritya Utsav 2025",
    category: "Cultural",
    description:
      "Inter-college group and solo traditional folk dance festival celebrating classical Indian dance forms.",
    venue: "Open Air Auditorium",
    dateLabel: seedDateLabel(5, 11),
    capacity: 150,
    taken: 150,
    image: nrityaImg,
    statusNote: "Cultural / Full",
  },
  {
    id: "evt-uiux",
    code: "UX265",
    title: "UI/UX Design Workshop",
    category: "Workshops",
    description:
      "Lab 3, Computer Dept hands-on interactive UI/UX prototyping session with industry mentors.",
    venue: "Lab 3, Computer Dept",
    dateLabel: seedDateLabel(8, 14),
    capacity: 40,
    taken: 35,
    image: uiuxImg,
  },
  {
    id: "evt-quiz",
    code: "BQ738",
    title: "Battle of Minds - Quiz",
    category: "Competitions",
    description:
      "Trivia championship testing current affairs, science, and tech knowledge with buzzer rounds.",
    venue: "Ramanujan Seminar Hall",
    dateLabel: seedDateLabel(10, 13),
    capacity: 60,
    taken: 12,
    image: quizImg,
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "ntf-1",
    title: "CodeFusion 2.0 registrations are open",
    body: "78 of 100 seats already filled — book your slot early.",
    time: "2h ago",
    unread: true,
    kind: "info",
  },
  {
    id: "ntf-2",
    title: "Nritya Utsav 2025 is full",
    body: "Waitlist is now open for the folk dance festival.",
    time: "5h ago",
    unread: true,
    kind: "info",
  },
  {
    id: "ntf-3",
    title: "Campus Calendar is live",
    body: "All MIT-ADT events now appear on the dynamic month grid — open it from the navbar.",
    time: "1d ago",
    unread: true,
    kind: "info",
  },
];

export const BUILD_LOGS = [
  "$ gh run watch 8842 --portal-frontend",
  "✓ Triggering via GitHub Actions (push → main)",
  "▸ Job #1  install-bun         14s   bun install --frozen-lockfile",
  "▸ Job #2  typecheck           9s    tsgo --noEmit        ✓ 0 errors",
  "▸ Job #3  unit-tests          21s   vitest run           ✓ 18/18 passed",
  "▸ Job #4  build               38s   vite build           ✓ bundle 312 kB",
  "▸ Job #5  docker-image        31s   docker build -t portal-backend:v2.1-live",
  "▸ Job #6  deploy-edge         12s   wrangler deploy      ✓ live",
  "",
  "Quality Gate: DoD Satisfied (18/18 Unit Tests Passed)",
  "CI Pipeline: Passing — merged to main @ 8f3c1d2",
  "Container: portal-backend:v2.1-live — healthcheck 200 OK",
];
