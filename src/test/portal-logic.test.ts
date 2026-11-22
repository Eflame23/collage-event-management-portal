import { describe, expect, it } from "vitest";
import {
  cancelEvent,
  cancelRegistration,
  makeTicketId,
  publishEvent,
  registerForEvent,
  seatPercent,
} from "@/components/portal/portal-logic";
import { INITIAL_EVENTS, STUDENT } from "@/components/portal/data";

const events = () => INITIAL_EVENTS.map((e) => ({ ...e }));
const codefusion = events()[0]!;
const nritya = events()[1]!;

describe("portal registration rules", () => {
  it("fills one seat and issues a ticket when registering", () => {
    expect(codefusion.taken).toBe(78);
    const { events: updated, pass } = registerForEvent(
      events(),
      [],
      codefusion.id,
      STUDENT.name,
      STUDENT.division,
    );
    const after = updated.find((e) => e.id === codefusion.id)!;
    expect(after.taken).toBe(79);
    expect(seatPercent(after)).toBe(79);
    expect(pass.ticketId).toBe("MIT-ADT-2025-CF982");
    expect(pass.attendee).toBe("Eshan Manoj");
  });

  it("blocks double registration with a warning", () => {
    const base = events();
    const { pass } = registerForEvent(base, [], codefusion.id, STUDENT.name, STUDENT.division);
    expect(() =>
      registerForEvent(base, [pass], codefusion.id, STUDENT.name, STUDENT.division),
    ).toThrow(/already hold a pass/);
  });

  it("refuses registration for a full event (waitlist only)", () => {
    expect(nritya.taken).toBe(nritya.capacity);
    expect(() => registerForEvent(events(), [], nritya.id, STUDENT.name, STUDENT.division)).toThrow(
      /full/,
    );
  });

  it("restores exactly one seat when a registration is cancelled", () => {
    const base = events();
    const { pass, events: afterRegister } = registerForEvent(
      base,
      [],
      codefusion.id,
      STUDENT.name,
      STUDENT.division,
    );
    expect(afterRegister.find((e) => e.id === codefusion.id)!.taken).toBe(79);
    const { events: updated, passes } = cancelRegistration(afterRegister, [pass], codefusion.id);
    expect(updated.find((e) => e.id === codefusion.id)!.taken).toBe(78);
    expect(passes).toHaveLength(0);
  });

  it("blocks registration on an emergency-cancelled event", () => {
    const cancelled = cancelEvent(events(), codefusion.id);
    expect(() =>
      registerForEvent(cancelled, [], codefusion.id, STUDENT.name, STUDENT.division),
    ).toThrow(/cancelled/);
  });

  it("prepends published events and derives a ticket code from the title", () => {
    const published = publishEvent(events(), {
      title: "RoboWars 3.0",
      category: "Technical",
      venue: "Innovation Lab",
      dateLabel: "02 Jun 2025, 10:00 AM",
      capacity: 80,
    });
    expect(published[0]!.title).toBe("RoboWars 3.0");
    expect(published[0]!.taken).toBe(0);
    expect(makeTicketId(published[0]!)).toMatch(/^MIT-ADT-2025-/);
  });
});

describe("event catalog", () => {
  it("ships twelve distinct events with unique banners", () => {
    expect(INITIAL_EVENTS).toHaveLength(12);
    expect(new Set(INITIAL_EVENTS.map((e) => e.title)).size).toBe(12);
    expect(new Set(INITIAL_EVENTS.map((e) => e.image)).size).toBe(12);
  });

  it("includes the exact requested dates, venues, categories, and seat counts", () => {
    expect(
      INITIAL_EVENTS.map(({ title, category, venue, dateLabel, taken, capacity }) => [
        title,
        category,
        dateLabel,
        venue,
        taken,
        capacity,
      ]),
    ).toEqual([
      ["CodeFusion 2.0", "Technical", "25 Nov 2026, 10:00 AM", "Seminar Hall, SOC", 78, 100],
      ["Nritya Utsav 2026", "Cultural", "28 Nov 2026, 11:00 AM", "Open Air Auditorium", 150, 150],
      [
        "UI/UX Design Workshop",
        "Workshops",
        "02 Dec 2026, 2:00 PM",
        "Lab 3, Computer Dept",
        35,
        40,
      ],
      [
        "Battle of Minds - Quiz",
        "Competitions",
        "05 Dec 2026, 1:00 PM",
        "Ramanujan Seminar Hall",
        12,
        60,
      ],
      ["RobotWars Arena", "Technical", "08 Dec 2026, 9:00 AM", "Innovation Lab", 18, 50],
      ["Acoustic Unplugged", "Cultural", "10 Dec 2026, 6:00 PM", "Amphitheatre", 45, 120],
      ["E-Summit: Pitch Tank", "Competitions", "12 Dec 2026, 4:00 PM", "Main Auditorium", 20, 80],
      ["Cloud & DevOps Bootcamp", "Workshops", "15 Dec 2026, 9:00 AM", "Lab 5, IT Block", 28, 40],
      ["CyberSec CTF Challenge", "Technical", "17 Dec 2026, 11:00 AM", "Cyber Lab, SOC", 42, 60],
      [
        "Persona Photography Walk",
        "Cultural",
        "19 Dec 2026, 7:30 AM",
        "Rajbaugh Campus Dome",
        25,
        30,
      ],
      ["GenAI & LLM Hackathon", "Technical", "22 Dec 2026, 10:00 AM", "Innovation Center", 85, 100],
      ["Design Thinking Sprint", "Workshops", "26 Dec 2026, 2:00 PM", "Design Studio B", 19, 35],
    ]);
  });

  it("includes the specified cover images for the four added events", () => {
    expect(INITIAL_EVENTS.find((e) => e.title === "CyberSec CTF Challenge")?.image).toContain(
      "photo-1550751827-4bd374c3f58b",
    );
    expect(INITIAL_EVENTS.find((e) => e.title === "Persona Photography Walk")?.image).toContain(
      "photo-1516035069371-29a1b244cc32",
    );
    expect(INITIAL_EVENTS.find((e) => e.title === "GenAI & LLM Hackathon")?.image).toContain(
      "photo-1677442136019-21780ecad995",
    );
    expect(INITIAL_EVENTS.find((e) => e.title === "Design Thinking Sprint")?.image).toContain(
      "photo-1531403009284-440f080d1e12",
    );
  });

  it("preserves the per-category counts and key seat totals", () => {
    const counts = INITIAL_EVENTS.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ Technical: 4, Cultural: 3, Workshops: 3, Competitions: 2 });
    const codefusion = INITIAL_EVENTS.find((e) => e.title === "CodeFusion 2.0")!;
    expect(codefusion.taken).toBe(78);
    expect(codefusion.capacity).toBe(100);
    const nritya = INITIAL_EVENTS.find((e) => e.title === "Nritya Utsav 2026")!;
    expect(nritya.taken).toBe(nritya.capacity);
  });
});
