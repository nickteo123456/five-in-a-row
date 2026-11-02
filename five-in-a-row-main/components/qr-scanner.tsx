"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Camera, Type, Scan } from "lucide-react"
import { useGame } from "./game-provider"

interface QRScannerProps {
  onClose: () => void
}

export function QRScanner({ onClose }: QRScannerProps) {
  const [manualInput, setManualInput] = useState("")
  const [isManualMode, setIsManualMode] = useState(false)
  const { scanQRCode } = useGame()

  const handleScan = (data: string) => {
    if (data.trim()) {
      scanQRCode(data.trim())
      onClose()
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleScan(manualInput)
  }

  // Sample QR codes for demonstration
  const sampleQRCodes = [
    { label: "Function.Basics", data: '{"type":"question","questionId":"1"}' },
    { label: "Return.Values", data: '{"type":"question","questionId":"2"}' },
    { label: "Bonus.Points", data: '{"type":"bonus","points":15}' },
    { label: "Random.Quest", data: "random_question_trigger" },
  ]

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md cyber-border glow-accent">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
              <Scan className="h-5 w-5 text-accent" />
            </div>
            <DialogTitle className="font-mono text-accent">QUANTUM.SCANNER</DialogTitle>
          </div>
          <DialogDescription className="font-mono text-muted-foreground">
            {">"} Scan quantum codes from physical board or input manually
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!isManualMode ? (
            <div className="space-y-6">
              <div className="cyber-border p-8 rounded-xl text-center bg-muted/20">
                <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 inline-block mb-4">
                  <Camera className="h-12 w-12 text-accent" />
                </div>
                <p className="text-sm text-muted-foreground mb-6 font-mono">
                  {">"} Quantum scanner interface would initialize here
                  <br />
                  {">"} Physical camera integration required
                </p>
                <Button
                  variant="outline"
                  onClick={() => setIsManualMode(true)}
                  className="w-full cyber-border hover:border-primary/30 hover:bg-primary/5 font-mono"
                >
                  <Type className="mr-2 h-4 w-4" />
                  MANUAL.INPUT.MODE
                </Button>
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-mono text-primary">SAMPLE.QUANTUM.CODES:</Label>
                <div className="grid grid-cols-2 gap-3">
                  {sampleQRCodes.map((code, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleScan(code.data)}
                      className="text-xs font-mono cyber-border hover:border-accent/30 hover:bg-accent/5 h-12"
                    >
                      {code.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="qrCode" className="font-mono text-primary">
                  QUANTUM.DATA
                </Label>
                <Input
                  id="qrCode"
                  placeholder="Enter quantum code data or JSON..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  required
                  className="cyber-border font-mono bg-input/50 focus:glow-accent"
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90 glow-accent font-mono">
                  PROCESS.CODE
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsManualMode(false)}
                  className="cyber-border hover:border-secondary/30 hover:bg-secondary/5 font-mono"
                >
                  SCANNER.MODE
                </Button>
              </div>
            </form>
          )}

          <Button
            variant="outline"
            onClick={onClose}
            className="w-full cyber-border border-destructive/30 hover:border-destructive hover:bg-destructive/10 font-mono bg-transparent"
          >
            ABORT.SCAN
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
