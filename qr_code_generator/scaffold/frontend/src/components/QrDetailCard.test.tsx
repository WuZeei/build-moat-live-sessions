import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithToaster, screen } from "@/test/utils";
import { QrDetailCard } from "./QrDetailCard";
import type { QRInfo } from "@/types/qr";

const ACTIVE: QRInfo = {
  token: "abc1234",
  original_url: "https://example.com",
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
  expires_at: null,
  is_deleted: false,
};

const DELETED: QRInfo = { ...ACTIVE, is_deleted: true };

describe("QrDetailCard", () => {
  it("renders core fields", () => {
    renderWithToaster(<QrDetailCard info={ACTIVE} onUpdated={vi.fn()} />);
    expect(screen.getByText("abc1234")).toBeInTheDocument();
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
    expect(screen.getByText("永不過期")).toBeInTheDocument();
    expect(screen.getByText("使用中")).toBeInTheDocument();
    expect(screen.getByAltText("QR Code")).toHaveAttribute(
      "src",
      "/api/qr/abc1234/image",
    );
  });

  it("disables actions and shows overlay when deleted", () => {
    renderWithToaster(<QrDetailCard info={DELETED} onUpdated={vi.fn()} />);
    expect(screen.getByText("已刪除", { selector: "div[role=status]" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "更新網址" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "刪除" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /查看分析/ })).toBeDisabled();
  });

  it("copies short url via clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderWithToaster(<QrDetailCard info={ACTIVE} onUpdated={vi.fn()} />);

    await userEvent.click(screen.getByLabelText("複製短網址"));
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/r/abc1234`,
    );
    expect(await screen.findByText("短網址 已複製")).toBeInTheDocument();
  });

  it("falls back to toast when clipboard fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    renderWithToaster(<QrDetailCard info={ACTIVE} onUpdated={vi.fn()} />);

    await userEvent.click(screen.getByLabelText("複製 token"));
    expect(await screen.findByText("請手動複製")).toBeInTheDocument();
  });
});
