'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { RequireDcAuth } from '@/components/auth/require-dc-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { DcQrScanDialog } from '@/components/dc/dc-qr-scan-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { dcApi, type DcBox, type DcProfile } from '@/lib/api/dc';
import { getAllowedActions, type DcActionOption } from '@/lib/dc-phase';
import { CourierHandoverDialog } from '@/components/dc/courier-handover-dialog';
import { Package, History, User, RefreshCw, PackageCheck, QrCode } from 'lucide-react';
import { toast } from 'sonner';

const PHASE_STATUS_KEY = {
  received_at_dc: 'receivedAtDc',
  moved_to_sorting: 'movedToSorting',
  sorted_to_zone: 'sortedToZone',
  handed_to_courier2: 'handedToCourier2',
} as const;

export default function DcDashboardPage() {
  const t = useTranslations('DcDashboard');
  const tCurrent = useTranslations('DcCurrent');
  const [profile, setProfile] = useState<DcProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<{ item: DcBox; action: DcActionOption } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [handoverQr, setHandoverQr] = useState<string | null>(null);

  const load = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError(null);
      const me = await dcApi.getMe();
      setProfile(me);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorLoading'));
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const refreshStatus = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const formatQr = (token: string) =>
    token.length <= 16 ? token : `${token.slice(0, 8)}...${token.slice(-6)}`;

  const handleScanOnMain = async (qrToken: string) => {
    const rows = await dcApi.getBoxes();
    const item = rows.find((r) => r.qr_token.toLowerCase() === qrToken.toLowerCase());
    if (!item) {
      toast.error(t('smartScanNotFound'));
      return;
    }
    const allowed = getAllowedActions(item);
    if (allowed.length === 0) {
      toast.error(t('smartScanNoNextAction'));
      return;
    }
    const action = allowed[0];
    setScanOpen(false);
    // Courier handover → show courier info dialog instead of generic confirm
    if (action.key === 'scanHandoverCourier2') {
      setHandoverQr(item.qr_token);
      return;
    }
    setPending({ item, action });
    setConfirmOpen(true);
  };

  const confirmTransition = async () => {
    if (!pending) return;
    setSubmitting(true);
    try {
      if (pending.action.key === 'scanMoveToSorting') {
        await dcApi.scanMoveToSorting(pending.item.qr_token);
      } else if (pending.action.key === 'scanSortToZone') {
        await dcApi.scanSortToZone(pending.item.qr_token);
      } else {
        await dcApi.scanReceive(pending.item.qr_token);
      }
      toast.success(t('smartScanTransitionDone'));
      setConfirmOpen(false);
      setPending(null);
      setScanOpen(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('smartScanTransitionError');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <RequireDcAuth>
        <PageLoading fullPage />
      </RequireDcAuth>
    );
  }

  const needsProfile = !profile?.first_name || !profile?.last_name || profile?.status === 'draft';
  const hasAssignment = Boolean(profile?.distribution_center_id);

  return (
    <RequireDcAuth>
      <div className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-600 mt-2">{t('subtitle')}</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>{t('error')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!error && needsProfile && (
            <div className="bg-white rounded-lg border border-blue-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900">{t('onboardingTitle')}</h2>
              <p className="text-sm text-gray-600 mt-2">{t('onboardingDescription')}</p>
              <div className="mt-4">
                <Link
                  href="/dashboard/profile"
                  className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  {t('completeProfile')}
                </Link>
              </div>
            </div>
          )}

          {!error && !needsProfile && !hasAssignment && (
            <div className="bg-white rounded-lg border border-amber-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900">{t('awaitingTitle')}</h2>
              <p className="text-sm text-gray-600 mt-2">{t('awaitingDescription')}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={refreshStatus}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {t('refreshStatus')}
              </Button>
            </div>
          )}

          {!error && !needsProfile && hasAssignment && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="text-left bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer h-full"
              >
                <div className="mb-3">
                  <div className="w-12 h-12 rounded-lg bg-violet-100 flex items-center justify-center">
                    <QrCode className="h-6 w-6 text-violet-600" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('smartScanCard')}</h3>
                <p className="text-sm text-gray-600">{t('smartScanCardDescription')}</p>
              </button>
              <Link href="/dashboard/receiving">
                <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="mb-3">
                    <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <PackageCheck className="h-6 w-6 text-indigo-600" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('receivingCard')}</h3>
                  <p className="text-sm text-gray-600">{t('receivingCardDescription')}</p>
                </div>
              </Link>

              <Link href="/dashboard/current">
                <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="mb-3">
                    <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Package className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('currentCard')}</h3>
                  <p className="text-sm text-gray-600">{t('currentCardDescription')}</p>
                </div>
              </Link>

              <Link href="/dashboard/history">
                <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="mb-3">
                    <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                      <History className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('historyCard')}</h3>
                  <p className="text-sm text-gray-600">{t('historyCardDescription')}</p>
                </div>
              </Link>

              <Link href="/dashboard/profile">
                <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="mb-3">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('profileCard')}</h3>
                  <p className="text-sm text-gray-600">{t('profileCardDescription')}</p>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
      <DcQrScanDialog open={scanOpen} onOpenChange={setScanOpen} onScan={handleScanOnMain} />
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setPending(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('smartScanConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('smartScanConfirmDescription')}</DialogDescription>
          </DialogHeader>
          {pending && (
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-medium">{t('smartScanQr')}:</span> {formatQr(pending.item.qr_token)}
              </p>
              <p>
                <span className="font-medium">{t('smartScanQrFull')}:</span> {pending.item.qr_token}
              </p>
              <p>
                <span className="font-medium">{t('smartScanOrder')}:</span>{' '}
                {pending.item.order_number ?? pending.item.order_id}
              </p>
              <p>
                <span className="font-medium">{t('smartScanSku')}:</span>{' '}
                {pending.item.sku_name ?? t('smartScanUnknownSku')}
              </p>
              <p>
                <span className="font-medium">{t('smartScanDestination')}:</span>{' '}
                {pending.item.delivery_point_name ?? t('smartScanUnknownPoint')}
              </p>
              <p>
                <span className="font-medium">{t('smartScanQuantity')}:</span> {pending.item.quantity ?? 0}
              </p>
              <p>
                <span className="font-medium">{t('smartScanCurrentStatus')}:</span>{' '}
                {tCurrent(`phaseStatus.${PHASE_STATUS_KEY[pending.item.phase]}`)}
              </p>
              <p>
                <span className="font-medium">{t('smartScanNextAction')}:</span>{' '}
                {tCurrent(`actions.${pending.action.key}`)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              {t('smartScanCancel')}
            </Button>
            <Button onClick={confirmTransition} disabled={submitting || !pending}>
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  {t('smartScanConfirm')}
                </span>
              ) : (
                t('smartScanConfirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CourierHandoverDialog
        qrToken={handoverQr}
        onClose={() => setHandoverQr(null)}
        onSuccess={() => {
          toast.success(t('smartScanTransitionDone'));
          refreshStatus();
          setScanOpen(true);
        }}
      />
    </RequireDcAuth>
  );
}
