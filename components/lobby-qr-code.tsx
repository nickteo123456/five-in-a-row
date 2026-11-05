'use client'

import { QRCodeSVG } from 'qrcode.react'

export function LobbyQRCode({ lobbyCode }: { lobbyCode: string }) {
  const lobbyUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/lobby/${lobbyCode}`
      : `/lobby/${lobbyCode}`

  // A white background keeps the code scannable on the dark theme
  return (
    <div className="p-3 rounded-xl bg-white">
      <QRCodeSVG value={lobbyUrl} size={168} level="M" />
    </div>
  )
}
