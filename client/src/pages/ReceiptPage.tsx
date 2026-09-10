import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAppContext } from '../contexts/AppContext';
import { Camera, X, Upload, AlertCircle, Sparkles } from 'lucide-react';
import { ConfirmationCard, ExtractedData } from '../components/ConfirmationCard';
import { motion, AnimatePresence } from 'framer-motion';

export default function ReceiptPage() {
  const [, setLocation] = useLocation();
  const { addTransaction } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [processingStep, setProcessingStep] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setPreviewUrl(URL.createObjectURL(file));
    setIsProcessing(true);
    setProcessingStep('Uploading image…');

    try {
      const formData = new FormData();
      formData.append('image', file);

      setProcessingStep('Reading receipt with AI…');

      const res = await fetch('/api/ai/scan-receipt', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not read receipt. Please try again.');
        setIsProcessing(false);
        setPreviewUrl(null);
        return;
      }

      setExtractedData({
        merchant: data.merchant || 'Unknown',
        amount: data.amount || 0,
        category: data.category || 'Other',
        date: data.date || new Date().toISOString().split('T')[0],
      });

      setIsProcessing(false);
      setShowConfirmation(true);
    } catch {
      setError('Network error. Check your connection and try again.');
      setIsProcessing(false);
      setPreviewUrl(null);
    }

    // Reset the input so the same file can be picked again
    e.target.value = '';
  };

  const handleConfirm = (data: ExtractedData) => {
    addTransaction({
      merchant: data.merchant,
      amount: Number(data.amount),
      category: data.category,
      date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
      notes: data.notes,
      captureChannel: 'receipt',
    });
    setTimeout(() => setLocation('/dashboard'), 500);
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setPreviewUrl(null);
  };

  const reset = () => {
    setPreviewUrl(null);
    setError('');
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative">
      {/* Close / Back */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => window.history.back()}
          className="w-10 h-10 bg-card/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm border border-card-border text-foreground"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col p-6 pt-20 gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-1">Scan Receipt</h2>
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-1.5">
            <Sparkles size={14} className="text-accent" />
            AI reads merchant name &amp; total automatically
          </p>
        </div>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        <AnimatePresence mode="wait">
          {/* Error state */}
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex gap-3"
            >
              <AlertCircle size={18} className="text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Could not read receipt</p>
                <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
                <button onClick={reset} className="text-xs font-medium text-destructive underline mt-1">
                  Try again
                </button>
              </div>
            </motion.div>
          )}

          {/* Image preview + processing overlay */}
          {previewUrl ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 relative rounded-2xl overflow-hidden border border-card-border bg-black min-h-64"
            >
              <img
                src={previewUrl}
                alt="Receipt"
                className={`w-full h-full object-cover transition-opacity duration-300 ${isProcessing ? 'opacity-40' : 'opacity-90'}`}
              />

              {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/20 backdrop-blur-sm">
                  {/* Sky-blue shimmer bar */}
                  <div className="w-48 h-1.5 bg-accent/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-accent rounded-full"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ width: '60%' }}
                    />
                  </div>

                  <div className="bg-card/90 backdrop-blur px-5 py-2.5 rounded-full flex items-center gap-2 shadow-lg border border-accent/30">
                    <Sparkles size={16} className="text-accent" />
                    <span className="text-sm font-semibold text-foreground">{processingStep}</span>
                    <span className="inline-flex items-center gap-0.5">
                      {[0, 1, 2].map(i => (
                        <motion.span
                          key={i}
                          className="w-1 h-1 bg-accent rounded-full"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* Upload zone */
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-h-64"
            >
              <div
                onClick={() => fileInputRef.current?.click()}
                className="h-full border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-5 cursor-pointer hover:bg-muted/30 hover:border-accent/40 transition-all bg-card"
              >
                <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                  <Camera size={36} />
                </div>
                <div className="text-center px-6">
                  <p className="font-semibold text-foreground text-lg mb-1">
                    Tap to capture or upload
                  </p>
                  <p className="text-muted-foreground text-sm">
                    JPG, PNG, WEBP · up to 25 MB
                  </p>
                </div>
                <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium flex items-center gap-2 shadow-sm">
                  <Upload size={17} /> Select Image
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manual fallback */}
        <div className="text-center pb-2">
          <button
            onClick={() => setLocation('/manual')}
            className="text-sm font-medium text-primary hover:underline"
          >
            Prefer to enter manually →
          </button>
        </div>
      </div>

      <ConfirmationCard
        isOpen={showConfirmation}
        data={extractedData}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        source="receipt"
      />
    </div>
  );
}
