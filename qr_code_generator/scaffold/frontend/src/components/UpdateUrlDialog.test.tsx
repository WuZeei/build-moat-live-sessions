import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { renderWithToaster, screen, waitFor } from "@/test/utils";
import { server } from "@/test/server";
import { UpdateUrlDialog } from "./UpdateUrlDialog";

const TOKEN = "abc1234";
const UPDATED = {
  token: TOKEN,
  original_url: "https://other.com",
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T01:00:00Z",
  expires_at: null,
  is_deleted: false,
};

describe("UpdateUrlDialog", () => {
  it("rejects when both fields empty", async () => {
    renderWithToaster(
      <UpdateUrlDialog
        open
        onOpenChange={vi.fn()}
        token={TOKEN}
        onUpdated={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /儲存/ }));
    expect(
      await screen.findByText("請至少填寫一個欄位"),
    ).toBeInTheDocument();
  });

  it("submits url and calls onUpdated", async () => {
    server.use(
      http.patch(`/api/qr/${TOKEN}`, () => HttpResponse.json(UPDATED)),
    );
    const onUpdated = vi.fn();
    const onOpenChange = vi.fn();
    renderWithToaster(
      <UpdateUrlDialog
        open
        onOpenChange={onOpenChange}
        token={TOKEN}
        onUpdated={onUpdated}
      />,
    );

    await userEvent.type(
      screen.getByLabelText("新網址（選填）"),
      "https://other.com",
    );
    await userEvent.click(screen.getByRole("button", { name: /儲存/ }));

    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(UPDATED));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("shows 422 error", async () => {
    server.use(
      http.patch(`/api/qr/${TOKEN}`, () =>
        HttpResponse.json({ detail: "Invalid" }, { status: 422 }),
      ),
    );
    renderWithToaster(
      <UpdateUrlDialog
        open
        onOpenChange={vi.fn()}
        token={TOKEN}
        onUpdated={vi.fn()}
      />,
    );

    await userEvent.type(
      screen.getByLabelText("新網址（選填）"),
      "https://invalid.com",
    );
    await userEvent.click(screen.getByRole("button", { name: /儲存/ }));

    expect(await screen.findByText("網址無效")).toBeInTheDocument();
  });
});
