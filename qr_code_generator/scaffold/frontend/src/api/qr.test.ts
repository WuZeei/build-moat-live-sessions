import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { ApiError } from "./errors";
import {
  createQr,
  deleteQr,
  getAnalytics,
  getQrInfo,
  updateQr,
} from "./qr";

const TOKEN = "abc1234";

const QR_INFO = {
  token: TOKEN,
  original_url: "https://example.com",
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
  expires_at: null,
  is_deleted: false,
};

describe("createQr", () => {
  it("posts and returns CreateResponse", async () => {
    server.use(
      http.post("/api/qr/create", async ({ request }) => {
        const body = (await request.json()) as { url: string };
        return HttpResponse.json({
          token: TOKEN,
          short_url: `http://localhost:8000/r/${TOKEN}`,
          qr_code_url: `http://localhost:8000/api/qr/${TOKEN}/image`,
          original_url: body.url,
        });
      }),
    );
    const result = await createQr({ url: "https://example.com" });
    expect(result.token).toBe(TOKEN);
    expect(result.original_url).toBe("https://example.com");
  });

  it("throws ApiError 422 with detail", async () => {
    server.use(
      http.post("/api/qr/create", () =>
        HttpResponse.json({ detail: "URL is blocked" }, { status: 422 }),
      ),
    );
    await expect(
      createQr({ url: "https://evil.com" }),
    ).rejects.toMatchObject({ status: 422, message: "URL is blocked" });
  });

  it("falls back to statusText when detail missing", async () => {
    server.use(
      http.post("/api/qr/create", () =>
        new HttpResponse(null, { status: 500, statusText: "Server Error" }),
      ),
    );
    try {
      await createQr({ url: "https://example.com" });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(500);
    }
  });
});

describe("getQrInfo", () => {
  it("returns QRInfo on 200", async () => {
    server.use(
      http.get(`/api/qr/${TOKEN}`, () => HttpResponse.json(QR_INFO)),
    );
    const info = await getQrInfo(TOKEN);
    expect(info).toEqual(QR_INFO);
  });

  it("throws ApiError 404", async () => {
    server.use(
      http.get(`/api/qr/${TOKEN}`, () =>
        HttpResponse.json({ detail: "Not Found" }, { status: 404 }),
      ),
    );
    await expect(getQrInfo(TOKEN)).rejects.toMatchObject({ status: 404 });
  });
});

describe("updateQr", () => {
  it("patches and returns updated QRInfo", async () => {
    server.use(
      http.patch(`/api/qr/${TOKEN}`, async ({ request }) => {
        const body = (await request.json()) as { url?: string };
        return HttpResponse.json({ ...QR_INFO, original_url: body.url ?? "" });
      }),
    );
    const result = await updateQr(TOKEN, { url: "https://other.com" });
    expect(result.original_url).toBe("https://other.com");
  });
});

describe("deleteQr", () => {
  it("returns detail object on success", async () => {
    server.use(
      http.delete(`/api/qr/${TOKEN}`, () =>
        HttpResponse.json({ detail: "Deleted" }),
      ),
    );
    const result = await deleteQr(TOKEN);
    expect(result.detail).toBe("Deleted");
  });
});

describe("getAnalytics", () => {
  it("returns analytics payload", async () => {
    server.use(
      http.get(`/api/qr/${TOKEN}/analytics`, () =>
        HttpResponse.json({
          token: TOKEN,
          total_scans: 3,
          scans_by_day: [{ date: "2026-05-01", count: 3 }],
        }),
      ),
    );
    const result = await getAnalytics(TOKEN);
    expect(result.total_scans).toBe(3);
    expect(result.scans_by_day).toHaveLength(1);
  });
});
