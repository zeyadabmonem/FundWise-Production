import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";

// ─── Types ───────────────────────────────────────────────────────────────────
type Status = "idle" | "listening" | "processing" | "done" | "error" | "unsupported";

interface ParsedExpense {
  merchant: string;
  amount: number | null;
  transcript: string;
}

// ─── Parser: extract merchant + amount from transcript ───────────────────────
function parseExpenseFromTranscript(text: string): ParsedExpense {
  const lower = text.toLowerCase();

  // Extract amount — supports Arabic + English patterns
  // e.g. "paid 50 pounds", "دفعت 120 جنيه", "50 EGP", "spent 75"
  const amountPatterns = [
    /(\d+(?:\.\d{1,2})?)\s*(?:egp|pounds?|جنيه|جنيهات|le)/i,
    /(?:paid|spent|cost|دفعت|اشتريت|كلف|بـ)\s+(\d+(?:\.\d{1,2})?)/i,
    /(\d+(?:\.\d{1,2})?)\s*(?:bucks|dollars?|دولار)/i,
    /(\d+(?:\.\d{1,2})?)/,
  ];

  let amount: number | null = null;
  for (const pattern of amountPatterns) {
    const match = lower.match(pattern);
    if (match) {
      amount = parseFloat(match[1]);
      break;
    }
  }

  // Extract merchant — known Egyptian merchants
  const merchants: Record<string, string> = {
    starbucks: "Starbucks", كارفور: "Carrefour", carrefour: "Carrefour",
    vodafone: "Vodafone", فودافون: "Vodafone", uber: "Uber", أوبر: "Uber",
    careem: "Careem", كريم: "Careem", netflix: "Netflix", نتفليكس: "Netflix",
    kfc: "KFC", "ماكدونالدز": "McDonald's", mcdonalds: "McDonald's",
    cilantro: "Cilantro", سيلانترو: "Cilantro", zara: "Zara", زارا: "Zara",
    noon: "Noon.com", نون: "Noon.com", amazon: "Amazon Egypt",
    spinneys: "Spinneys", سيوده: "Seoudi Market", seoudi: "Seoudi Market",
    metro: "Metro Market", anghami: "Anghami", انغامي: "Anghami",
    "costa coffee": "Costa Coffee", كوستا: "Costa Coffee",
    "orange egypt": "Orange Egypt", أورانج: "Orange Egypt",
    "cairo metro": "Cairo Metro", "المترو": "Cairo Metro",
    udemy: "Udemy", يوديمي: "Udemy", coursera: "Coursera",
  };

  let merchant = "Unknown Merchant";
  for (const [key, value] of Object.entries(merchants)) {
    if (lower.includes(key)) {
      merchant = value;
      break;
    }
  }

  return { merchant, amount, transcript: text };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function VoicePage() {
  const [, navigate] = useLocation();
  const { dispatch } = useAppContext();
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState<ParsedExpense | null>(null);
  const [pulseSize, setPulseSize] = useState(1);
  const recognitionRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);

  // ── Animate microphone pulse while listening ────────────────────────────
  useEffect(() => {
    if (status === "listening") {
      let t = 0;
      const animate = () => {
        t += 0.08;
        setPulseSize(1 + 0.15 * Math.abs(Math.sin(t)));
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animFrameRef.current);
      setPulseSize(1);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [status]);

  // ── Check browser support ───────────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("unsupported");
    }
  }, []);

  // ── Start recording ─────────────────────────────────────────────────────
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = "ar-EG"; // Arabic (Egypt) — falls back to English too
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setStatus("listening");

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      setTranscript(finalText || interimText);
    };

    recognition.onend = () => {
      setStatus("processing");
      setTimeout(() => {
        const full = transcript || "";
        if (full.trim()) {
          const result = parseExpenseFromTranscript(full);
          setParsed(result);
          setStatus("done");
        } else {
          setStatus("idle");
        }
      }, 500);
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error:", e.error);
      if (e.error === "not-allowed") {
        setStatus("error");
      } else {
        setStatus("idle");
      }
    };

    setTranscript("");
    setParsed(null);
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  // ── Navigate to manual entry with pre-filled data ───────────────────────
  const handleConfirm = () => {
    if (!parsed) return;
    // Pass prefill data via sessionStorage (wouter doesn't support route state)
    sessionStorage.setItem("manualPrefill", JSON.stringify({
      merchant: parsed.merchant,
      amount: parsed.amount ?? "",
      notes: `Voice: "${parsed.transcript}"`,
      captureChannel: "voice",
    }));
    navigate("/manual");
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar title="Voice Capture" showBack />

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 pb-8">

        {/* Status message */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">
            {status === "idle" && "Tap to speak"}
            {status === "listening" && "Listening…"}
            {status === "processing" && "Processing…"}
            {status === "done" && "Done!"}
            {status === "error" && "Microphone blocked"}
            {status === "unsupported" && "Not supported"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {status === "idle" && 'Say e.g. "Paid 95 EGP at Starbucks"'}
            {status === "listening" && "Speak clearly, then tap stop"}
            {status === "processing" && "Extracting merchant and amount…"}
            {status === "done" && "Review the details below"}
            {status === "error" && "Please allow microphone access"}
            {status === "unsupported" && "Use Chrome or Edge browser"}
          </p>
        </div>

        {/* Mic button */}
        {status !== "unsupported" && (
          <div className="relative">
            {/* Outer pulse ring */}
            {status === "listening" && (
              <>
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="absolute inset-[-8px] rounded-full bg-primary/10 animate-pulse" />
              </>
            )}

            <button
              onClick={status === "listening" ? stopListening : startListening}
              disabled={status === "processing"}
              className="relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-200 shadow-2xl disabled:opacity-50"
              style={{
                background: status === "listening"
                  ? "linear-gradient(135deg, #ef4444, #dc2626)"
                  : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                transform: `scale(${status === "listening" ? pulseSize : 1})`,
              }}
            >
              {status === "processing" ? (
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              ) : status === "listening" ? (
                <MicOff className="w-10 h-10 text-white" />
              ) : (
                <Mic className="w-10 h-10 text-white" />
              )}
            </button>
          </div>
        )}

        {/* Live transcript */}
        {(status === "listening" || status === "processing") && transcript && (
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Transcript</p>
            <p className="text-foreground font-medium">"{transcript}"</p>
          </div>
        )}

        {/* Result card */}
        {status === "done" && parsed && (
          <div className="w-full max-w-sm space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold text-sm">Extracted successfully</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Merchant</span>
                  <span className="font-semibold text-foreground">{parsed.merchant}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-foreground">
                    {parsed.amount != null ? `EGP ${parsed.amount}` : "Not detected"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transcript</span>
                  <span className="font-medium text-foreground text-right max-w-[180px] truncate">
                    "{parsed.transcript}"
                  </span>
                </div>
              </div>
            </div>

            <Button onClick={handleConfirm} className="w-full" size="lg">
              Continue to Save
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => { setStatus("idle"); setTranscript(""); setParsed(null); }}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="w-full max-w-sm bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-400">Microphone access denied</p>
              <p className="text-xs text-muted-foreground mt-1">
                Go to browser settings → Site permissions → Allow microphone for this site.
              </p>
            </div>
          </div>
        )}

        {/* Unsupported */}
        {status === "unsupported" && (
          <div className="w-full max-w-sm bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-400">Browser not supported</p>
              <p className="text-xs text-muted-foreground mt-1">
                Voice recognition requires Chrome 25+ or Edge 79+. Please switch browsers.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
