import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getAnalytics } from "@/api/qr";
import { describeApiError } from "@/lib/error-toast";
import type { AnalyticsResponse } from "@/types/qr";

interface AnalyticsSectionProps {
  token: string;
  disabled?: boolean;
}

export function AnalyticsSection({ token, disabled }: AnalyticsSectionProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const result = await getAnalytics(token);
      setData(result);
    } catch (err) {
      toast(describeApiError(err, "載入分析資料失敗"));
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && !data && !disabled) {
      await load();
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleToggle}
        disabled={disabled}
      >
        {open ? "收合分析" : "查看分析"}
      </Button>
      {open && (
        <div className="space-y-3 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">掃描統計</h3>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={load}
              disabled={loading || disabled}
              aria-label="重新整理"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              重新整理
            </Button>
          </div>
          {loading && !data ? (
            <p className="text-sm text-muted-foreground">載入中…</p>
          ) : data === null ? (
            <p className="text-sm text-muted-foreground">尚無資料</p>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">總掃描次數</p>
                <p className="text-3xl font-bold">{data.total_scans}</p>
              </div>
              {data.scans_by_day.length === 0 ? (
                <p className="text-sm text-muted-foreground">尚無掃描紀錄</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left font-medium">日期</th>
                      <th className="py-2 text-right font-medium">次數</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.scans_by_day.map((row) => (
                      <tr key={row.date} className="border-b last:border-0">
                        <td className="py-2">{row.date}</td>
                        <td className="py-2 text-right">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
