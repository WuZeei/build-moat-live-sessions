import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateQr } from "@/api/qr";
import { describeApiError } from "@/lib/error-toast";
import { toIsoOrNull } from "@/lib/format";
import type { QRInfo, UpdateRequest } from "@/types/qr";

interface UpdateUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  onUpdated: (info: QRInfo) => void;
}

export function UpdateUrlDialog({
  open,
  onOpenChange,
  token,
  onUpdated,
}: UpdateUrlDialogProps) {
  const [url, setUrl] = useState("");
  const [expiresAtLocal, setExpiresAtLocal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  function reset() {
    setUrl("");
    setExpiresAtLocal("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const hasUrl = url.trim().length > 0;
    const hasExpires = expiresAtLocal.length > 0;
    if (!hasUrl && !hasExpires) {
      toast({ title: "請至少填寫一個欄位", variant: "destructive" });
      return;
    }
    const payload: UpdateRequest = {};
    if (hasUrl) payload.url = url.trim();
    if (hasExpires) payload.expires_at = toIsoOrNull(expiresAtLocal);

    setSubmitting(true);
    try {
      const updated = await updateQr(token, payload);
      onUpdated(updated);
      toast({ title: "已更新" });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast(describeApiError(err, "更新失敗，請稍後再試"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>更新 QR Code</DialogTitle>
          <DialogDescription>
            修改目的地網址或過期時間。至少填寫一項才能提交。已設定的過期時間無法清除，僅能改為新時間。
          </DialogDescription>
        </DialogHeader>
        <form id="update-url-form" className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="update-url">新網址（選填）</Label>
            <Input
              id="update-url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="update-expires">新過期時間（選填）</Label>
            <Input
              id="update-expires"
              type="datetime-local"
              value={expiresAtLocal}
              onChange={(e) => setExpiresAtLocal(e.target.value)}
              disabled={submitting}
            />
          </div>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button type="submit" form="update-url-form" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            儲存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
