import { describe, expect, it } from "vitest";
import {
  INITIAL_EVENTS,
  earliestUpcomingEvent,
  formatEventDate,
  isSameDay,
  monthGridCells,
  parseEventDate,
  parseEventTime,
} from "@/components/portal/data";

describe("dynamic campus calendar rules", () => {
  it("parses each event's date straight from its dateLabel", () => {
    const parsed = parseEventDate("24 May 2025, 10:00 AM");
    expect(parsed).not.toBeNull();
    expect(parsed!.getFullYear()).toBe(2025);
    expect(parsed!.getMonth()).toBe(4); // May, zero-indexed
    expect(parsed!.getDate()).toBe(24);
  });

  it("recalculates grid cells for any month, including leap February", () => {
    const feb2024 = monthGridCells(2024, 1);
    expect(feb2024.filter((cell) => cell !== null)).toHaveLength(29);
    expect(feb2024.length % 7).toBe(0);

    const feb2025 = monthGridCells(2025, 1); // Feb 1, 2025 is a Saturday
    expect(feb2025.filter((cell) => cell !== null)).toHaveLength(28);
    expect(feb2025[5]).toBeNull();
    expect(feb2025[6]).toBe(1);
  });

  it("initializes to the earliest upcoming event and never a hardcoded month", () => {
    const upcoming = earliestUpcomingEvent(INITIAL_EVENTS);
    expect(upcoming).toBeDefined();
    const date = parseEventDate(upcoming!.dateLabel)!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(date.getTime()).toBeGreaterThanOrEqual(today.getTime());
  });

  it("ignores cancelled events when finding the initial month", () => {
    const allCancelled = INITIAL_EVENTS.map((e) => ({ ...e, cancelled: true }));
    expect(earliestUpcomingEvent(allCancelled)).toBeUndefined();
  });

  it("round-trips a formatted label onto its exact matching day cell", () => {
    const label = formatEventDate(new Date(2026, 9, 24), 10);
    expect(label).toContain("Oct 2026");
    const parsed = parseEventDate(label)!;
    expect(isSameDay(parsed, new Date(2026, 9, 24))).toBe(true);
  });

  it("sorts chips within a day by their AM/PM time", () => {
    expect(parseEventTime("24 May 2025, 10:00 AM")).toBe(600);
    expect(parseEventTime("24 May 2025, 02:00 PM")).toBe(840);
    expect(parseEventTime("24 May 2025, 12:00 AM")).toBe(0);
  });
});
