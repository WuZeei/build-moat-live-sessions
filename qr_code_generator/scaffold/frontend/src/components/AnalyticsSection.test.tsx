import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { renderWithToaster, screen } from "@/test/utils";
import { server } from "@/test/server";
import { AnalyticsSection } from "./AnalyticsSection";

const TOKEN = "abc1234";

describe("AnalyticsSection", () => {
  it("starts collapsed and loads analytics on expand", async () => {
    server.use(
      http.get(`/api/qr/${TOKEN}/analytics`, () =>
        HttpResponse.json({
          token: TOKEN,
          total_scans: 5,
          scans_by_day: [
            { date: "2026-05-01", count: 3 },
            { date: "2026-05-02", count: 2 },
          ],
        }),
      ),
    );
    renderWithToaster(<AnalyticsSection token={TOKEN} />);

    expect(screen.queryByText("掃描統計")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /查看分析/ }));

    expect(await screen.findByText("掃描統計")).toBeInTheDocument();
    expect(await screen.findByText("5")).toBeInTheDocument();
    expect(screen.getByText("2026-05-01")).toBeInTheDocument();
  });

  it("shows empty state when no scans", async () => {
    server.use(
      http.get(`/api/qr/${TOKEN}/analytics`, () =>
        HttpResponse.json({ token: TOKEN, total_scans: 0, scans_by_day: [] }),
      ),
    );
    renderWithToaster(<AnalyticsSection token={TOKEN} />);
    await userEvent.click(screen.getByRole("button", { name: /查看分析/ }));
    expect(await screen.findByText("尚無掃描紀錄")).toBeInTheDocument();
  });

  it("does not auto-load when disabled", async () => {
    renderWithToaster(<AnalyticsSection token={TOKEN} disabled />);
    expect(screen.getByRole("button", { name: /查看分析/ })).toBeDisabled();
  });

  it("shows toast on error", async () => {
    server.use(
      http.get(`/api/qr/${TOKEN}/analytics`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderWithToaster(<AnalyticsSection token={TOKEN} />);
    await userEvent.click(screen.getByRole("button", { name: /查看分析/ }));
    expect(
      await screen.findByText("伺服器錯誤，請稍後再試"),
    ).toBeInTheDocument();
  });
});
