'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { RequireDcAuth } from '@/components/auth/require-dc-auth';
import { BackButton } from '@/components/ui/back-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import { Button } from '@/components/ui/button';
import { DcQrScanDialog } from '@/components/dc/dc-qr-scan-dialog';
import { dcApi, type DcBox, type DcItemPhase } from '@/lib/api/dc';
import { getAllowedActions, type DcActionKey } from '@/lib/dc-phase';
import { CourierHandoverDialog } from '@/components/dc/courier-handover-dialog';
import { Package, RefreshCw, QrCode } from 'lucide-react';
import { toast } from 'sonner';

function isCompleted(box: DcBox): boolean {
  return box.phase === 'handed_to_courier2' && getAllowedActions(box).length === 0;
}

type CurrentQueueTab = 'toMoveToSorting' | 'toAddressSorting' | 'toHandoverCourier2';
const ITEMS_PER_PAGE = 2;

const TAB_PHASE_MAP: Record<CurrentQueueTab, DcItemPhase> = {
  toMoveToSorting: 'received_at_dc',
  toAddressSorting: 'moved_to_sorting',
  toHandoverCourier2: 'sorted_to_zone',
};
const TAB_ACTION_KEY_MAP: Record<CurrentQueueTab, DcActionKey> = {
  toMoveToSorting: 'scanMoveToSorting',
  toAddressSorting: 'scanSortToZone',
  toHandoverCourier2: 'scanHandoverCourier2',
};

const PHASE_STATUS_KEY: Record<DcItemPhase, 'receivedAtDc' | 'movedToSorting' | 'sortedToZone' | 'handedToCourier2'> =
  {
    received_at_dc: 'receivedAtDc',
    moved_to_sorting: 'movedToSorting',
    sorted_to_zone: 'sortedToZone',
    handed_to_courier2: 'handedToCourier2',
  };

