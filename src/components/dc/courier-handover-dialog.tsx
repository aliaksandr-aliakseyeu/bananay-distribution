'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { User, Truck } from 'lucide-react';
import { dcApi, type CourierHandoverInfo } from '@/lib/api/dc';
import { API_BASE_URL } from '@/lib/constants';

function AuthedPhoto({ mediaId, className }: { mediaId: string | null; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!mediaId) { setTried(true); return; }
    const token = (() => {
      try {
        const raw = localStorage.getItem('dc-auth-storage');
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { state?: { token?: string } };
        return parsed?.state?.token ?? null;
      } catch { return null; }
    })();
    const url = `${API_BASE_URL}/api/v1/dc/media/${mediaId}`;
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.blob() : Promise.reject())
      .then(blob => setSrc(URL.createObjectURL(blob)))
      .catch(() => {})
      .finally(() => setTried(true));
  }, [mediaId]);

  if (!tried) {
    return <div className={`bg-gray-100 rounded-full animate-pulse ${className ?? 'w-16 h-16'}`} />;
  }
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-full ${className ?? 'w-16 h-16'}`}>
        <User className="w-7 h-7 text-gray-400" />
      </div>
    );
  }
  return <img src={src} alt="courier" className={`object-cover rounded-full ${className ?? 'w-16 h-16'}`} />;
}

interface CourierHandoverDialogProps {
  /** QR token of the box to hand over. Pass null to close. */
  qrToken: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CourierHandoverDialog({ qrToken, onClose, onSuccess }: CourierHandoverDialogProps) {
  const t = useTranslations('CourierHandover');
  const [info, setInfo] = useState<CourierHandoverInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!qrToken) { setInfo(null); setError(null); return; }
    setLoading(true);
    setError(null);
    dcApi.getCourierInfoByQr(qrToken)
      .then(setInfo)
      .catch(err => setError(err instanceof Error ? err.message : t('errorNotFound')))
      .finally(() => setLoading(false));
  }, [qrToken]);

  const handleConfirm = async () => {
    if (!qrToken) return;
    setConfirming(true);
    try {
      await dcApi.scanHandoverCourier2(qrToken);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorHandover'));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={qrToken != null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('confirmTitle')}</DialogTitle>
          <DialogDescription>{t('confirmDescription')}</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-6">
            <Spinner className="h-8 w-8 text-gray-400" />
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-red-600 py-2">{error}</p>
        )}

        {info && !loading && (
          <div className="space-y-3">
            {/* Courier card */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <AuthedPhoto mediaId={info.courier_photo_media_id} className="w-16 h-16 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">{t('courierLabel')}</p>
                <p className="font-semibold text-gray-900 truncate">
                  {info.courier_name || t('noName')}
                </p>
                <p className="text-sm text-gray-500">{info.courier_phone}</p>
              </div>
            </div>

            {/* Order card */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Truck className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">{t('orderLabel')}</p>
                <p className="font-medium text-gray-900">
                  {info.order_number ?? `#${info.order_id}`}
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={confirming}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirming || loading || !info}
          >
            {confirming ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                {t('confirming')}
              </span>
            ) : (
              t('confirmHandover')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
