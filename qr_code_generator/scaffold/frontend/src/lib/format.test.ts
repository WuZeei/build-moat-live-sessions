import { describe, expect, it } from "vitest";
import {
  formatExpiresAt,
  formatLocalDateTime,
  toIsoOrNull,
} from "./format";

describe("formatLocalDateTime", () => {
  it("formats valid ISO string with toLocaleString", () => {
    const iso = "2026-05-01T12:34:56Z";
    expect(formatLocalDateTime(iso)).toBe(new Date(iso).toLocaleString());
  });

  it("returns input when invalid", () => {
    expect(formatLocalDateTime("not-a-date")).toBe("not-a-date");
  });
});

describe("formatExpiresAt", () => {
  it("returns 永不過期 when null", () => {
    expect(formatExpiresAt(null)).toBe("永不過期");
  });

  it("formats valid ISO", () => {
    const iso = "2026-05-01T00:00:00Z";
    expect(formatExpiresAt(iso)).toBe(new Date(iso).toLocaleString());
  });
});

describe("toIsoOrNull", () => {
  it("returns null for empty string", () => {
    expect(toIsoOrNull("")).toBeNull();
  });

  it("returns null for invalid date", () => {
    expect(toIsoOrNull("not-a-date")).toBeNull();
  });

  it("converts datetime-local string to ISO", () => {
    const result = toIsoOrNull("2026-05-01T12:34");
    expect(result).toBe(new Date("2026-05-01T12:34").toISOString());
  });
});
