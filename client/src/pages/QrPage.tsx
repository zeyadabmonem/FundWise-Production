import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAppContext } from '../contexts/AppContext';
import { QrCode, X } from 'lucide-react';
import { ConfirmationCard, ExtractedData } from '../components/ConfirmationCard';

const CANNED_RESULTS: ExtractedData[] = [
  { merchant: "Carrefour Market", amount: 180, category: "Groceries" },
  { merchant: "Tabali", amount: 150, category: "Food & Drink" },
];

export default function QrPage() {
  const [, setLocation] = useLocation();
  const { addTransaction } = useAppContext();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const handleScanMock = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const randomResult = CANNED_RESULTS[Math.floor(Math.random() * CANNED_RESULTS.length)];
      setExtractedData(randomResult);
      setShowConfirmation(true);
    }, 1000);
  };

  const handleConfirm = (data: ExtractedData) => {
    addTransaction({
      merchant: data.merchant,
      amount: Number(data.amount),
      category: data.category,
      date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
      notes: data.notes,
      captureChannel: 'qr'
    });
    setTimeout(() => {
      setLocation('/dashboard');
    }, 500);
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative">
      <div className="absolute top-4 left-4 z-20">
        <button onClick={() => window.history.back()} className="w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 bg-black relative flex flex-col">
        {/* Mock Camera View */}
        <div className="absolute inset-0 bg-muted/20">
          {/* Overlay to darken outside viewfinder */}
          <div className="absolute inset-0 border-[60px] border-black/60 pointer-events-none"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 mt-10">
          <div className="text-center mb-10 text-white">
            <h2 className="text-2xl font-bold mb-2">Scan QR Code</h2>
            <p className="text-white/70 text-sm">Point camera at a supported merchant QR</p>
          </div>

          <div className="relative w-64 h-64 border-2 border-white/30 rounded-3xl overflow-hidden mb-12">
            {/* Viewfinder brackets */}
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-3xl"></div>
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-3xl"></div>
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-3xl"></div>
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-3xl"></div>
            
            {/* Scan line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_2px_rgba(56,189,248,0.5)] animate-scanline"></div>

            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                 <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          <button 
            onClick={handleScanMock}
            disabled={isProcessing}
            className="bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:opacity-90 transition-opacity active:scale-95"
          >
            <QrCode size={20} />
            Scan Demo QR
          </button>
          <span className="text-white/50 text-xs mt-3 uppercase tracking-widest font-semibold">Demo Mode</span>
        </div>
      </div>

      <ConfirmationCard 
        isOpen={showConfirmation}
        data={extractedData}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirmation(false)}
        source="qr"
      />
    </div>
  );
}
