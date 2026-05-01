import { describe, expect, it } from "vitest";
import { ApiError } from "@/api/errors";
import { describeApiError } from "./error-toast";

describe("describeApiError", () => {
  it("maps 422 to 網址無效 with detail", () => {
    const result = describeApiError(
      new ApiError(422, "URL is blocked"),
      "fallback",
    );
    expect(result.title).toBe("網址無效");
    expect(result.description).toBe("URL is blocked");
    expect(result.variant).toBe("destructive");
  });

  it("maps 404 to 找不到此 QR Code", () => {
    expect(describeApiError(new ApiError(404, "x"), "fallback").title).toBe(
      "找不到此 QR Code",
    );
  });

  it("maps 410 to 此 QR Code 已過期", () => {
    expect(describeApiError(new ApiError(410, "x"), "fallback").title).toBe(
      "此 QR Code 已過期",
    );
  });

  it("maps 5xx to 伺服器錯誤", () => {
    expect(describeApiError(new ApiError(503, "x"), "fallback").title).toBe(
      "伺服器錯誤，請稍後再試",
    );
  });

  it("uses fallback for other ApiError statuses", () => {
    const result = describeApiError(new ApiError(400, "Bad"), "fallback");
    expect(result.title).toBe("fallback");
    expect(result.description).toBe("Bad");
  });

  it("uses generic server error for non-ApiError", () => {
    expect(describeApiError(new Error("net"), "fallback").title).toBe(
      "伺服器錯誤，請稍後再試",
    );
  });
});