export default function DcCurrentPage() {
  const t = useTranslations('DcCurrent');
  const [activeTab, setActiveTab] = useState<CurrentQueueTab>('toMoveToSorting');
  const [currentPageByTab, setCurrentPageByTab] = useState<Record<CurrentQueueTab, number>>({
    toMoveToSorting: 1,
    toAddressSorting: 1,
    toHandoverCourier2: 1,
  });
  const [items, setItems] = useState<DcBox[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanActionKey, setScanActionKey] = useState<DcActionKey | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [handoverQr, setHandoverQr] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const res = await dcApi.getBoxes();
      setItems(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const activeItems = useMemo(
    () => items.filter((i) => !isCompleted(i)).sort((a, b) => b.item_point_id - a.item_point_id),
    [items]
  );
  const filteredItems = useMemo(
    () => activeItems.filter((item) => item.phase === TAB_PHASE_MAP[activeTab]),
    [activeItems, activeTab]
  );
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(currentPageByTab[activeTab], totalPages);
  const showingFrom = filteredItems.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const showingTo = Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length);
  const pagedItems = useMemo(
    () => filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredItems, currentPage]
  );
  const activeTabActionKey = TAB_ACTION_KEY_MAP[activeTab];
  const formatQrToken = (token: string) => {
    if (!token) return '—';
    if (token.length <= 16) return token;
    return `${token.slice(0, 8)}...${token.slice(-6)}`;
  };

  const runScan = async (qrToken: string) => {
    if (!scanActionKey) return;
    // Courier handover → show courier info dialog, do NOT execute yet
    if (scanActionKey === 'scanHandoverCourier2') {
      setScanOpen(false);
      setHandoverQr(qrToken);
      return;
    }
    try {
      if (scanActionKey === 'scanMoveToSorting') {
        await dcApi.scanMoveToSorting(qrToken);
      } else {
        await dcApi.scanSortToZone(qrToken);
      }
      toast.success(t('scanSuccess'));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('scanError'));
      throw err;
    }
  };

  if (isLoading) {
    return (
      <RequireDcAuth>
        <PageLoading fullPage />
      </RequireDcAuth>
    );
  }

  return (
    <RequireDcAuth>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex items-center gap-4">
              <BackButton href="/dashboard">{t('back')}</BackButton>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                <p className="text-sm text-gray-600 mt-1">{t('subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:ml-auto">
              {!error && filteredItems.length > 0 && (
                <Button
                  type="button"
                  onClick={() => {
                    setScanActionKey(activeTabActionKey);
                    setScanOpen(true);
                  }}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  {t(`actions.${activeTabActionKey}`)}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={refresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>{t('error')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mb-0">
            <div className="overflow-x-auto">
              <div className="inline-flex min-w-max items-end border-b border-gray-300">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'toMoveToSorting'}
                  onClick={() => setActiveTab('toMoveToSorting')}
                  className={`-mb-px rounded-t-md border px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'toMoveToSorting'
                      ? 'border-gray-300 border-b-white bg-white text-gray-900 shadow-sm'
                      : 'border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('queueTabs.toMoveToSorting')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'toAddressSorting'}
                  onClick={() => setActiveTab('toAddressSorting')}
                  className={`-mb-px rounded-t-md border px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'toAddressSorting'
                      ? 'border-gray-300 border-b-white bg-white text-gray-900 shadow-sm'
                      : 'border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('queueTabs.toAddressSorting')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'toHandoverCourier2'}
                  onClick={() => setActiveTab('toHandoverCourier2')}
                  className={`-mb-px rounded-t-md border px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'toHandoverCourier2'
                      ? 'border-gray-300 border-b-white bg-white text-gray-900 shadow-sm'
                      : 'border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('queueTabs.toHandoverCourier2')}
                </button>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-b-lg border border-gray-300 border-t-0 bg-white p-4">
            {!error && filteredItems.length === 0 && (
              <div className="rounded-lg p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('emptyTitle')}</h2>
                <p className="text-gray-600">{t('emptyDescription')}</p>
              </div>
            )}

            {!error && filteredItems.length > 0 && (
              <div className="space-y-4">
                {pagedItems.map((item) => {
                  return (
                    <div
                      key={`${item.qr_token}-${item.updated_at ?? 'no-time'}-${item.order_id}`}
                      className="rounded-lg border border-gray-200 p-5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h2 className="font-semibold text-gray-900">
                            {t('qrLabel', { qr: formatQrToken(item.qr_token) })}
                          </h2>
                          <p className="text-sm text-gray-600 mt-1">
                            {t('orderLabel')} {item.order_number ?? item.order_id}
                          </p>
                          <p className="text-sm text-gray-600">{item.delivery_point_name ?? t('unknownPoint')}</p>
                          <p className="text-sm text-gray-600">
                            {item.sku_name ?? t('unknownSku')} · {item.quantity ?? 0}
                          </p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                          {t('currentStatus')}: {t(`phaseStatus.${PHASE_STATUS_KEY[item.phase]}`)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!error && filteredItems.length > ITEMS_PER_PAGE && (
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <div className="text-sm text-gray-600">
                  {t('showing')} {showingFrom} - {showingTo} {t('of')} {filteredItems.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPageByTab((prev) => ({
                        ...prev,
                        [activeTab]: Math.max(1, currentPage - 1),
                      }))
                    }
                    disabled={currentPage === 1 || refreshing}
                  >
                    {t('previous')}
                  </Button>
                  <span className="px-2 text-sm text-gray-600">
                    {t('page')} {currentPage} {t('of')} {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPageByTab((prev) => ({
                        ...prev,
                        [activeTab]: Math.min(totalPages, currentPage + 1),
                      }))
                    }
                    disabled={currentPage >= totalPages || refreshing}
                  >
                    {t('next')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <DcQrScanDialog open={scanOpen} onOpenChange={setScanOpen} onScan={runScan} />
      <CourierHandoverDialog
        qrToken={handoverQr}
        onClose={() => setHandoverQr(null)}
        onSuccess={() => {
          toast.success(t('scanSuccess'));
          load();
        }}
      />
    </RequireDcAuth>
  );
}
