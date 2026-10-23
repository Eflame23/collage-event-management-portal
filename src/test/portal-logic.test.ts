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
      STUDENT.division
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
      registerForEvent(base, [pass], codefusion.id, STUDENT.name, STUDENT.division)
    ).toThrow(/already hold a pass/);
  });

  it("refuses registration for a full event (waitlist only)", () => {
    expect(nritya.taken).toBe(nritya.capacity);
    expect(() =>
      registerForEvent(events(), [], nritya.id, STUDENT.name, STUDENT.division)
    ).toThrow(/full/);
  });

  it("restores exactly one seat when a registration is cancelled", () => {
    const base = events();
    const { pass, events: afterRegister } = registerForEvent(
      base,
      [],
      codefusion.id,
      STUDENT.name,
      STUDENT.division
    );
    expect(afterRegister.find((e) => e.id === codefusion.id)!.taken).toBe(79);
    const { events: updated, passes } = cancelRegistration(afterRegister, [pass], codefusion.id);
    expect(updated.find((e) => e.id === codefusion.id)!.taken).toBe(78);
    expect(passes).toHaveLength(0);
  });

  it("blocks registration on an emergency-cancelled event", () => {
    const cancelled = cancelEvent(events(), codefusion.id);
    expect(() =>
      registerForEvent(cancelled, [], codefusion.id, STUDENT.name, STUDENT.division)
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
  it("ships exactly 8 distinct events with unique banners", () => {
    expect(INITIAL_EVENTS).toHaveLength(8);
    expect(new Set(INITIAL_EVENTS.map((e) => e.title)).size).toBe(8);
    expect(new Set(INITIAL_EVENTS.map((e) => e.image)).size).toBe(8);
  });

  it("balances the catalog at 2 events per category", () => {
    const counts = INITIAL_EVENTS.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ Technical: 2, Cultural: 2, Workshops: 2, Competitions: 2 });
  });

  it("preserves the seed seat counts", () => {
    const codefusion = INITIAL_EVENTS.find((e) => e.title === "CodeFusion 2.0")!;
    expect(codefusion.taken).toBe(78);
    expect(codefusion.capacity).toBe(100);
    const nritya = INITIAL_EVENTS.find((e) => e.title === "Nritya Utsav 2025")!;
    expect(nritya.taken).toBe(nritya.capacity);
  });
});
