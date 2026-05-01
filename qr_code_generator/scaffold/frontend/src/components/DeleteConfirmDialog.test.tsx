import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { renderWithToaster, screen, waitFor } from "@/test/utils";
import { server } from "@/test/server";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import type { QRInfo } from "@/types/qr";

const INFO: QRInfo = {
  token: "abc1234",
  original_url: "https://example.com",
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
  expires_at: null,
  is_deleted: false,
};

describe("DeleteConfirmDialog", () => {
  it("calls deleteQr and updates info locally", async () => {
    server.use(
      http.delete(`/api/qr/${INFO.token}`, () =>
        HttpResponse.json({ detail: "Deleted" }),
      ),
    );
    const onUpdated = vi.fn();
    const onOpenChange = vi.fn();
    renderWithToaster(
      <DeleteConfirmDialog
        open
        onOpenChange={onOpenChange}
        info={INFO}
        onUpdated={onUpdated}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /確認刪除/ }));

    await waitFor(() => {
      const arg = onUpdated.mock.calls[0][0];
      expect(arg.is_deleted).toBe(true);
      expect(arg.token).toBe(INFO.token);
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("toasts on failure", async () => {
    server.use(
      http.delete(`/api/qr/${INFO.token}`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderWithToaster(
      <DeleteConfirmDialog
        open
        onOpenChange={vi.fn()}
        info={INFO}
        onUpdated={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /確認刪除/ }));
    expect(
      await screen.findByText("伺服器錯誤，請稍後再試"),
    ).toBeInTheDocument();
  });
});
