import { useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import Tesseract from "tesseract.js";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import {
  Camera, Upload, Loader2, CheckCircle2, AlertCircle, FileImage, RotateCcw,
  Sparkles, Settings as SettingsIcon,
} from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { getCategoryLabel } from "@/locales/translations";

// ─── Types ───────────────────────────────────────────────────────────────────
type Status = "idle" | "previewing" | "scanning" | "done" | "error";

interface ParsedReceipt {
  merchant: string;
  amount: number | null;
  category?: string;
  rawText: string;
  provider?: "gemini" | "openai" | "rule-based" | "tesseract";
}

// ─── Local Fallback OCR Parser (Tesseract) ───────────────────────────────────
function parseReceiptText(text: string): ParsedReceipt {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const amountCandidates: number[] = [];
  const amountPattern = /(?:total|amount|مبلغ|إجمالي|الإجمالي|sum|due|subtotal)?[\s:]*(\d+(?:[.,]\d{1,2})?)/gi;
  for (const line of lines) {
    let m: RegExpExecArray | null;
    while ((m = amountPattern.exec(line)) !== null) {
      const val = parseFloat(m[1].replace(",", "."));
      if (val > 0 && val < 100000) amountCandidates.push(val);
    }
  }
  const amount = amountCandidates.length ? Math.max(...amountCandidates) : null;

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

  if (merchant === "Unknown Merchant") {
    for (const line of lines) {
      if (!/^\d/.test(line) && line.length > 2 && line.length < 40) {
        merchant = line;
        break;
      }
    }
  }

  return { merchant, amount, rawText: text, provider: "tesseract" };
}

export default function ReceiptPage() {
  const [, navigate] = useLocation();
  const { isAiEnabled, getAiHeaders, geminiApiKey, t, isRtl } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [scanMethod, setScanMethod] = useState<string>(t.receiptReading);
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const processImage = async (file: File) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setStatus("scanning");
    setProgress(15);

    if (isAiEnabled) {
      try {
        setScanMethod(geminiApiKey ? (isRtl ? "جاري قراءة الفاتورة بـ Gemini AI..." : "Gemini Flash Vision...") : (isRtl ? "جاري قراءة الفاتورة بالذكاء الاصطناعي..." : "AI Vision OCR..."));
        setProgress(40);

        const formData = new FormData();
        formData.append("image", file);

        const res = await fetch("/api/ai/scan-receipt", {
          method: "POST",
          credentials: "include",
          headers: getAiHeaders(),
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`AI Scan failed with status ${res.status}`);
        }

        setProgress(90);
        const data = await res.json();

        setParsed({
          merchant: data.merchant || "Unknown Merchant",
          amount: typeof data.amount === "number" ? data.amount : null,
          category: data.category,
          rawText: data.rawText || `Extracted via ${data.provider === 'gemini' ? 'Gemini Flash' : 'Vision AI'}`,
          provider: data.provider || "gemini",
        });

        setProgress(100);
        setStatus("done");
        return;
      } catch (aiErr) {
        console.warn("AI scan failed, falling back to local Tesseract OCR:", aiErr);
      }
    }

    try {
      setScanMethod(isRtl ? "قراءة محلية سريعة..." : "Local OCR (Tesseract)...");
      setProgress(10);
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
      setErrorMsg(isRtl ? "تعذر قراءة الصورة، يرجى تصوير الفاتورة في إضاءة واضحة." : "Could not read the image. Try a clearer photo.");
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
      category: parsed.category || "Groceries",
      notes: `Captured via receipt scan (${parsed.provider === 'gemini' ? 'Gemini AI Vision' : 'Receipt OCR'})`,
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar title={t.receiptTitle} showBack />

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 pb-8">

        {/* ── IDLE state ─────────────────────────────────────────────────── */}
        {status === "idle" && (
          <>
            <div className="text-center">
              <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileImage className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">{t.receiptTitle}</h2>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
                {t.receiptSubtitle}
              </p>
            </div>

            {/* AI Status Badge or Callout */}
            {isAiEnabled ? (
              <div className="w-full max-w-sm flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs px-3.5 py-2 rounded-xl">
                <Sparkles size={14} className="animate-pulse" />
                <span className="font-semibold">{t.receiptAiActiveBadge}</span>
              </div>
            ) : (
              <div className="w-full max-w-sm flex items-center justify-between bg-muted/50 border border-card-border text-muted-foreground text-xs p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-accent" />
                  <span>{t.receiptOfflineTip}</span>
                </div>
                <Link href="/settings" className="text-accent font-semibold flex items-center gap-0.5 hover:underline">
                  {t.navSettings} <SettingsIcon size={12} />
                </Link>
              </div>
            )}

            <div className="flex flex-col gap-3 w-full max-w-sm">
              <Button
                size="lg"
                className="w-full gap-2 font-semibold"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-5 h-5" />
                {t.receiptTakePhoto}
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="w-full gap-2 font-semibold"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-5 h-5" />
                {t.receiptUploadGallery}
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
              {isAiEnabled
                ? (isRtl ? "مدعوم برؤية الذكاء الاصطناعي مع وضع محلي احتياطي" : "Powered by Vision AI with local fallback")
                : (isRtl ? "قارئ الفواتير المجاني يعمل في المتصفح. يمكنك تفعيل الذكاء الاصطناعي للدقة القصوى." : "Free local OCR runs directly in browser. Add API key for maximum accuracy.")}
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
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles size={16} className="text-accent" /> {scanMethod}
                    </p>
                    <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-300"
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold text-sm">{t.receiptSuccess}</span>
                </div>
                {parsed.provider && parsed.provider !== 'tesseract' && (
                  <span className="text-[10px] font-bold bg-accent/15 text-accent px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles size={10} /> AI Vision
                  </span>
                )}
              </div>

              <div className="space-y-2 pt-1 border-t border-card-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t.receiptMerchant}</span>
                  <span className="font-bold text-foreground">{parsed.merchant}</span>
                </div>
                {parsed.category && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.receiptCategory}</span>
                    <span className="font-semibold text-foreground">{getCategoryLabel(parsed.category, t)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t.receiptTotalAmount}</span>
                  <span className="font-extrabold text-foreground text-base">
                    {parsed.amount != null ? `${parsed.amount.toFixed(2)} ${isRtl ? 'ج.م' : 'EGP'}` : (isRtl ? "مش محدد" : "Not detected")}
                  </span>
                </div>
              </div>

              <details className="text-xs pt-1">
                <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                  {t.receiptViewRaw}
                </summary>
                <pre className="mt-2 p-2 bg-muted/60 rounded text-muted-foreground overflow-x-auto text-[10px] max-h-24 whitespace-pre-wrap font-mono">
                  {parsed.rawText}
                </pre>
              </details>
            </div>

            <div className="w-full max-w-sm space-y-3">
              <Button onClick={handleConfirm} className="w-full" size="lg">
                {t.receiptContinueBtn}
              </Button>
              <Button variant="ghost" className="w-full gap-2" onClick={reset}>
                <RotateCcw className="w-4 h-4" />
                {t.receiptScanAnother}
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
                <p className="text-sm font-bold text-red-400">{isRtl ? 'فشل قراءة الفاتورة' : 'Scan failed'}</p>
                <p className="text-xs text-muted-foreground mt-1">{errorMsg}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full gap-2" onClick={reset}>
              <RotateCcw className="w-4 h-4" />
              {isRtl ? 'حاول تاني' : 'Try Again'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
