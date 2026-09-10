import { useRef, useState } from "react";
import { useLocation } from "wouter";
import Tesseract from "tesseract.js";
import TopBar from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import {
  Camera, Upload, Loader2, CheckCircle2, AlertCircle, FileImage, RotateCcw,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Status = "idle" | "previewing" | "scanning" | "done" | "error";

interface ParsedReceipt {
  merchant: string;
  amount: number | null;
  rawText: string;
}

// ─── OCR Parser ──────────────────────────────────────────────────────────────
function parseReceiptText(text: string): ParsedReceipt {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // ── Find amount: look for the largest number (usually the total)
  const amountCandidates: number[] = [];
  const amountPattern = /(?:total|amount|مبلغ|إجمالي|الإجمالي|sum|due|subtotal)?[\s:]*(\d+(?:[.,]\d{1,2})?)/gi;
  for (const line of lines) {
    let m: RegExpExecArray | null;
    while ((m = amountPattern.exec(line)) !== null) {
      const val = parseFloat(m[1].replace(",", "."));
      if (val > 0 && val < 100000) amountCandidates.push(val);
    }
  }
  // Prefer largest value (total) unless it's suspiciously big
  const amount = amountCandidates.length
    ? Math.max(...amountCandidates)
    : null;

  // ── Find merchant: common Egyptian brands in the receipt text
  const merchantMap: Record<string, string> = {
    carrefour: "Carrefour", كارفور: "Carrefour",
    starbucks: "Starbucks", ستاربكس: "Starbucks",
    kfc: "KFC", "k.f.c": "KFC",
    "mcdonald": "McDonald's", macdonald: "McDonald's",
    "costa coffee": "Costa Coffee", costa: "Costa Coffee",
    cilantro: "Cilantro", سيلانترو: "Cilantro",
    spinneys: "Spinneys", سبينس: "Spinneys",
    seoudi: "Seoudi Market", سيوده: "Seoudi Market",
    "metro market": "Metro Market", metro: "Metro Market",
    zara: "Zara", زارا: "Zara", "h&m": "H&M",
    vodafone: "Vodafone", فودافون: "Vodafone",
    amazon: "Amazon Egypt", noon: "Noon.com", نون: "Noon.com",
    pharmacy: "Pharmacy", صيدلية: "Pharmacy", شيفا: "Shifa Pharmacy",
  };

  const lower = text.toLowerCase();
  let merchant = "Unknown Merchant";
  for (const [key, val] of Object.entries(merchantMap)) {
    if (lower.includes(key)) { merchant = val; break; }
  }

  // Fallback: use the first non-number line as merchant
  if (merchant === "Unknown Merchant") {
    for (const line of lines) {
      if (!/^\d/.test(line) && line.length > 2 && line.length < 40) {
        merchant = line;
        break;
      }
    }
  }

  return { merchant, amount, rawText: text };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ReceiptPage() {
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // ── Process image with Tesseract.js ────────────────────────────────────
  const processImage = async (file: File) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setStatus("scanning");
    setProgress(0);

    try {
      const result = await Tesseract.recognize(url, "eng+ara", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const extracted = parseReceiptText(result.data.text);
      setParsed(extracted);
      setStatus("done");
    } catch (err) {
      console.error("OCR error:", err);
      setErrorMsg("Could not read the image. Try a clearer photo.");
      setStatus("error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStatus("previewing");
      processImage(file);
    }
  };

  const handleConfirm = () => {
    if (!parsed) return;
    sessionStorage.setItem("manualPrefill", JSON.stringify({
      merchant: parsed.merchant,
      amount: parsed.amount ?? "",
      notes: "Captured via receipt scan",
      captureChannel: "receipt",
    }));
    navigate("/manual");
  };

  const reset = () => {
    setStatus("idle");
    setImageUrl(null);
    setParsed(null);
    setProgress(0);
    setErrorMsg("");
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar title="Scan Receipt" showBack />

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 pb-8">

        {/* ── IDLE state ─────────────────────────────────────────────────── */}
        {status === "idle" && (
          <>
            <div className="text-center">
              <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileImage className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Scan a Receipt</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Take a photo or upload an image — we'll extract the merchant and total
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-sm">
              {/* Camera capture (mobile) */}
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-5 h-5" />
                Take Photo
              </Button>

              {/* File upload */}
              <Button
                size="lg"
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-5 h-5" />
                Upload from Gallery
              </Button>
            </div>

            {/* Hidden inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Works offline — OCR runs directly in your browser using Tesseract.js
            </p>
          </>
        )}

        {/* ── SCANNING state ──────────────────────────────────────────────── */}
        {(status === "scanning" || status === "previewing") && (
          <>
            {imageUrl && (
              <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-border shadow-lg relative">
                <img src={imageUrl} alt="Receipt" className="w-full object-contain max-h-64" />
                {status === "scanning" && (
                  <div className="absolute inset-0 bg-background/60 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm font-medium text-foreground">Reading receipt…</p>
                    <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{progress}%</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── DONE state ─────────────────────────────────────────────────── */}
        {status === "done" && parsed && (
          <>
            {imageUrl && (
              <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-border shadow-md">
                <img src={imageUrl} alt="Receipt" className="w-full object-contain max-h-40" />
              </div>
            )}

            <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold text-sm">Receipt scanned successfully</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Merchant</span>
                  <span className="font-semibold text-foreground">{parsed.merchant}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-semibold text-foreground">
                    {parsed.amount != null ? `EGP ${parsed.amount.toFixed(2)}` : "Not detected"}
                  </span>
                </div>
              </div>

              {/* Raw OCR text (collapsed) */}
              <details className="text-xs">
                <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                  View raw OCR text
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-muted-foreground overflow-x-auto text-[10px] max-h-24 whitespace-pre-wrap">
                  {parsed.rawText}
                </pre>
              </details>
            </div>

            <div className="w-full max-w-sm space-y-3">
              <Button onClick={handleConfirm} className="w-full" size="lg">
                Continue to Save
              </Button>
              <Button variant="ghost" className="w-full gap-2" onClick={reset}>
                <RotateCcw className="w-4 h-4" />
                Scan Another
              </Button>
            </div>
          </>
        )}

        {/* ── ERROR state ─────────────────────────────────────────────────── */}
        {status === "error" && (
          <div className="w-full max-w-sm space-y-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-400">Scan failed</p>
                <p className="text-xs text-muted-foreground mt-1">{errorMsg}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full gap-2" onClick={reset}>
              <RotateCcw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
