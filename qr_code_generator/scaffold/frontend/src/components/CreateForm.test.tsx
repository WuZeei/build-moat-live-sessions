import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { renderWithToaster, screen, waitFor } from "@/test/utils";
import { server } from "@/test/server";
import { CreateForm } from "./CreateForm";

const TOKEN = "abc1234";

const QR_INFO = {
  token: TOKEN,
  original_url: "https://example.com",
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
  expires_at: null,
  is_deleted: false,
};

function setupHappyPath() {
  server.use(
    http.post("/api/qr/create", () =>
      HttpResponse.json({
        token: TOKEN,
        short_url: `http://localhost:8000/r/${TOKEN}`,
        qr_code_url: `http://localhost:8000/api/qr/${TOKEN}/image`,
        original_url: "https://example.com",
      }),
    ),
    http.get(`/api/qr/${TOKEN}`, () => HttpResponse.json(QR_INFO)),
  );
}

describe("CreateForm", () => {
  it("submits and calls onCreated with QRInfo", async () => {
    setupHappyPath();
    const onCreated = vi.fn();
    renderWithToaster(<CreateForm onCreated={onCreated} />);

    await userEvent.type(
      screen.getByLabelText("網址"),
      "https://example.com",
    );
    await userEvent.click(screen.getByRole("button", { name: /建立/ }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(QR_INFO));
  });

  it("shows toast on 422", async () => {
    server.use(
      http.post("/api/qr/create", () =>
        HttpResponse.json({ detail: "URL is blocked" }, { status: 422 }),
      ),
    );
    const onCreated = vi.fn();
    renderWithToaster(<CreateForm onCreated={onCreated} />);

    await userEvent.type(
      screen.getByLabelText("網址"),
      "https://evil.com",
    );
    await userEvent.click(screen.getByRole("button", { name: /建立/ }));

    expect(await screen.findByText("網址無效")).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("shows generic toast on 5xx", async () => {
    server.use(
      http.post("/api/qr/create", () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderWithToaster(<CreateForm onCreated={vi.fn()} />);

    await userEvent.type(
      screen.getByLabelText("網址"),
      "https://example.com",
    );
    await userEvent.click(screen.getByRole("button", { name: /建立/ }));

    expect(
      await screen.findByText("伺服器錯誤，請稍後再試"),
    ).toBeInTheDocument();
  });

  it("rejects empty url with toast", async () => {
    renderWithToaster(<CreateForm onCreated={vi.fn()} />);
    const button = screen.getByRole("button", { name: /建立/ });
    // bypass HTML5 required to test runtime guard
    button.removeAttribute("disabled");
    const form = button.closest("form")!;
    form.noValidate = true;
    await userEvent.click(button);
    expect(await screen.findByText("請輸入網址")).toBeInTheDocument();
  });
});
