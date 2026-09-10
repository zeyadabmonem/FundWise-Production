import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAppContext } from '../contexts/AppContext';
import { Mic, MicOff, X, AlertCircle, FileText } from 'lucide-react';
import { ConfirmationCard, ExtractedData } from '../components/ConfirmationCard';
import { motion, AnimatePresence } from 'framer-motion';

type RecordingState = 'idle' | 'recording' | 'processing' | 'error';

export default function VoicePage() {
  const [, setLocation] = useLocation();
  const { addTransaction } = useAppContext();

  const [state, setState] = useState<RecordingState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [transcript, setTranscript] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [waveHeights, setWaveHeights] = useState<number[]>(Array(20).fill(4));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const waveAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animate waveform while recording
  useEffect(() => {
    if (state === 'recording') {
      waveAnimRef.current = setInterval(() => {
        setWaveHeights(prev => prev.map(() => 4 + Math.random() * 36));
      }, 100);
    } else {
      if (waveAnimRef.current) clearInterval(waveAnimRef.current);
      setWaveHeights(Array(20).fill(4));
    }
    return () => { if (waveAnimRef.current) clearInterval(waveAnimRef.current); };
  }, [state]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const startRecording = async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Pick the best supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await processAudio(blob, mimeType);
      };

      recorder.start(250); // collect chunks every 250ms
      setState('recording');
    } catch (err) {
      setErrorMsg('Microphone access denied. Please allow microphone permissions and try again.');
      setState('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      setState('processing');
    }
  };

  const processAudio = async (blob: Blob, mimeType: string) => {
    try {
      const formData = new FormData();
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      formData.append('audio', blob, `recording.${ext}`);

      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Processing failed. Please try again.');
        setState('error');
        return;
      }

      if (data.transcript) setTranscript(data.transcript);

      setExtractedData({
        merchant: data.merchant || 'Unknown',
        amount: data.amount || 0,
        category: data.category || 'Other',
        date: data.date || new Date().toISOString().split('T')[0],
      });
      setShowConfirmation(true);
      setState('idle');
    } catch {
      setErrorMsg('Network error. Check your connection and try again.');
      setState('error');
    }
  };

  const handleToggle = () => {
    if (state === 'idle') startRecording();
    else if (state === 'recording') stopRecording();
  };

  const handleConfirm = (data: ExtractedData) => {
    addTransaction({
      merchant: data.merchant,
      amount: Number(data.amount),
      category: data.category,
      date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
      notes: data.notes,
      captureChannel: 'voice',
    });
    setTimeout(() => setLocation('/dashboard'), 500);
  };

  const isProcessing = state === 'processing';
  const isRecording = state === 'recording';

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative overflow-hidden">
      {/* Close button */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => window.history.back()}
          className="w-10 h-10 bg-card rounded-full flex items-center justify-center shadow-sm border border-card-border text-foreground"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-10">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {isRecording ? 'Listening…' : isProcessing ? 'Analyzing…' : 'Tap to record'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isRecording
              ? 'Speak your expense, then tap to stop'
              : isProcessing
              ? 'AI is extracting your transaction'
              : 'e.g. "I spent 85 pounds at Starbucks today"'}
          </p>
        </div>

        {/* Waveform / processing visual */}
        <div className="h-16 flex items-center justify-center gap-1">
          <AnimatePresence mode="wait">
            {isRecording && (
              <motion.div
                key="wave"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-[3px]"
              >
                {waveHeights.map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 rounded-full bg-accent"
                    animate={{ height: h }}
                    transition={{ duration: 0.1 }}
                    style={{ height: h }}
                  />
                ))}
              </motion.div>
            )}
            {isProcessing && (
              <motion.div
                key="pulse"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="w-48 h-2 bg-accent/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-accent rounded-full"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ width: '60%' }}
                  />
                </div>
              </motion.div>
            )}
            {state === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-[3px]"
              >
                {Array(20).fill(0).map((_, i) => (
                  <div key={i} className="w-1.5 h-1 rounded-full bg-border" />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Record button */}
        <div className="relative flex items-center justify-center">
          {isRecording && (
            <motion.div
              className="absolute w-40 h-40 rounded-full bg-destructive/15"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          {isProcessing && (
            <motion.div
              className="absolute w-40 h-40 rounded-full bg-accent/20"
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
          )}
          <button
            onClick={handleToggle}
            disabled={isProcessing}
            className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
              isRecording
                ? 'bg-destructive text-white scale-110'
                : isProcessing
                ? 'bg-accent/30 text-accent cursor-not-allowed'
                : 'bg-primary text-white hover:scale-105 active:scale-95'
            }`}
          >
            {isRecording ? <MicOff size={44} /> : <Mic size={44} />}
          </button>
        </div>

        {/* Transcript preview */}
        <AnimatePresence>
          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xs bg-card border border-card-border rounded-xl p-3 flex gap-2"
            >
              <FileText size={16} className="text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground italic">"{transcript}"</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        <AnimatePresence>
          {state === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xs bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex gap-3"
            >
              <AlertCircle size={18} className="text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive mb-1">Could not process</p>
                <p className="text-xs text-destructive/80">{errorMsg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manual fallback */}
        {!isRecording && !isProcessing && (
          <button
            onClick={() => setLocation('/manual')}
            className="text-sm font-medium text-primary hover:underline"
          >
            Having trouble? Enter manually →
          </button>
        )}
      </div>

      <ConfirmationCard
        isOpen={showConfirmation}
        data={extractedData}
        onConfirm={handleConfirm}
        onCancel={() => { setShowConfirmation(false); setTranscript(''); }}
        source="voice"
      />
    </div>
  );
}
