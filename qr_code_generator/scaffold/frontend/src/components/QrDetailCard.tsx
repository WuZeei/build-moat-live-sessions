import { useState } from "react";
import { Copy } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UpdateUrlDialog } from "@/components/UpdateUrlDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { formatExpiresAt, formatLocalDateTime } from "@/lib/format";
import type { QRInfo } from "@/types/qr";

interface QrDetailCardProps {
  info: QRInfo;
  onUpdated: (info: QRInfo) => void;
}

export function QrDetailCard({ info, onUpdated }: QrDetailCardProps) {
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { toast } = useToast();

  const shortUrl =
    typeof window === "undefined"
      ? `/r/${info.token}`
      : `${window.location.origin}/r/${info.token}`;

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} 已複製` });
    } catch {
      toast({ title: "請手動複製", variant: "destructive" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          QR Code 資訊
          {info.is_deleted ? (
            <Badge variant="destructive">已刪除</Badge>
          ) : (
            <Badge variant="success">使用中</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="relative">
            <img
              src={`/api/qr/${info.token}/image`}
              alt="QR Code"
              className="h-64 w-64 rounded-md border bg-white p-4"
            />
            {info.is_deleted && (
              <div
                className="absolute inset-0 flex items-center justify-center rounded-md bg-black/60 text-2xl font-bold text-white"
                role="status"
                aria-label="此 QR Code 已刪除"
              >
                已刪除
              </div>
            )}
          </div>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Token</dt>
              <dd className="flex items-center gap-2 font-mono">
                {info.token}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => copy(info.token, "Token")}
                  aria-label="複製 token"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">短網址</dt>
              <dd className="flex items-center gap-2 break-all">
                <span className="font-mono">{shortUrl}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => copy(shortUrl, "短網址")}
                  aria-label="複製短網址"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">原始網址</dt>
              <dd className="break-all">
                <a
                  href={info.original_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  {info.original_url}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">建立時間</dt>
              <dd>{formatLocalDateTime(info.created_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">最後更新</dt>
              <dd>{formatLocalDateTime(info.updated_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">過期時間</dt>
              <dd>{formatExpiresAt(info.expires_at)}</dd>
            </div>
          </dl>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => setUpdateOpen(true)}
            disabled={info.is_deleted}
          >
            更新網址
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={info.is_deleted}
          >
            刪除
          </Button>
        </div>
        <div className="mt-6">
          <AnalyticsSection token={info.token} disabled={info.is_deleted} />
        </div>
      </CardContent>
      <UpdateUrlDialog
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        token={info.token}
        onUpdated={onUpdated}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        info={info}
        onUpdated={onUpdated}
      />
    </Card>
  );
}
