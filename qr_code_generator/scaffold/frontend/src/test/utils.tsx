import { ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { Toaster } from "@/components/ui/toaster";

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

export function renderWithToaster(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { wrapper: Wrapper, ...options });
}

export * from "@testing-library/react";
