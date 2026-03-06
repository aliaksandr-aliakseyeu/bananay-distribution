'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { RequireDcAuth } from '@/components/auth/require-dc-auth';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { DcQrScanDialog } from '@/components/dc/dc-qr-scan-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { dcApi, type CourierHandoverInfo } from '@/lib/api/dc';
import { API_BASE_URL } from '@/lib/constants';
import { CheckCircle2, QrCode, Truck, User } from 'lucide-react';
import { toast } from 'sonner';

type Phase = 'idle' | 'confirm' | 'done';

function AuthedPhoto({ mediaId, className }: { mediaId: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  if (!src && !error) {
    const token = typeof window !== 'undefined'
      ? (() => {
          try {
            const raw = localStorage.getItem('dc-auth-storage');
            if (!raw) return null;
            const parsed = JSON.parse(raw) as { state?: { token?: string } };
            return parsed?.state?.token ?? null;
          } catch { return null; }
        })()
      : null;
    const url = `${API_BASE_URL}/api/v1/dc/media/${mediaId}`;
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.blob() : Promise.reject())
      .then(blob => setSrc(URL.createObjectURL(blob)))
      .catch(() => setError(true));
  }

  if (error || !mediaId) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-full ${className ?? 'w-16 h-16'}`}>
        <User className="w-8 h-8 text-gray-400" />
      </div>
    );
  }
  if (!src) {
    return <div className={`bg-gray-100 rounded-full animate-pulse ${className ?? 'w-16 h-16'}`} />;
  }
  return <img src={src} alt="courier" className={`object-cover rounded-full ${className ?? 'w-16 h-16'}`} />;
}

export default function CourierHandoverPage() {
  const t = useTranslations('CourierHandover');

  const [phase, setPhase] = useState<Phase>('idle');
  const [scanOpen, setScanOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [courierInfo, setCourierInfo] = useState<CourierHandoverInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (qrToken: string) => {
    setScanOpen(false);
    setLoading(true);
    setError(null);
    try {
      const info = await dcApi.getCourierInfoByQr(qrToken);
      setCourierInfo(info);
      setPhase('confirm');
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('errorNotFound');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!courierInfo) return;
    setConfirming(true);
    try {
      await dcApi.scanHandoverCourier2(courierInfo.qr_token);
      toast.success(t('successToast'));
      setPhase('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('errorHandover');
      toast.error(msg);
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => {
    setPhase('idle');
    setCourierInfo(null);
    setError(null);
  };

  return (
    <RequireDcAuth>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <BackButton href="/dashboard">{t('back')}</BackButton>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
              <p className="text-sm text-gray-600 mt-1">{t('subtitle')}</p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>{t('errorNotFound')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {phase === 'idle' && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                <QrCode className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('scanButton')}</h2>
              <p className="text-sm text-gray-500 mb-6">{t('subtitle')}</p>
              <Button onClick={() => setScanOpen(true)} disabled={loading} className="w-full sm:w-auto">
                <QrCode className="h-4 w-4 mr-2" />
                {loading ? t('scanning') : t('scanButton')}
              </Button>
            </div>
          )}

          {phase === 'done' && (
            <div className="bg-white rounded-xl border border-green-200 p-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('doneTitle')}</h2>
              <p className="text-sm text-gray-600 mb-6">{t('doneDescription')}</p>
              <Button onClick={reset} variant="outline">
                <QrCode className="h-4 w-4 mr-2" />
                {t('scanAnother')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <DcQrScanDialog open={scanOpen} onOpenChange={setScanOpen} onScan={handleScan} />

      <Dialog open={phase === 'confirm' && courierInfo != null} onOpenChange={(o) => { if (!o) reset(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('confirmTitle')}</DialogTitle>
            <DialogDescription>{t('confirmDescription')}</DialogDescription>
          </DialogHeader>

          {courierInfo && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <AuthedPhoto
                  mediaId={courierInfo.courier_photo_media_id ?? ''}
                  className="w-16 h-16"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <User className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-xs text-gray-500">{t('courierLabel')}</span>
                  </div>
                  <p className="font-semibold text-gray-900 truncate">
                    {courierInfo.courier_name || t('noName')}
                  </p>
                  <p className="text-sm text-gray-500">{courierInfo.courier_phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Truck className="h-5 w-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">{t('orderLabel')}</p>
                  <p className="font-medium text-gray-900">
                    {courierInfo.order_number ?? `#${courierInfo.order_id}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={reset} disabled={confirming}>
              {t('cancel')}
            </Button>
            <Button onClick={handleConfirm} disabled={confirming}>
              {confirming ? t('confirming') : t('confirmHandover')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RequireDcAuth>
  );
}
