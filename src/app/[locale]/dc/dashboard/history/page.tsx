'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { RequireDcAuth } from '@/components/auth/require-dc-auth';
import { BackButton } from '@/components/ui/back-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import { Button } from '@/components/ui/button';
import { dcApi, type DcDeliveredEvent, type DcHistoryEvent, type DcItemPhase } from '@/lib/api/dc';
import { RefreshCw, History, PackageCheck, ChevronDown, ChevronUp } from 'lucide-react';

type HistoryTab = 'received' | 'sentToSorting' | 'sorted' | 'issued' | 'delivered';
type DatePreset = 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'custom';
type SortOrder = 'newest' | 'oldest';
const ITEMS_PER_PAGE = 10;
const TAB_PHASE_MAP: Record<Exclude<HistoryTab, 'delivered'>, DcItemPhase> = {
  received: 'received_at_dc',
  sentToSorting: 'moved_to_sorting',
  sorted: 'sorted_to_zone',
  issued: 'handed_to_courier2',
};
const PHASE_STATUS_KEY: Record<DcItemPhase, 'receivedAtDc' | 'movedToSorting' | 'sortedToZone' | 'handedToCourier2'> =
  {
    received_at_dc: 'receivedAtDc',
    moved_to_sorting: 'movedToSorting',
    sorted_to_zone: 'sortedToZone',
    handed_to_courier2: 'handedToCourier2',
  };

type ReceivedOrderHistory = {
  order_id: number;
  order_number: string | null;
  accepted_count: number;
  last_scanned_at: string | null;
  total_quantity: number;
  items: DcHistoryEvent[];
};

