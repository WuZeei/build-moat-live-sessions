import { ApiError } from "@/api/errors";

export interface ToastMessage {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function describeApiError(err: unknown, fallback: string): ToastMessage {
  if (err instanceof ApiError) {
    switch (err.status) {
      case 422:
        return {
          title: "網址無效",
          description: err.message,
          variant: "destructive",
        };
      case 404:
        return { title: "找不到此 QR Code", variant: "destructive" };
      case 410:
        return { title: "此 QR Code 已過期", variant: "destructive" };
      default:
        if (err.status >= 500) {
          return { title: "伺服器錯誤，請稍後再試", variant: "destructive" };
        }
        return {
          title: fallback,
          description: err.message,
          variant: "destructive",
        };
    }
  }
  return { title: "伺服器錯誤，請稍後再試", variant: "destructive" };
}
