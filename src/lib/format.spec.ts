import { describe, expect, it } from "vitest";
import {
  estimatedDelivery,
  formatBRL,
  formatEta,
  formatLongDate,
  formatOrderDate,
  formatOrderRef,
  formatPostalCode,
} from "./format";

describe("formatBRL", () => {
  it("formats integer cents to Brazilian Real with comma and symbol", () => {
    // Replace non-breaking spaces (U+00A0) for reliable string comparison across environments
    const normalizeSpaces = (str: string) => str.replace(/\u00a0/g, " ");

    expect(normalizeSpaces(formatBRL(0))).toBe("R$ 0,00");
    expect(normalizeSpaces(formatBRL(1990))).toBe("R$ 19,90");
    expect(normalizeSpaces(formatBRL(150000))).toBe("R$ 1.500,00");
    expect(normalizeSpaces(formatBRL(99))).toBe("R$ 0,99");
  });
});

describe("formatOrderRef", () => {
  it("extracts and formats the first 8 hex characters with hyphen", () => {
    expect(formatOrderRef("a3f291c4-b812-4011-8fc2-a3910cbe8821")).toBe(
      "A3F2-91C4",
    );
  });

  it("handles non-hyphenated strings and uppercase conversion", () => {
    expect(formatOrderRef("01ab23cd45ef")).toBe("01AB-23CD");
  });
});

describe("formatLongDate", () => {
  it("formats a Date to day and month in Portuguese", () => {
    // Using a fixed local date
    const date = new Date(2026, 7, 28, 12, 0, 0); // Month 7 is August (0-indexed)
    const formatted = formatLongDate(date);
    expect(formatted).toMatch(/28\s+de\s+agosto/i);
  });
});

describe("estimatedDelivery", () => {
  it("returns null if paidAt or etaDays is missing", () => {
    expect(estimatedDelivery(null, 5)).toBeNull();
    expect(estimatedDelivery("2026-08-20T12:00:00Z", null)).toBeNull();
    expect(estimatedDelivery(null, null)).toBeNull();
  });

  it("adds etaDays to paidAt and formats the arrival date", () => {
    const paidAt = new Date(2026, 7, 20, 12, 0, 0).toISOString();
    const result = estimatedDelivery(paidAt, 5);
    expect(result).not.toBeNull();
    expect(result).toMatch(/25\s+de\s+agosto/i);
  });
});

describe("formatPostalCode", () => {
  it("strips non-digits and formats 8 digits into 00000-000", () => {
    expect(formatPostalCode("01310200")).toBe("01310-200");
    expect(formatPostalCode("01310-200")).toBe("01310-200");
    expect(formatPostalCode("CEP: 01.310-200 ")).toBe("01310-200");
  });

  it("handles partial input without adding hyphen until > 5 digits", () => {
    expect(formatPostalCode("013")).toBe("013");
    expect(formatPostalCode("01310")).toBe("01310");
    expect(formatPostalCode("013102")).toBe("01310-2");
  });

  it("limits to 8 digits", () => {
    expect(formatPostalCode("01310200999")).toBe("01310-200");
  });

  it("returns empty string when no digits provided", () => {
    expect(formatPostalCode("abc-def")).toBe("");
  });
});

describe("formatEta", () => {
  it("returns null when days is null", () => {
    expect(formatEta(null)).toBeNull();
  });

  it("formats 1 day as singular '1 dia útil'", () => {
    expect(formatEta(1)).toBe("1 dia útil");
  });

  it("formats multiple days as plural 'X dias úteis'", () => {
    expect(formatEta(5)).toBe("5 dias úteis");
    expect(formatEta(10)).toBe("10 dias úteis");
  });
});

describe("formatOrderDate", () => {
  it("formats ISO date with day, month and year in Portuguese", () => {
    const iso = new Date(2026, 7, 28, 12, 0, 0).toISOString();
    const formatted = formatOrderDate(iso);
    expect(formatted).toMatch(/28/);
    expect(formatted).toMatch(/agosto/i);
    expect(formatted).toMatch(/2026/);
  });
});
