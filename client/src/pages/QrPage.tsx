import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import jsQR from "jsqr";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, QrCode, RotateCcw } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Status = "idle" | "scanning" | "done" | "error" | "unsupported";

interface ParsedQR {
  raw: string;
  merchant: string;
  amount: number | null;
}

// ─── QR Data Parser ───────────────────────────────────────────────────────────
// Supports common formats:
//   merchant=Carrefour&amount=350
//   {"merchant":"KFC","amount":150}
//   Carrefour|350
//   Just a merchant name
function parseQRData(raw: string): ParsedQR {
  let merchant = "Unknown Merchant";
  let amount: number | null = null;

  try {
    // JSON format
    const json = JSON.parse(raw);
    merchant = json.merchant || json.name || json.store || merchant;
    amount = parseFloat(json.amount || json.total || json.price || 0) || null;
    return { raw, merchant, amount };
  } catch { /* not JSON */ }

  // URL query string format
  if (raw.includes("=")) {
    try {
      const params = new URLSearchParams(raw.includes("?") ? raw.split("?")[1] : raw);
      merchant = params.get("merchant") || params.get("name") || params.get("store") || merchant;
      const amt = params.get("amount") || params.get("total") || params.get("price");
      amount = amt ? parseFloat(amt) : null;
      return { raw, merchant, amount };
    } catch { /* invalid params */ }
  }

  // Pipe-separated: "Merchant|Amount"
  if (raw.includes("|")) {
    const [m, a] = raw.split("|");
    merchant = m?.trim() || merchant;
    amount = a ? parseFloat(a.trim()) : null;
    return { raw, merchant, amount };
  }

  // Comma-separated: "Merchant,Amount"
  if (raw.includes(",")) {
    const [m, a] = raw.split(",");
    merchant = m?.trim() || merchant;
    amount = a ? parseFloat(a.trim()) : null;
    return { raw, merchant, amount };
  }

  // Plain text — treat as merchant name
  merchant = raw.trim().slice(0, 50);
  // Try to extract a number from the text
  const numMatch = raw.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (numMatch) amount = parseFloat(numMatch[1].replace(",", "."));

  return { raw, merchant, amount };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function QrPage() {
  const [, navigate] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const [status, setStatus] = useState<Status>("idle");
  const [parsed, setParsed] = useState<ParsedQR | null>(null);

  // ── Start camera and scan loop ──────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // back camera on mobile
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus("scanning");
        requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setStatus("error");
      } else {
        setStatus("unsupported");
      }
    }
  };

  // ── Scan each video frame for QR code ──────────────────────────────────
  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== 4) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code) {
      stopCamera();
      const result = parseQRData(code.data);
      setParsed(result);
      setStatus("done");
    } else {
      rafRef.current = requestAnimationFrame(scanFrame);
    }
  };

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const reset = () => {
    stopCamera();
    setParsed(null);
    setStatus("idle");
  };

  const handleConfirm = () => {
    if (!parsed) return;
    sessionStorage.setItem("manualPrefill", JSON.stringify({
      merchant: parsed.merchant,
      amount: parsed.amount ?? "",
      notes: `QR: ${parsed.raw.slice(0, 100)}`,
      captureChannel: "qr",
    }));
    navigate("/manual");
  };

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), []);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar title="QR Scanner" showBack />

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 pb-8">

        {/* ── IDLE ─────────────────────────────────────────────────────── */}
        {status === "idle" && (
          <>
            <div className="text-center">
              <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Scan QR Code</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Point your camera at a payment or merchant QR code
              </p>
            </div>
            <Button size="lg" className="gap-2" onClick={startCamera}>
              <QrCode className="w-5 h-5" />
              Start Camera
            </Button>
          </>
        )}

        {/* ── SCANNING ─────────────────────────────────────────────────── */}
        {status === "scanning" && (
          <div className="w-full max-w-sm space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Point camera at a QR code — scanning automatically
            </p>

            {/* Live camera viewfinder */}
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-primary/50 shadow-lg">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

              {/* Corner bracket overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                {/* Scanning line animation */}
                <div className="absolute left-6 right-6 h-0.5 bg-primary/80 animate-bounce top-1/2" />
              </div>
            </div>

            {/* Hidden canvas for frame processing */}
            <canvas ref={canvasRef} className="hidden" />

            <Button variant="outline" className="w-full gap-2" onClick={reset}>
              <RotateCcw className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        )}

        {/* ── DONE ─────────────────────────────────────────────────────── */}
        {status === "done" && parsed && (
          <div className="w-full max-w-sm space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold text-sm">QR Code detected!</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Merchant</span>
                  <span className="font-semibold text-foreground">{parsed.merchant}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-foreground">
                    {parsed.amount != null ? `EGP ${parsed.amount}` : "Not in QR"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground border-t border-border pt-2 mt-2 font-mono break-all">
                  {parsed.raw.slice(0, 120)}{parsed.raw.length > 120 ? "…" : ""}
                </div>
              </div>
            </div>

            <Button onClick={handleConfirm} className="w-full" size="lg">
              Continue to Save
            </Button>
            <Button variant="ghost" className="w-full gap-2" onClick={reset}>
              <RotateCcw className="w-4 h-4" />
              Scan Another
            </Button>
          </div>
        )}

        {/* ── ERROR ────────────────────────────────────────────────────── */}
        {status === "error" && (
          <div className="w-full max-w-sm space-y-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-400">Camera access denied</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Go to browser settings → Site permissions → Allow camera for this site.
                </p>
              </div>
            </div>
            <Button variant="outline" className="w-full gap-2" onClick={reset}>
              <RotateCcw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        )}

        {/* ── UNSUPPORTED ──────────────────────────────────────────────── */}
        {status === "unsupported" && (
          <div className="w-full max-w-sm bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-400">Camera not available</p>
              <p className="text-xs text-muted-foreground mt-1">
                Make sure you're on HTTPS and using a modern browser. Try Chrome or Safari.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
