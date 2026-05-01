import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createQr, getQrInfo } from "@/api/qr";
import { describeApiError } from "@/lib/error-toast";
import { toIsoOrNull } from "@/lib/format";
import type { QRInfo } from "@/types/qr";

interface CreateFormProps {
  onCreated: (info: QRInfo) => void;
}

export function CreateForm({ onCreated }: CreateFormProps) {
  const [url, setUrl] = useState("");
  const [expiresAtLocal, setExpiresAtLocal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!url.trim()) {
      toast({ title: "請輸入網址", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const created = await createQr({
        url: url.trim(),
        expires_at: toIsoOrNull(expiresAtLocal),
      });
      const info = await getQrInfo(created.token);
      onCreated(info);
      toast({ title: "已建立 QR Code" });
      setUrl("");
      setExpiresAtLocal("");
    } catch (err) {
      toast(describeApiError(err, "建立失敗，請稍後再試"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>建立 QR Code</CardTitle>
        <CardDescription>輸入長網址，可選填過期時間</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="space-y-2">
              <Label htmlFor="create-url">網址</Label>
              <Input
                id="create-url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-expires">過期時間（選填）</Label>
              <Input
                id="create-expires"
                type="datetime-local"
                value={expiresAtLocal}
                onChange={(e) => setExpiresAtLocal(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            建立
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
