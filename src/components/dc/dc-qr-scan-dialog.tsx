'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseQrToken(data: string): string | null {
  const trimmed = data.trim();
  if (UUID_REGEX.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i
  );
  return match ? match[1] : trimmed || null;
}

interface DcQrScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (qrToken: string) => Promise<void>;
}

export function DcQrScanDialog({ open, onOpenChange, onScan }: DcQrScanDialogProps) {
  const t = useTranslations('DcCurrent.scan');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const submittingRef = useRef(false);
  const jsQrRef = useRef<typeof import('jsqr').default | null>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'submitting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [testToken, setTestToken] = useState('');
  const [testSubmitting, setTestSubmitting] = useState(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const stopCamera = useCallback(() => {
    if (animationRef.current != null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    submittingRef.current = false;
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setStatus('idle');
      setErrorMessage(null);
      jsQrRef.current = null;
      return;
    }
    return () => stopCamera();
  }, [open, stopCamera]);

  useEffect(() => {
    if (!open) return;
    setStatus('starting');
    setErrorMessage(null);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    import('jsqr').then((m) => {
      jsQrRef.current = m.default;
    });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        streamRef.current = stream;
        video.srcObject = stream;
        return video.play();
      })
      .then(() => {
        setStatus('scanning');
      })
      .catch(() => {
        setStatus('error');
        setErrorMessage(t('cameraDenied'));
      });

    let lastResult = '';
    const tick = () => {
      if (streamRef.current == null || submittingRef.current) {
        animationRef.current = requestAnimationFrame(tick);
        return;
      }
      if (video.readyState === video.HAVE_ENOUGH_DATA && jsQrRef.current) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQrRef.current(imageData.data, imageData.width, imageData.height);
        if (code && code.data !== lastResult) {
          lastResult = code.data;
          const token = parseQrToken(code.data);
          if (token) {
            submittingRef.current = true;
            setStatus('submitting');
            onScanRef.current(token)
              .then(() => {
                lastResult = '';
                submittingRef.current = false;
                setStatus('scanning');
              })
              .catch(() => {
                lastResult = '';
                submittingRef.current = false;
                setStatus('scanning');
              });
          }
        }
      }
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
    };
  }, [open, t]);

  const handleClose = () => {
    stopCamera();
    onOpenChange(false);
  };

  const handleTestScan = async () => {
    const token = parseQrToken(testToken);
    if (!token) return;
    setTestSubmitting(true);
    try {
      await onScan(token);
      setTestToken('');
    } finally {
      setTestSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">{t('hint')}</DialogDescription>
        </DialogHeader>
        <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          {(status === 'starting' || status === 'submitting') && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Spinner className="h-10 w-10 text-white" />
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 text-center text-white text-sm">
              {errorMessage}
            </div>
          )}
        </div>
        <div className="border-t border-gray-200 pt-4 mt-2 space-y-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('testTitle')}</p>
          <p className="text-sm text-gray-600">{t('testHint')}</p>
          <div className="flex gap-2">
            <Input
              value={testToken}
              onChange={(e) => setTestToken(e.target.value)}
              placeholder={t('testPlaceholder')}
              className="flex-1 font-mono text-sm"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleTestScan}
              disabled={testSubmitting || !parseQrToken(testToken)}
            >
              {testSubmitting ? <Spinner className="h-4 w-4" /> : t('testSubmit')}
            </Button>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose}>
            {t('close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
