import { useState } from "react";
import { CreateForm } from "@/components/CreateForm";
import { QrDetailCard } from "@/components/QrDetailCard";
import type { QRInfo } from "@/types/qr";

export default function App() {
  const [qrInfo, setQrInfo] = useState<QRInfo | null>(null);

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container mx-auto max-w-4xl space-y-6 px-4">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">QR Code Generator</h1>
          <p className="text-muted-foreground">
            建立短網址與 QR Code，並可更新、刪除、查看分析統計。
          </p>
        </header>
        <CreateForm onCreated={setQrInfo} />
        {qrInfo && <QrDetailCard info={qrInfo} onUpdated={setQrInfo} />}
      </div>
    </div>
  );
}
