import { ApiError } from "./errors";
import type {
  AnalyticsResponse,
  CreateRequest,
  CreateResponse,
  QRInfo,
  UpdateRequest,
} from "@/types/qr";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { detail?: string });
    const detail = (body as { detail?: string }).detail ?? res.statusText;
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

export const createQr = (req: CreateRequest) =>
  request<CreateResponse>("/api/qr/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

export const getQrInfo = (token: string) =>
  request<QRInfo>(`/api/qr/${token}`);

export const updateQr = (token: string, req: UpdateRequest) =>
  request<QRInfo>(`/api/qr/${token}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

export const deleteQr = (token: string) =>
  request<{ detail: string }>(`/api/qr/${token}`, { method: "DELETE" });

export const getAnalytics = (token: string) =>
  request<AnalyticsResponse>(`/api/qr/${token}/analytics`);
