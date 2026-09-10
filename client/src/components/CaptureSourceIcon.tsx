import { CaptureChannel } from '../data/seedData';
import { Mic, Camera, QrCode, PenLine, MessageSquare } from 'lucide-react';

export function CaptureSourceIcon({ source, size = 16, className = '' }: { source: CaptureChannel, size?: number, className?: string }) {
  const props = { size, className: `text-muted-foreground ${className}` };
  
  switch (source) {
    case 'voice': return <Mic {...props} />;
    case 'receipt': return <Camera {...props} />;
    case 'qr': return <QrCode {...props} />;
    case 'sms': return <MessageSquare {...props} />;
    case 'manual': return <PenLine {...props} />;
    default: return null;
  }
}
