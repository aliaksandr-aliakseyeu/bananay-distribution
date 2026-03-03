'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { RequireDcAuth } from '@/components/auth/require-dc-auth';
import { BackButton } from '@/components/ui/back-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import { Button } from '@/components/ui/button';
import { DcQrScanDialog } from '@/components/dc/dc-qr-scan-dialog';
import { dcApi, type DcReceivingOrder } from '@/lib/api/dc';
import { CheckCircle2, PackageCheck, QrCode, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/routing';

const ITEMS_PER_PAGE = 2;

type ReceivingScanEntry = {
  delivery_order_item_point_id: number;
  qr_token: string;
  sku_name: string | null;
  delivery_point_name: string | null;
  quantity: number | null;
  scanned_at: string;
  is_idempotent: boolean;
};

export default function DcReceivingPage() {
  const t = useTranslations('DcReceiving');
  const [orders, setOrders] = useState<DcReceivingOrder[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<{
    orderLabel: string;
    expected: number;
    received: number;
    scans: ReceivingScanEntry[];
  } | null>(null);
  const [sessionScans, setSessionScans] = useState<ReceivingScanEntry[]>([]);
  const loadInFlightRef = useRef(false);

  const load = async (silent = false) => {
    if (loadInFlightRef.current) {
      return;
    }
    loadInFlightRef.current = true;
    try {
      if (!silent) setIsLoading(true);
      setError(null);
      const rows = await dcApi.getReceivingOrders();
      setOrders(rows);
      if (activeOrderId && !rows.some((o) => o.order_id === activeOrderId)) {
        setActiveOrderId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorLoading'));
    } finally {
      loadInFlightRef.current = false;
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial page load.
    void load();
  }, []);

  useEffect(() => {
    // While a specific order is actively processed or summary is open, avoid list polling.
    if (activeOrderId !== null || completedSummary !== null) {
      return;
    }
    const timer = window.setInterval(() => {
      void load(true);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [activeOrderId, completedSummary]);

  const refresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const activeOrder = useMemo(
    () => orders.find((o) => o.order_id === activeOrderId) ?? null,
    [orders, activeOrderId]
  );
  const isOrderContextOpen = activeOrderId !== null || completedSummary !== null;
  const headerSubtitle = activeOrder
    ? t('subtitleActiveOrder', { order: String(activeOrder.order_number ?? activeOrder.order_id) })
    : t('subtitle');
  const totalPages = Math.max(1, Math.ceil(orders.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedOrders = useMemo(
    () => orders.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE),
    [orders, safeCurrentPage]
  );
  const showingFrom = orders.length === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1;
  const showingTo = Math.min(safeCurrentPage * ITEMS_PER_PAGE, orders.length);

  const formatQrToken = (token: string) => {
    if (token.length <= 16) return token;
    return `${token.slice(0, 8)}...${token.slice(-6)}`;
  };

  const renderScansTable = (rows: ReceivingScanEntry[]) => (
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-1 pr-3">{t('table.actor')}</th>
            <th className="py-1 pr-3">{t('table.sku')}</th>
            <th className="py-1 pr-3">{t('table.destination')}</th>
            <th className="py-1 pr-3">{t('table.quantity')}</th>
            <th className="py-1 pr-3">{t('table.qr')}</th>
            <th className="py-1">{t('table.scannedAt')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((scan, idx) => (
            <tr
              key={`${scan.delivery_order_item_point_id}-${scan.qr_token}-${idx}`}
              className="border-t border-gray-100 text-gray-700"
            >
              <td className="py-2 pr-3">{t('actorCurrentUser')}</td>
              <td className="py-2 pr-3">{scan.sku_name ?? t('unknownSku')}</td>
              <td className="py-2 pr-3">{scan.delivery_point_name ?? t('unknownPoint')}</td>
              <td className="py-2 pr-3">{scan.quantity ?? 0}</td>
              <td className="py-2 pr-3 font-mono text-xs">{formatQrToken(scan.qr_token)}</td>
              <td className="py-2">
                {new Date(scan.scanned_at).toLocaleString()}
                {scan.is_idempotent ? ` · ${t('scannedIdempotent')}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const openOrder = (order: DcReceivingOrder) => {
    setCompletedSummary(null);
    setSessionScans([]);
    setActiveOrderId(order.order_id);
  };

  const goBackToReceivingList = () => {
    if (activeOrderId !== null) {
      // Keep behavior identical to "Close receiving": no reload, only local state switch.
      setScanOpen(false);
      setActiveOrderId(null);
      return;
    }
    if (completedSummary !== null) {
      setCompletedSummary(null);
      return;
    }
  };

  const handleScan = async (qrToken: string) => {
    if (!activeOrderId) return;
    setIsScanning(true);
    try {
      const currentOrder = orders.find((o) => o.order_id === activeOrderId) ?? null;
      const res = await dcApi.scanReceiveForOrder(activeOrderId, qrToken);
      const scanEntry: ReceivingScanEntry = {
        delivery_order_item_point_id: res.delivery_order_item_point_id,
        qr_token: String(res.qr_token),
        sku_name: res.sku_name,
        delivery_point_name: res.delivery_point_name,
        quantity: res.quantity,
        scanned_at: res.scanned_at,
        is_idempotent: res.is_idempotent,
      };
      const nextScans = [scanEntry, ...sessionScans];
      setSessionScans(nextScans);
      setOrders((prev) =>
        prev
          .map((o) =>
            o.order_id === activeOrderId
              ? {
                  ...o,
                  expected_count: res.expected_count,
                  received_count: res.received_count,
                  remaining_count: res.remaining_count,
                }
              : o
          )
          .filter((o) => o.remaining_count > 0)
      );
      if (res.remaining_count <= 0) {
        toast.success(t('orderCompleted'));
        setScanOpen(false);
        setCompletedSummary({
          orderLabel: String(currentOrder?.order_number ?? currentOrder?.order_id ?? res.order_id),
          expected: res.expected_count,
          received: res.received_count,
          scans: nextScans,
        });
        setActiveOrderId(null);
      } else {
        toast.success(
          t('scanSuccessProgress', {
            received: String(res.received_count),
            expected: String(res.expected_count),
          })
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('scanError'));
      throw err;
    } finally {
      setIsScanning(false);
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
              {isOrderContextOpen ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={goBackToReceivingList}
                  className="min-w-0 bg-white border border-gray-200 text-gray-900 shadow-sm rounded-lg hover:bg-gray-50 hover:border-gray-300 focus-visible:ring-gray-400"
                >
                  <svg
                    className="mr-2 h-5 w-5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t('back').replace(/^\s*←\s*/, '').trim()}
                </Button>
              ) : (
                <BackButton href="/dashboard">{t('back')}</BackButton>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                <p className="text-sm text-gray-600 mt-1">{headerSubtitle}</p>
              </div>
            </div>
            {activeOrderId === null && (
              <Button type="button" variant="outline" onClick={refresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </Button>
            )}
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>{t('error')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!error && !activeOrder && !completedSummary && orders.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <PackageCheck className="h-8 w-8 text-gray-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('emptyTitle')}</h2>
              <p className="text-gray-600">{t('emptyDescription')}</p>
            </div>
          )}

          {!error && !activeOrder && completedSummary && (
            <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t('completedTitle')}</h2>
              <p className="text-sm text-gray-700 mt-2">
                {t('completedDetails', {
                  order: completedSummary.orderLabel,
                  received: String(completedSummary.received),
                  expected: String(completedSummary.expected),
                })}
              </p>
              <p className="text-sm text-gray-700 mt-1">{t('completedNextStep')}</p>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-900">{t('scannedListTitle')}</h3>
                {completedSummary.scans.length === 0 ? (
                  <p className="text-sm text-gray-600">{t('scannedEmpty')}</p>
                ) : (
                  renderScansTable(completedSummary.scans)
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/dashboard/current">
                  <Button>{t('completedGoCurrent')}</Button>
                </Link>
                <Button variant="outline" onClick={() => setCompletedSummary(null)}>
                  {t('completedClose')}
                </Button>
              </div>
            </div>
          )}

          {!error && !activeOrder && orders.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">{t('pickOrderHint')}</p>
              {pagedOrders.map((order) => (
                <div
                  key={order.order_id}
                  className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {t('orderLabel')} {order.order_number ?? order.order_id}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {t('progress', {
                        received: String(order.received_count),
                        expected: String(order.expected_count),
                        remaining: String(order.remaining_count),
                      })}
                    </p>
                  </div>
                  <Button onClick={() => openOrder(order)}>
                    {t('openOrder')}
                  </Button>
                </div>
              ))}
              {orders.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="text-sm text-gray-600">
                    {t('showing')} {showingFrom} - {showingTo} {t('of')} {orders.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={safeCurrentPage === 1 || refreshing}
                    >
                      {t('previous')}
                    </Button>
                    <span className="text-sm text-gray-600 px-2">
                      {t('page')} {safeCurrentPage} {t('of')} {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={safeCurrentPage >= totalPages || refreshing}
                    >
                      {t('next')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!error && activeOrder && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-blue-100 p-5">
                <h2 className="font-semibold text-gray-900">
                  {t('activeOrderTitle', {
                    order: String(activeOrder.order_number ?? activeOrder.order_id),
                  })}
                </h2>
                <p className="text-sm text-gray-600 mt-2">
                  {t('progress', {
                    received: String(activeOrder.received_count),
                    expected: String(activeOrder.expected_count),
                    remaining: String(activeOrder.remaining_count),
                  })}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => setScanOpen(true)} disabled={isScanning}>
                    <QrCode className="h-4 w-4 mr-2" />
                    {t('scanButton')}
                  </Button>
                  <Button variant="outline" onClick={() => setActiveOrderId(null)}>
                    {t('closeOrder')}
                  </Button>
                </div>
                <div className="mt-4 bg-gray-50 rounded-md border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">{t('scannedListTitle')}</h3>
                  {sessionScans.length === 0 ? (
                    <p className="text-sm text-gray-600">{t('scannedEmpty')}</p>
                  ) : (
                    renderScansTable(sessionScans)
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-600 inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                {t('singleModeHint')}
              </div>
            </div>
          )}
        </div>
      </div>
      <DcQrScanDialog open={scanOpen} onOpenChange={setScanOpen} onScan={handleScan} />
    </RequireDcAuth>
  );
}
