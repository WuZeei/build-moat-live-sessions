import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteQr } from "@/api/qr";
import { describeApiError } from "@/lib/error-toast";
import type { QRInfo } from "@/types/qr";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  info: QRInfo;
  onUpdated: (info: QRInfo) => void;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  info,
  onUpdated,
}: DeleteConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  async function handleConfirm(
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await deleteQr(info.token);
      onUpdated({
        ...info,
        is_deleted: true,
        updated_at: new Date().toISOString(),
      });
      toast({ title: "已刪除" });
      onOpenChange(false);
    } catch (err) {
      toast(describeApiError(err, "刪除失敗，請稍後再試"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
          <AlertDialogDescription>
            確定要刪除 token <code className="font-mono">{info.token}</code>{" "}
            嗎？此操作為軟刪除，已建立的 QR Code 圖片將回傳 410。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={submitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            確認刪除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
