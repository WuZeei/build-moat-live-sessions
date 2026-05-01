import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders header and create form by default", () => {
    render(<App />);
    expect(screen.getByText("QR Code Generator")).toBeInTheDocument();
    expect(screen.getByText("建立 QR Code")).toBeInTheDocument();
    expect(screen.queryByText("QR Code 資訊")).not.toBeInTheDocument();
  });
});
