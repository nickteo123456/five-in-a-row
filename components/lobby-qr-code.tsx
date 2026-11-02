'use client';

import { QRCodeSVG } from 'qrcode.react';
import { QrCode } from 'lucide-react';

interface LobbyQRCodeProps {
  lobbyCode: string;
}

export function LobbyQRCode({ lobbyCode }: LobbyQRCodeProps) {
  // Construct the URL for the QR code
  const lobbyUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/lobby/${lobbyCode}`
    : `/lobby/${lobbyCode}`;

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
          <QrCode className="h-5 w-5 text-accent" />
        </div>
        <h3 className="text-lg font-bold font-mono text-accent">SCAN TO JOIN</h3>
      </div>
      <div className="cyber-border p-4 rounded-xl bg-accent/5 border-accent/30 glow-accent">
        <QRCodeSVG
          value={lobbyUrl}
          size={200}
          level="M"
          includeMargin={false}
          className="rounded-lg"
        />
      </div>
      <p className="text-xs text-muted-foreground font-mono text-center max-w-[200px]">
        {">"} Scan with phone camera to join lobby
      </p>
    </div>
  );
}

