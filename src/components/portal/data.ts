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

export const INITIAL_EVENTS: CampusEvent[] = [
  {
    id: "evt-codefusion",
    code: "CF982",
    title: "CodeFusion 2.0",
    category: "Technical",
    description:
      "Exciting student hackathon and competitive programming battle across two thrilling rounds.",
    venue: "Seminar Hall, SOC",
    dateLabel: "24 May 2025, 10:00 AM",
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
    dateLabel: "26 May 2025, 11:00 AM",
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
    dateLabel: "28 May 2025, 02:00 PM",
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
    dateLabel: "30 May 2025, 01:00 PM",
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
    title: "Sprint 3 review scheduled",
    body: "Agile jury demo on Friday, 4:00 PM at Seminar Hall, SOC.",
    time: "1d ago",
    unread: true,
    kind: "info",
  },
];

export const SPRINT_VELOCITY = [
  { sprint: "Sprint 1", points: 8 },
  { sprint: "Sprint 2", points: 8 },
  { sprint: "Sprint 3", points: 6 },
];

export const AVERAGE_VELOCITY = 7.33;

/** Total story points for the burndown (8 + 8 + 6). */
export const SPRINT_TOTAL_SP = 22;

/** Ideal (straight burn to zero) vs actual remaining SP across the 10 working days. */
export const BURNDOWN_ACTUAL = [22, 21, 18, 16, 13, 11, 9, 6, 4, 1, 0];

export interface BacklogRow {
  id: string;
  story: string;
  moscow: "Must Have" | "Should Have" | "Could Have" | "Won't Have";
  priority: "P0" | "P1" | "P2";
  status: "Done" | "In Progress" | "Planned";
}

export const MOSCOW_BACKLOG: BacklogRow[] = [
  {
    id: "US01",
    story: "As a student, I can discover events and filter by category or hall.",
    moscow: "Must Have",
    priority: "P0",
    status: "Done",
  },
  {
    id: "US02",
    story: "As a student, I can register for seat-limited events and receive a digital gate pass.",
    moscow: "Must Have",
    priority: "P0",
    status: "Done",
  },
  {
    id: "US03",
    story: "As an organizer, I can publish events and trigger an emergency cancellation broadcast.",
    moscow: "Must Have",
    priority: "P0",
    status: "Done",
  },
  {
    id: "US04",
    story: "As a student, I can join a waitlist when an event reaches full capacity.",
    moscow: "Should Have",
    priority: "P1",
    status: "In Progress",
  },
  {
    id: "US05",
    story: "As the jury, I can review sprint velocity and burndown analytics for the portal build.",
    moscow: "Could Have",
    priority: "P2",
    status: "Planned",
  },
];

export const BUILD_LOGS = [
  "$ gh run watch 8842 --portal-frontend",
  "✓ Triggering via GitHub Actions (push → main)",
  "▸ Job #1  install-bun         14s   bun install --frozen-lockfile",
  "▸ Job #2  typecheck           9s    tsgo --noEmit        ✓ 0 errors",
  "▸ Job #3  unit-tests          21s   vitest run           ✓ 14/14 passed",
  "▸ Job #4  build               38s   vite build           ✓ bundle 312 kB",
  "▸ Job #5  docker-image        31s   docker build -t portal-backend:v2.1-live",
  "▸ Job #6  deploy-edge         12s   wrangler deploy      ✓ live",
  "",
  "Quality Gate: DoD Satisfied (14/14 Unit Tests Passed)",
  "CI Pipeline: Passing — merged to main @ 8f3c1d2",
  "Container: portal-backend:v2.1-live — healthcheck 200 OK",
];
