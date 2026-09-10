import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import {
  Mic, MicOff, Loader2, CheckCircle2, AlertCircle, RotateCcw,
  Sparkles, Send, Settings as SettingsIcon,
} from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { getCategoryLabel } from "@/locales/translations";

// ─── Types ───────────────────────────────────────────────────────────────────
type Status = "idle" | "listening" | "processing" | "done" | "error" | "unsupported";

interface ParsedExpense {
  merchant: string;
  amount: number | null;
  category?: string;
  transcript: string;
  provider?: "gemini" | "openai" | "rule-based";
}

// ─── Local Fallback Parser: extract merchant + amount from transcript ────────
function parseExpenseFromTranscript(text: string): ParsedExpense {
  const lower = text.toLowerCase();

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

  return { merchant, amount, transcript: text, provider: "rule-based" };
}

export default function VoicePage() {
  const [, navigate] = useLocation();
  const { isAiEnabled, getAiHeaders, t, isRtl } = useAppContext();
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [customText, setCustomText] = useState("");
  const [parsed, setParsed] = useState<ParsedExpense | null>(null);
  const [pulseSize, setPulseSize] = useState(1);
  const recognitionRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const transcriptRef = useRef<string>("");

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (status === "listening") {
      let tAnim = 0;
      const animate = () => {
        tAnim += 0.08;
        setPulseSize(1 + 0.15 * Math.abs(Math.sin(tAnim)));
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animFrameRef.current);
      setPulseSize(1);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [status]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("unsupported");
    }
  }, []);

  const processExpense = async (rawText: string) => {
    const cleaned = rawText.trim();
    if (!cleaned) {
      setStatus("idle");
      return;
    }

    setStatus("processing");

    if (isAiEnabled) {
      try {
        const res = await fetch("/api/ai/parse-text", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...getAiHeaders(),
          },
          body: JSON.stringify({ text: cleaned }),
        });

        if (res.ok) {
          const data = await res.json();
          setParsed({
            merchant: data.merchant || "Unknown Merchant",
            amount: typeof data.amount === "number" && data.amount > 0 ? data.amount : null,
            category: data.category,
            transcript: cleaned,
            provider: data.provider || "gemini",
          });
          setStatus("done");
          return;
        }
      } catch (err) {
        console.warn("AI parse failed, falling back to local regex:", err);
      }
    }

    const localResult = parseExpenseFromTranscript(cleaned);
    setParsed(localResult);
    setStatus("done");
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = isRtl ? "ar-EG" : "en-US";
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
      const current = finalText || interimText;
      setTranscript(current);
      transcriptRef.current = current;
    };

    recognition.onend = () => {
      const recorded = transcriptRef.current;
      if (recorded.trim()) {
        processExpense(recorded);
      } else {
        setStatus("idle");
      }
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
    transcriptRef.current = "";
    setParsed(null);
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const handleConfirm = () => {
    if (!parsed) return;
    sessionStorage.setItem("manualPrefill", JSON.stringify({
      merchant: parsed.merchant,
      amount: parsed.amount ?? "",
      category: parsed.category || "Food & Drink",
      notes: `Voice: "${parsed.transcript}"`,
      captureChannel: "voice",
    }));
    navigate("/manual");
  };

  const reset = () => {
    setStatus("idle");
    setTranscript("");
    transcriptRef.current = "";
    setCustomText("");
    setParsed(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar title={t.voiceTitle} showBack />

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 pb-8">

        {/* AI Status Badge */}
        {isAiEnabled ? (
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs px-3.5 py-1.5 rounded-full">
            <Sparkles size={13} className="animate-pulse" />
            <span className="font-semibold">{t.voiceAiActiveBadge}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-muted/50 border border-card-border text-muted-foreground text-xs px-3.5 py-1.5 rounded-full">
            <Sparkles size={13} className="text-accent" />
            <span>{isRtl ? 'الوضع المحلي نشط' : 'Local parser active'}</span>
            <Link href="/settings" className="text-accent font-semibold hover:underline flex items-center gap-0.5">
              {isRtl ? 'تفعيل الذكاء الاصطناعي' : 'Add Gemini Key'} <SettingsIcon size={11} />
            </Link>
          </div>
        )}

        {/* Status message */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">
            {status === "idle" && t.voiceTapToSpeak}
            {status === "listening" && t.voiceListening}
            {status === "processing" && t.voiceProcessing}
            {status === "done" && t.voiceDone}
            {status === "error" && t.voiceMicBlocked}
            {status === "unsupported" && t.voiceUnsupported}
          </h2>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
            {status === "idle" && t.voiceHint}
            {status === "listening" && (isRtl ? "اتكلم بوضوح، واضغط على الزرار لما تخلص" : "Speak clearly, then tap stop when finished")}
            {status === "processing" && (isRtl ? "بنطلع اسم المتجر والمبلغ والتصنيف..." : "Analyzing merchant, amount, and category…")}
            {status === "done" && (isRtl ? "راجع التفاصيل وسجّل حركتك" : "Review the details below")}
            {status === "error" && (isRtl ? "يرجى السماح بالمايك في إعدادات المتصفح" : "Please allow microphone access in browser permissions")}
            {status === "unsupported" && (isRtl ? "تقدر تكتب المصروف هنا تحت!" : "You can still type your expense below!")}
          </p>
        </div>

        {/* Mic button */}
        {status !== "unsupported" && (
          <div className="relative">
            {status === "listening" && (
              <>
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                <div className="absolute inset-[-12px] rounded-full bg-red-500/10 animate-pulse" />
              </>
            )}

            <button
              type="button"
              onClick={status === "listening" ? stopListening : startListening}
              disabled={status === "processing"}
              className="relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-200 shadow-2xl disabled:opacity-50"
              style={{
                transform: `scale(${status === "listening" ? pulseSize : 1})`,
                background: status === "listening"
                  ? "linear-gradient(135deg, #ef4444, #dc2626)"
                  : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              }}
            >
              {status === "listening" ? (
                <MicOff className="w-12 h-12 text-white" />
              ) : (
                <Mic className="w-12 h-12 text-white" />
              )}
            </button>
          </div>
        )}

        {/* Live transcript during listening */}
        {status === "listening" && transcript && (
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1 font-medium">{t.voiceHeardSoFar}</p>
            <p className="text-sm font-semibold text-foreground italic">"{transcript}"</p>
          </div>
        )}

        {/* Processing Spinner */}
        {status === "processing" && (
          <div className="flex items-center gap-2 text-accent text-sm font-semibold">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{t.voiceProcessing}</span>
          </div>
        )}

        {/* Quick Text Input Alternative */}
        {status === "idle" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customText.trim()) processExpense(customText);
            }}
            className="w-full max-w-sm flex items-center gap-2 bg-card border border-card-border rounded-2xl p-1.5 shadow-sm"
          >
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={t.voiceOrType}
              className="flex-1 text-xs bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="submit"
              disabled={!customText.trim()}
              className="bg-accent text-accent-foreground p-2 rounded-xl disabled:opacity-40 hover:bg-accent/90 transition-colors"
              style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }}
            >
              <Send size={14} />
            </button>
          </form>
        )}

        {/* DONE Result Card */}
        {status === "done" && parsed && (
          <div className="w-full max-w-sm space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold text-sm">{t.voiceDone}</span>
                </div>
                {parsed.provider && parsed.provider !== 'rule-based' && (
                  <span className="text-[10px] font-bold bg-accent/15 text-accent px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles size={10} /> AI NLP
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

              <div className="pt-2 border-t border-card-border">
                <p className="text-[11px] text-muted-foreground italic">"{parsed.transcript}"</p>
              </div>
            </div>

            <div className="space-y-3">
              <Button onClick={handleConfirm} className="w-full" size="lg">
                {t.voiceConfirmBtn}
              </Button>
              <Button variant="ghost" className="w-full gap-2" onClick={reset}>
                <RotateCcw className="w-4 h-4" />
                {t.voiceRecordAnother}
              </Button>
            </div>
          </div>
        )}

        {/* ERROR state */}
        {status === "error" && (
          <div className="w-full max-w-sm space-y-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-400">{t.voiceMicBlocked}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isRtl ? 'يرجى تفعيل صلاحية الميكروفون في المتصفح أو كتابة المصروف مباشرة في الحقل بالأعلى.' : 'Microphone permission denied. Enable it in browser settings or type your expense directly.'}
                </p>
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
