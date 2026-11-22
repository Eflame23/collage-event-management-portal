import karadAsset from "@/assets/karad-portrait.jpg.asset.json";

export const KARAD_PORTRAIT = karadAsset.url;

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
  image: string;
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

export const COVER_IMAGE_PRESETS = [
  {
    label: "Tech Lab",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Auditorium Stage",
    image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Workshop Studio",
    image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Sports / Arena",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80",
  },
] as const;

/* ------------------------------------------------------------------ */
/* Dynamic date helpers — the calendar must never hardcode a month or  */
/* year, so seed dates and parsing are built on native Date methods.   */
/* ------------------------------------------------------------------ */

const MONTH_PREFIXES: string[] = [
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
];

/** Parses "24 May 2025, 10:00 AM" (or any "DD Month YYYY" label) into a Date. */
export function parseEventDate(dateLabel: string): Date | null {
  const normalized = dateLabel.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (isoMatch) {
    const [, yearText, monthText, dayText] = isoMatch;
    if (!yearText || !monthText || !dayText) return null;
    return validatedLocalDate(Number(yearText), Number(monthText) - 1, Number(dayText));
  }

  const match = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(normalized);
  if (!match) return null;
  const [, dayText, monthText, yearText] = match;
  if (!dayText || !monthText || !yearText) return null;
  const monthIndex = MONTH_PREFIXES.indexOf(monthText.toLowerCase().slice(0, 3));
  if (monthIndex < 0) return null;
  return validatedLocalDate(Number(yearText), monthIndex, Number(dayText));
}

function validatedLocalDate(year: number, month: number, day: number): Date | null {
  const parsed = new Date(year, month, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
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
    dateLabel: "25 Nov 2026, 10:00 AM",
    capacity: 100,
    taken: 78,
    image:
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "evt-nritya",
    code: "NU417",
    title: "Nritya Utsav 2026",
    category: "Cultural",
    description:
      "Inter-college group and solo traditional folk dance festival celebrating classical Indian dance forms.",
    venue: "Open Air Auditorium",
    dateLabel: "28 Nov 2026, 11:00 AM",
    capacity: 150,
    taken: 150,
    image:
      "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80",
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
    dateLabel: "02 Dec 2026, 2:00 PM",
    capacity: 40,
    taken: 35,
    image:
      "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "evt-quiz",
    code: "BQ738",
    title: "Battle of Minds - Quiz",
    category: "Competitions",
    description:
      "Trivia championship testing current affairs, science, and tech knowledge with buzzer rounds.",
    venue: "Ramanujan Seminar Hall",
    dateLabel: "05 Dec 2026, 1:00 PM",
    capacity: 60,
    taken: 12,
    image:
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "evt-robotwars",
    code: "RW511",
    title: "RobotWars Arena",
    category: "Technical",
    description:
      "Team-vs-team combat robotics showdown — design, build and pilot bots in the Innovation Lab arena.",
    venue: "Innovation Lab",
    dateLabel: "08 Dec 2026, 9:00 AM",
    capacity: 50,
    taken: 18,
    image:
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "evt-acoustic",
    code: "AU902",
    title: "Acoustic Unplugged",
    category: "Cultural",
    description:
      "An intimate evening of acoustic sets, indie bands and open-mic performances under the open sky.",
    venue: "Amphitheatre",
    dateLabel: "10 Dec 2026, 6:00 PM",
    capacity: 120,
    taken: 45,
    image:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "evt-esummit",
    code: "ES776",
    title: "E-Summit: Pitch Tank",
    category: "Competitions",
    description:
      "Startup pitch competition where student founders face investor judges for funding and incubation offers.",
    venue: "Main Auditorium",
    dateLabel: "12 Dec 2026, 4:00 PM",
    capacity: 80,
    taken: 20,
    image:
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "evt-cloud",
    code: "CD645",
    title: "Cloud & DevOps Bootcamp",
    category: "Workshops",
    description:
      "Two-day hands-on bootcamp covering cloud infrastructure, CI/CD pipelines and container orchestration.",
    venue: "Lab 5, IT Block",
    dateLabel: "15 Dec 2026, 9:00 AM",
    capacity: 40,
    taken: 28,
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "evt-cybersec",
    code: "CSC811",
    title: "CyberSec CTF Challenge",
    category: "Technical",
    description:
      "A hands-on capture-the-flag challenge featuring practical security puzzles and team-based problem solving.",
    venue: "Cyber Lab, SOC",
    dateLabel: "17 Dec 2026, 11:00 AM",
    capacity: 60,
    taken: 42,
    image:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "evt-persona-photo-walk",
    code: "PP401",
    title: "Persona Photography Walk",
    category: "Cultural",
    description:
      "A sunrise photo walk through campus architecture, guided by student photographers.",
    venue: "Rajbaugh Campus Dome",
    dateLabel: "19 Dec 2026, 7:30 AM",
    capacity: 30,
    taken: 25,
    image:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "evt-genai-hackathon",
    code: "GAI264",
    title: "GenAI & LLM Hackathon",
    category: "Technical",
    description:
      "Build and demo practical generative AI experiences with student teams and mentor support.",
    venue: "Innovation Center",
    dateLabel: "22 Dec 2026, 10:00 AM",
    capacity: 100,
    taken: 85,
    image:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "evt-design-thinking-sprint",
    code: "DTS937",
    title: "Design Thinking Sprint",
    category: "Workshops",
    description:
      "A collaborative sprint to frame campus challenges, sketch ideas and prototype solutions.",
    venue: "Design Studio B",
    dateLabel: "26 Dec 2026, 2:00 PM",
    capacity: 35,
    taken: 19,
    image:
      "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80",
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
    title: "Nritya Utsav 2026 is full",
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