export default function DcHistoryPage() {
  const t = useTranslations('DcHistory');
  const [activeTab, setActiveTab] = useState<HistoryTab>('received');
  const [searchQuery, setSearchQuery] = useState('');
  const [actorFilter, setActorFilter] = useState('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [itemsByTab, setItemsByTab] = useState<Record<HistoryTab, DcHistoryEvent[]>>({
    received: [],
    sentToSorting: [],
    sorted: [],
    issued: [],
    delivered: [],
  });
  const [deliveredItems, setDeliveredItems] = useState<DcDeliveredEvent[]>([]);
  const [currentPageByTab, setCurrentPageByTab] = useState<Record<HistoryTab, number>>({
    received: 1,
    sentToSorting: 1,
    sorted: 1,
    issued: 1,
    delivered: 1,
  });
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const [received, sentToSorting, sorted, issued, delivered] = await Promise.all([
        dcApi.getHistoryEvents(TAB_PHASE_MAP.received),
        dcApi.getHistoryEvents(TAB_PHASE_MAP.sentToSorting),
        dcApi.getHistoryEvents(TAB_PHASE_MAP.sorted),
        dcApi.getHistoryEvents(TAB_PHASE_MAP.issued),
        dcApi.getHistoryDelivered(),
      ]);
      const sortByScannedAtDesc = (rows: DcHistoryEvent[]) =>
        rows.sort((a, b) => new Date(b.scanned_at || 0).getTime() - new Date(a.scanned_at || 0).getTime());
      setItemsByTab({
        received: sortByScannedAtDesc(received),
        sentToSorting: sortByScannedAtDesc(sentToSorting),
        sorted: sortByScannedAtDesc(sorted),
        issued: sortByScannedAtDesc(issued),
        delivered: [],
      });
      setDeliveredItems(
        delivered.sort(
          (a, b) => new Date(b.delivered_at || 0).getTime() - new Date(a.delivered_at || 0).getTime()
        )
      );
      setExpandedOrders({});
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const actorOptions = useMemo(() => {
    const names = new Set<string>();
    if (activeTab === 'delivered') {
      for (const item of deliveredItems) {
        const name = (item.courier_name || '').trim();
        if (name) names.add(name);
      }
    } else {
      for (const item of itemsByTab[activeTab]) {
        const name = (item.actor_name || '').trim();
        if (name) names.add(name);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [itemsByTab, activeTab, deliveredItems]);

  const matchesDatePreset = (dateMs: number) => {
    if (datePreset === 'all') return true;
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (datePreset === 'today') return dateMs >= startToday;
    if (datePreset === 'yesterday') {
      const startYesterday = startToday - 24 * 60 * 60 * 1000;
      return dateMs >= startYesterday && dateMs < startToday;
    }
    if (datePreset === '7d') return dateMs >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
    if (datePreset === '30d') return dateMs >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
    return true;
  };

  const matchesCustomDateRange = (dateMs: number) => {
    if (datePreset !== 'custom') return true;
    const fromMs = dateFrom
      ? new Date(new Date(dateFrom).getFullYear(), new Date(dateFrom).getMonth(), new Date(dateFrom).getDate()).getTime()
      : null;
    const toMs = dateTo
      ? new Date(
          new Date(dateTo).getFullYear(),
          new Date(dateTo).getMonth(),
          new Date(dateTo).getDate(),
          23,
          59,
          59,
          999
        ).getTime()
      : null;
    if (fromMs !== null && dateMs < fromMs) return false;
    if (toMs !== null && dateMs > toMs) return false;
    return true;
  };

  const matchesEventFilters = (item: DcHistoryEvent) => {
    const scannedAtMs = new Date(item.scanned_at || 0).getTime();
    if (!Number.isFinite(scannedAtMs)) return false;

    const actorName = (item.actor_name || '').trim();
    if (actorFilter !== 'all' && actorName !== actorFilter) return false;
    if (!matchesDatePreset(scannedAtMs)) return false;
    if (!matchesCustomDateRange(scannedAtMs)) return false;

    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const haystack = [
      item.order_number ?? String(item.order_id),
      item.qr_token,
      item.sku_name ?? '',
      item.delivery_point_name ?? '',
      actorName,
      item.phase,
      String(item.quantity ?? ''),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  };

  const matchesDeliveredFilters = (item: DcDeliveredEvent) => {
    const deliveredAtMs = new Date(item.delivered_at || 0).getTime();
    if (!Number.isFinite(deliveredAtMs)) return false;

    const courierName = (item.courier_name || '').trim();
    if (actorFilter !== 'all' && courierName !== actorFilter) return false;
    if (!matchesDatePreset(deliveredAtMs)) return false;
    if (!matchesCustomDateRange(deliveredAtMs)) return false;

    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const haystack = [
      item.order_number ?? String(item.order_id),
      item.qr_token,
      item.sku_name ?? '',
      item.delivery_point_name ?? '',
      courierName,
      String(item.quantity ?? ''),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  };

  const receivedOrders = useMemo<ReceivedOrderHistory[]>(() => {
    const grouped: Record<number, ReceivedOrderHistory> = {};
    const filteredRows = itemsByTab.received.filter(matchesEventFilters);
    for (const item of filteredRows) {
      const existing = grouped[item.order_id];
      const itemUpdatedAtMs = new Date(item.scanned_at || 0).getTime();
      const existingUpdatedAtMs = new Date(existing?.last_scanned_at || 0).getTime();
      if (!existing) {
        grouped[item.order_id] = {
          order_id: item.order_id,
          order_number: item.order_number,
          accepted_count: 1,
          last_scanned_at: item.scanned_at,
          total_quantity: Number(item.quantity ?? 0),
          items: [item],
        };
      } else {
        existing.accepted_count += 1;
        existing.total_quantity += Number(item.quantity ?? 0);
        existing.items.push(item);
        if (itemUpdatedAtMs > existingUpdatedAtMs) {
          existing.last_scanned_at = item.scanned_at;
        }
      }
    }
    return Object.values(grouped).sort((a, b) => {
      const left = new Date(a.last_scanned_at || 0).getTime();
      const right = new Date(b.last_scanned_at || 0).getTime();
      return sortOrder === 'newest' ? right - left : left - right;
    });
  }, [itemsByTab.received, actorFilter, datePreset, dateFrom, dateTo, searchQuery, sortOrder]);
  const activeTabItems = useMemo(() => {
    if (activeTab === 'delivered') return [];
    const rows = itemsByTab[activeTab].filter(matchesEventFilters);
    return rows.sort((a, b) => {
      const left = new Date(a.scanned_at || 0).getTime();
      const right = new Date(b.scanned_at || 0).getTime();
      return sortOrder === 'newest' ? right - left : left - right;
    });
  }, [itemsByTab, activeTab, actorFilter, datePreset, dateFrom, dateTo, searchQuery, sortOrder]);

  const filteredDeliveredItems = useMemo(() => {
    const rows = deliveredItems.filter(matchesDeliveredFilters);
    return rows.sort((a, b) => {
      const left = new Date(a.delivered_at || 0).getTime();
      const right = new Date(b.delivered_at || 0).getTime();
      return sortOrder === 'newest' ? right - left : left - right;
    });
  }, [deliveredItems, actorFilter, datePreset, dateFrom, dateTo, searchQuery, sortOrder]);
  const baseTotalItems =
    activeTab === 'delivered'
      ? deliveredItems.length
      : activeTab === 'received'
        ? new Set(itemsByTab.received.map((row) => row.order_id)).size
        : itemsByTab[activeTab].length;
  const activeTotalItems =
    activeTab === 'delivered'
      ? filteredDeliveredItems.length
      : activeTab === 'received'
        ? receivedOrders.length
        : activeTabItems.length;
  const totalPages = Math.max(1, Math.ceil(activeTotalItems / ITEMS_PER_PAGE));
  const currentPage = Math.min(currentPageByTab[activeTab], totalPages);
  const showingFrom = activeTotalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const showingTo = Math.min(currentPage * ITEMS_PER_PAGE, activeTotalItems);
  const pagedReceivedOrders = useMemo(
    () => receivedOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [receivedOrders, currentPage]
  );
  const pagedActiveTabItems = useMemo(
    () => activeTabItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [activeTabItems, currentPage]
  );
  const pagedDeliveredItems = useMemo(
    () =>
      filteredDeliveredItems.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      ),
    [filteredDeliveredItems, currentPage]
  );
  useEffect(() => {
    setCurrentPageByTab((prev) => ({ ...prev, [activeTab]: 1 }));
  }, [activeTab, searchQuery, actorFilter, datePreset, dateFrom, dateTo, sortOrder]);

  const toggleOrder = (orderId: number) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const resolvedActorName = t('actorCurrentUser');
  const resetFilters = () => {
    setSearchQuery('');
    setActorFilter('all');
    setDatePreset('all');
    setDateFrom('');
    setDateTo('');
    setSortOrder('newest');
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
      <div className="w-full flex-1 flex flex-col min-h-0 bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col min-h-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex items-center gap-4">
              <BackButton href="/dashboard">{t('back')}</BackButton>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                <p className="text-sm text-gray-600 mt-1">{t('subtitle')}</p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </Button>
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
                  aria-selected={activeTab === 'received'}
                  onClick={() => setActiveTab('received')}
                  className={`-mb-px rounded-t-md border px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'received'
                      ? 'border-gray-300 border-b-white bg-white text-gray-900 shadow-sm'
                      : 'border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('tabs.received')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'sentToSorting'}
                  onClick={() => setActiveTab('sentToSorting')}
                  className={`-mb-px rounded-t-md border px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'sentToSorting'
                      ? 'border-gray-300 border-b-white bg-white text-gray-900 shadow-sm'
                      : 'border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('tabs.sentToSorting')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'sorted'}
                  onClick={() => setActiveTab('sorted')}
                  className={`-mb-px rounded-t-md border px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'sorted'
                      ? 'border-gray-300 border-b-white bg-white text-gray-900 shadow-sm'
                      : 'border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('tabs.sorted')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'issued'}
                  onClick={() => setActiveTab('issued')}
                  className={`-mb-px rounded-t-md border px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'issued'
                      ? 'border-gray-300 border-b-white bg-white text-gray-900 shadow-sm'
                      : 'border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('tabs.issued')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'delivered'}
                  onClick={() => setActiveTab('delivered')}
                  className={`-mb-px rounded-t-md border px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'delivered'
                      ? 'border-gray-300 border-b-white bg-white text-gray-900 shadow-sm'
                      : 'border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('tabs.delivered')}
                </button>
              </div>
            </div>
          </div>
          <div className="mb-6 rounded-b-lg border border-gray-300 border-t-0 bg-white p-4">
            {!error && (
              <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('filters.searchPlaceholder')}
                    className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-gray-400"
                  />
                  <select
                    value={actorFilter}
                    onChange={(e) => setActorFilter(e.target.value)}
                    className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-gray-400"
                  >
                    <option value="all">{t('filters.actorAll')}</option>
                    {actorOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={datePreset}
                    onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                    className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-gray-400"
                  >
                    <option value="all">{t('filters.dateAll')}</option>
                    <option value="today">{t('filters.dateToday')}</option>
                    <option value="yesterday">{t('filters.dateYesterday')}</option>
                    <option value="7d">{t('filters.date7d')}</option>
                    <option value="30d">{t('filters.date30d')}</option>
                    <option value="custom">{t('filters.dateCustom')}</option>
                  </select>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                    className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-gray-400"
                  >
                    <option value="newest">{t('filters.sortNewest')}</option>
                    <option value="oldest">{t('filters.sortOldest')}</option>
                  </select>
                  <Button type="button" variant="outline" onClick={resetFilters}>
                    {t('filters.reset')}
                  </Button>
                </div>
                {datePreset === 'custom' && (
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-gray-400"
                    />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-gray-400"
                    />
                  </div>
                )}
                <p className="mt-3 text-sm text-gray-600">
                  {t('filters.found', { filtered: String(activeTotalItems), total: String(baseTotalItems) })}
                </p>
              </div>
            )}
            {!error && activeTab === 'received' && receivedOrders.length === 0 && (
              <div className="rounded-lg p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <PackageCheck className="h-8 w-8 text-gray-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {baseTotalItems > 0 ? t('emptyFilteredTitle') : t('emptyReceivedTitle')}
                </h2>
                <p className="text-gray-600">
                  {baseTotalItems > 0 ? t('emptyFilteredDescription') : t('emptyReceivedDescription')}
                </p>
              </div>
            )}

            {!error && activeTab === 'received' && receivedOrders.length > 0 && (
              <div className="space-y-4">
                {pagedReceivedOrders.map((order) => (
                  <div key={order.order_id} className="rounded-lg border border-gray-200 p-5">
                    <button
                      type="button"
                      onClick={() => toggleOrder(order.order_id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="font-semibold text-gray-900">
                            {t('orderLabel')} {order.order_number ?? order.order_id}
                          </h2>
                          <p className="text-sm text-gray-600 mt-1">
                            {t('acceptedCount', { count: String(order.accepted_count) })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {t('acceptedQuantity', { count: String(order.total_quantity) })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {t('lastScanAt')} {order.last_scanned_at ? new Date(order.last_scanned_at).toLocaleString() : '—'}
                          </p>
                        </div>
                        {expandedOrders[order.order_id] ? (
                          <ChevronUp className="h-5 w-5 text-gray-500 mt-1" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500 mt-1" />
                        )}
                      </div>
                    </button>
                    {expandedOrders[order.order_id] && (
                      <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
                        <p className="text-xs text-gray-500">{t('receivedTabHint')}</p>
                        <div className="overflow-x-auto">
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
                              {order.items.map((item) => (
                                <tr key={item.event_id} className="border-t border-gray-100 text-gray-700">
                                  <td className="py-2 pr-3">{item.actor_name ?? resolvedActorName}</td>
                                  <td className="py-2 pr-3">{item.sku_name ?? t('unknownSku')}</td>
                                  <td className="py-2 pr-3">{item.delivery_point_name ?? t('unknownPoint')}</td>
                                  <td className="py-2 pr-3">{item.quantity ?? 0}</td>
                                  <td className="py-2 pr-3 font-mono text-xs">
                                    {item.qr_token.slice(0, 8)}...{item.qr_token.slice(-6)}
                                  </td>
                                  <td className="py-2">
                                    {item.scanned_at ? new Date(item.scanned_at).toLocaleString() : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!error && activeTab === 'delivered' && filteredDeliveredItems.length === 0 && (
              <div className="rounded-lg p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <History className="h-8 w-8 text-gray-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {baseTotalItems > 0 ? t('emptyFilteredTitle') : t('emptyDeliveredTitle')}
                </h2>
                <p className="text-gray-600">
                  {baseTotalItems > 0 ? t('emptyFilteredDescription') : t('emptyDeliveredDescription')}
                </p>
              </div>
            )}

            {!error && activeTab === 'delivered' && filteredDeliveredItems.length > 0 && (
              <div className="space-y-3">
                {pagedDeliveredItems.map((item) => (
                  <div
                    key={item.task_id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h2 className="font-semibold text-gray-900">
                        {t('pointLabel')} {item.qr_token.slice(0, 8)}...{item.qr_token.slice(-6)}
                      </h2>
                      <span className="text-xs text-green-700 bg-green-50 rounded-full px-2.5 py-1">
                        {t('phaseStatus.delivered')}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      <p>
                        {t('table.deliveredBy')}: {item.courier_name ?? t('unknownCourier')}
                      </p>
                      <p>
                        {t('orderLabel')} {item.order_number ?? item.order_id}
                      </p>
                      <p>{item.sku_name ?? t('unknownSku')}</p>
                      <p>{item.delivery_point_name ?? t('unknownPoint')}</p>
                      <p>{t('table.quantity')}: {item.quantity ?? 0}</p>
                      <p>
                        {t('table.deliveredAt')}: {item.delivered_at ? new Date(item.delivered_at).toLocaleString() : '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!error && activeTab !== 'received' && activeTab !== 'delivered' && activeTabItems.length === 0 && (
              <div className="rounded-lg p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <History className="h-8 w-8 text-gray-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {baseTotalItems > 0 ? t('emptyFilteredTitle') : t('emptyStageTitle')}
                </h2>
                <p className="text-gray-600">
                  {baseTotalItems > 0 ? t('emptyFilteredDescription') : t('emptyStageDescription')}
                </p>
              </div>
            )}

            {!error && activeTab !== 'received' && activeTab !== 'delivered' && activeTabItems.length > 0 && (
              <div className="space-y-3">
                {pagedActiveTabItems.map((item) => (
                  <div
                    key={item.event_id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h2 className="font-semibold text-gray-900">
                        {t('pointLabel')} {item.qr_token.slice(0, 8)}...{item.qr_token.slice(-6)}
                      </h2>
                      <span className="text-xs text-blue-700 bg-blue-50 rounded-full px-2.5 py-1">
                        {t(`phaseStatus.${PHASE_STATUS_KEY[item.phase]}`)}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      <p>
                        {t('table.actor')}: {item.actor_name ?? resolvedActorName}
                      </p>
                      <p>
                        {t('orderLabel')} {item.order_number ?? item.order_id}
                      </p>
                      <p>{item.sku_name ?? t('unknownSku')}</p>
                      <p>{item.delivery_point_name ?? t('unknownPoint')}</p>
                      <p>{t('table.quantity')}: {item.quantity ?? 0}</p>
                      <p>
                        {t('table.scannedAt')}: {item.scanned_at ? new Date(item.scanned_at).toLocaleString() : '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!error && activeTotalItems > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between border-t pt-4 mt-6">
                <div className="text-sm text-gray-600">
                  {t('showing')} {showingFrom} - {showingTo} {t('of')} {activeTotalItems}
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
                  <span className="text-sm text-gray-600 px-2">
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
    </RequireDcAuth>
  );
}
