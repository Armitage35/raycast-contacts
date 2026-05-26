import { describe, it, expect } from "vitest";
import { groupByLetter, formatBirthday } from "../helpers";
import { UnifiedContact } from "../types";

function makeContact(displayName: string, id = displayName): UnifiedContact {
  return { id, displayName, emails: [], phones: [] };
}

describe("groupByLetter", () => {
  it("groups contacts by their first letter", () => {
    const contacts = [makeContact("Alice"), makeContact("Bob"), makeContact("Anna")];
    const groups = groupByLetter(contacts);
    const letters = groups.map(([l]) => l);
    expect(letters).toContain("A");
    expect(letters).toContain("B");
    const aGroup = groups.find(([l]) => l === "A")![1];
    expect(aGroup.map((c) => c.displayName)).toEqual(["Alice", "Anna"]);
  });

  it("puts non-alpha first characters into '#'", () => {
    const contacts = [makeContact("123 Corp"), makeContact("Alice")];
    const groups = groupByLetter(contacts);
    const hash = groups.find(([l]) => l === "#");
    expect(hash).toBeDefined();
    expect(hash![1][0].displayName).toBe("123 Corp");
  });

  it("sorts '#' to the end", () => {
    const contacts = [makeContact("42nd Street"), makeContact("Zara"), makeContact("Apple")];
    const groups = groupByLetter(contacts);
    const last = groups[groups.length - 1];
    expect(last[0]).toBe("#");
  });

  it("sorts letter sections alphabetically", () => {
    const contacts = [makeContact("Zara"), makeContact("Alice"), makeContact("Mike")];
    const groups = groupByLetter(contacts);
    const letters = groups.map(([l]) => l);
    expect(letters).toEqual(["A", "M", "Z"]);
  });

  it("returns empty array for empty input", () => {
    expect(groupByLetter([])).toEqual([]);
  });
});

describe("formatBirthday", () => {
  it("formats a full date string with year", () => {
    expect(formatBirthday("2000-6-15")).toBe("06-15-2000");
  });

  it("pads single-digit month and day", () => {
    expect(formatBirthday("1985-1-3")).toBe("01-03-1985");
  });

  it("omits year when year is 1 (Apple Contacts no-year sentinel)", () => {
    expect(formatBirthday("1-6-15")).toBe("06-15");
  });

  it("omits year when year is 0", () => {
    expect(formatBirthday("0-3-20")).toBe("03-20");
  });

  it("handles two-part birthday (month-day only)", () => {
    expect(formatBirthday("6-15")).toBe("06-15");
  });

  it("returns undefined for undefined input", () => {
    expect(formatBirthday(undefined)).toBeUndefined();
  });

  it("returns the original string if format is unrecognised", () => {
    expect(formatBirthday("not-a-date")).toBe("not-a-date");
  });
});
