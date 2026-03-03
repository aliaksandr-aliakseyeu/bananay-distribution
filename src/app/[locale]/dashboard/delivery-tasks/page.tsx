'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { RequireDriverAuth } from '@/components/auth/require-driver-auth';
import { BackButton } from '@/components/ui/back-button';
import { PageLoading } from '@/components/ui/page-loading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { deliveryTasksApi, type DriverDeliveryTask } from '@/lib/api/delivery-tasks';
import { driverApi } from '@/lib/api/driver';
import { dailyCheckInApi } from '@/lib/api/daily-checkin';
import { Package, MapPin, Building2, RefreshCw, Check, X, History, Camera, QrCode } from 'lucide-react';
import { TaskRouteMap } from '@/components/delivery-tasks/task-route-map';
import { QrScanDialog } from '@/components/delivery-tasks/qr-scan-dialog';
import { DriverMediaImage } from '@/components/vehicle/driver-media-image';
import { useDriverLocationReporting, useCurrentPosition } from '@/hooks/use-driver-location';
import { toast } from 'sonner';
import { Link, useRouter } from '@/i18n/routing';

type AccessCheck = 'loading' | 'allowed' | 'denied';

export default function DeliveryTasksPage() {
  const t = useTranslations('DeliveryTasks');
  const tDashboard = useTranslations('Dashboard');
  const tOnboarding = useTranslations('Onboarding');
  const router = useRouter();
  const [accessCheck, setAccessCheck] = useState<AccessCheck>('loading');
  const [tasks, setTasks] = useState<DriverDeliveryTask[]>([]);
  const [myTasks, setMyTasks] = useState<DriverDeliveryTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [takingId, setTakingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelConfirmTaskId, setCancelConfirmTaskId] = useState<number | null>(null);
  const [loadingActionId, setLoadingActionId] = useState<number | null>(null);
  const [departingId, setDepartingId] = useState<number | null>(null);
  const [unloadingKey, setUnloadingKey] = useState<string | null>(null);
  const [uploadingPhotoTaskId, setUploadingPhotoTaskId] = useState<number | null>(null);
  const loadingPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingUnloadKey, setUploadingUnloadKey] = useState<string | null>(null);
  const unloadPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const unloadPhotoTargetRef = useRef<{ taskId: number; dcId: number } | null>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [scanTaskId, setScanTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const myTasksSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await driverApi.getMe();
        if (me.status !== 'active') {
          if (!cancelled) setAccessCheck('allowed');
          return;
        }
        const checkinStatus = await dailyCheckInApi.getTodayStatus();
        if (checkinStatus.checkin?.status !== 'approved') {
          if (!cancelled) {
            setAccessCheck('denied');
            toast.error(tDashboard('deliveryTasksRequireCheckIn'));
            router.replace('/dashboard');
          }
          return;
        }
        if (!cancelled) setAccessCheck('allowed');
      } catch {
        if (!cancelled) setAccessCheck('allowed');
      }
    })();
    return () => { cancelled = true; };
  }, [router, tDashboard]);

  const load = async () => {
    try {
      setError(null);
      const [available, assigned] = await Promise.all([
        deliveryTasksApi.getTasks(),
        deliveryTasksApi.getMyTasks(),
      ]);
      setTasks(available);
      setMyTasks(assigned);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errorLoading'));
      setTasks([]);
      setMyTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessCheck === 'allowed') load();
  }, [accessCheck]);

  const handleTake = async (taskId: number) => {
    setTakingId(taskId);
    try {
      await deliveryTasksApi.takeTask(taskId);
      setTasks((prev) => prev.filter((t) => t.task_id !== taskId));
      await load();
      toast.success(t('takeSuccess'));
      myTasksSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err: unknown) {
      toast.error(t('takeError'));
    } finally {
      setTakingId(null);
    }
  };

  const canCancelTask = (task: DriverDeliveryTask) => {
    const s = task.status?.toLowerCase();
    return s === 'assigned' || s === 'loading';
  };

  const taskStatusLabel = (task: DriverDeliveryTask) => {
    const s = task.status?.toLowerCase();
    if (s === 'assigned') return t('assigned');
    if (s === 'loading') return t('statusLoading');
    if (s === 'in_transit' || s === 'partially_delivered') return t('statusInTransit');
    if (s === 'delivered') return t('statusDelivered');
    return task.status ?? '';
  };

  const handleStartLoading = async (taskId: number) => {
    setLoadingActionId(taskId);
    try {
      await deliveryTasksApi.startLoading(taskId);
      await load();
      toast.success(t('startLoadingSuccess'));
    } catch {
      toast.error(t('startLoadingError'));
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleDepart = async (taskId: number) => {
    setDepartingId(taskId);
    try {
      await deliveryTasksApi.depart(taskId);
      await load();
      toast.success(t('departSuccess'));
    } catch {
      toast.error(t('departError'));
    } finally {
      setDepartingId(null);
    }
  };

  const handleScan = async (qrToken: string) => {
    if (scanTaskId == null) return;
    try {
      const res = await deliveryTasksApi.submitScan(scanTaskId, qrToken);
      setMyTasks((prev) =>
        prev.map((t) =>
          t.task_id === scanTaskId
            ? { ...t, loading_expected_count: res.loading_expected_count, loading_scanned_count: res.loading_scanned_count }
            : t
        )
      );
      toast.success(t('scanSuccess'));
    } catch {
      toast.error(t('scanError'));
    }
  };

  const handleUnload = async (taskId: number, dcId: number) => {
    const key = `${taskId}-${dcId}`;
    setUnloadingKey(key);
    try {
      await deliveryTasksApi.unloadAtDc(taskId, dcId);
      await load();
      toast.success(t('unloadSuccess'));
    } catch {
      toast.error(t('unloadError'));
    } finally {
      setUnloadingKey(null);
    }
  };

  const allDcsDelivered = (task: DriverDeliveryTask) =>
    (task.deliveries?.length ?? 0) > 0 &&
    task.deliveries.every((d) => d.status?.toLowerCase() === 'delivered');
  const canCompleteTask = (task: DriverDeliveryTask) =>
    allDcsDelivered(task) && task.status?.toLowerCase() !== 'delivered';

  const handleCompleteTask = async (taskId: number) => {
    setCompletingId(taskId);
    try {
      await deliveryTasksApi.completeTask(taskId);
      await load();
      toast.success(t('completeSuccess'));
    } catch {
      toast.error(t('completeError'));
    } finally {
      setCompletingId(null);
    }
  };

  const handleUploadLoadingPhoto = async (taskId: number, file: File) => {
    setUploadingPhotoTaskId(taskId);
    try {
      const updated = await deliveryTasksApi.uploadLoadingPhoto(taskId, file);
      setMyTasks((prev) =>
        prev.map((t) => (t.task_id === taskId ? updated : t))
      );
      toast.success(t('loadingPhotoUploaded'));
    } catch {
      toast.error(t('loadingPhotoError'));
    } finally {
      setUploadingPhotoTaskId(null);
      if (loadingPhotoInputRef.current) loadingPhotoInputRef.current.value = '';
    }
  };

  const handleUploadUnloadPhoto = async (
    taskId: number,
    dcId: number,
    file: File
  ) => {
    const key = `${taskId}-${dcId}`;
    setUploadingUnloadKey(key);
    try {
      const updated = await deliveryTasksApi.uploadUnloadPhoto(taskId, dcId, file);
      setMyTasks((prev) =>
        prev.map((t) => (t.task_id === taskId ? updated : t))
      );
      toast.success(t('loadingPhotoUploaded'));
    } catch {
      toast.error(t('loadingPhotoError'));
    } finally {
      setUploadingUnloadKey(null);
      unloadPhotoTargetRef.current = null;
      if (unloadPhotoInputRef.current) unloadPhotoInputRef.current.value = '';
    }
  };

  const handleCancelClick = (taskId: number) => {
    setCancelConfirmTaskId(taskId);
  };

  const handleCancelConfirm = async () => {
    if (cancelConfirmTaskId == null) return;
    const taskId = cancelConfirmTaskId;
    setCancelConfirmTaskId(null);
    setCancellingId(taskId);
    try {
      await deliveryTasksApi.cancelTask(taskId);
      await load();
      toast.success(t('cancelSuccess'));
    } catch (err: unknown) {
      toast.error(t('cancelError'));
    } finally {
      setCancellingId(null);
    }
  };

  const myTaskIds = myTasks.map((t) => t.task_id);
  const { position: reportedPosition } = useDriverLocationReporting(myTaskIds);
  const { position: currentPosition } = useCurrentPosition();
  const driverPosition = reportedPosition ?? currentPosition ?? undefined;

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const [available, assigned] = await Promise.all([
        deliveryTasksApi.getTasks(),
        deliveryTasksApi.getMyTasks(),
      ]);
      setTasks(available);
      setMyTasks(assigned);
      toast.success(t('refreshed'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  const warehouseCoords = (lat: number, lon: number) =>
    `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

  if (accessCheck === 'loading' || accessCheck === 'denied' || isLoading) {
    return (
      <RequireDriverAuth>
        <PageLoading fullPage />
      </RequireDriverAuth>
    );
  }

  return (
    <RequireDriverAuth>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={(el) => {
          unloadPhotoInputRef.current = el;
        }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          const target = unloadPhotoTargetRef.current;
          if (f && target)
            handleUploadUnloadPhoto(target.taskId, target.dcId, f);
        }}
      />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-6">
            <div className="flex items-center gap-4">
              <BackButton href="/dashboard">{tOnboarding('back')}</BackButton>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {t('title')}
                </h1>
                <p className="text-sm text-gray-600 mt-1">{t('subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/delivery-tasks/history"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <History className="h-4 w-4" />
                {t('historyTitle')}
              </Link>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>{t('error')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!error && myTasks.length === 0 && tasks.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {t('noTasks')}
              </h2>
              <p className="text-gray-600">{t('noTasksDescription')}</p>
            </div>
          )}

          {!error && myTasks.length > 0 && (
            <div ref={myTasksSectionRef} className="space-y-4 mb-8">
              <h2 className="text-lg font-semibold text-gray-900">{t('myTasks')}</h2>
              <div className="space-y-4">
                {myTasks.map((task) => (
                  <div
                    key={`my-${task.task_id}`}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-100">
                            <Package className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 mr-2">
                              {taskStatusLabel(task)}
                            </span>
                            <h2 className="font-semibold text-gray-900">
                              {t('order')} {task.order_number}
                            </h2>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                              <MapPin className="h-4 w-4 shrink-0" />
                              <span>{t('pickupAt')}</span>
                              <code className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                                {warehouseCoords(task.warehouse_lat, task.warehouse_lon)}
                              </code>
                            </div>
                          </div>
                        </div>
                        {canCancelTask(task) && (
                          <button
                            type="button"
                            onClick={() => handleCancelClick(task.task_id)}
                            disabled={cancellingId === task.task_id}
                            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {cancellingId === task.task_id ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                {t('cancelling')}
                              </>
                            ) : (
                              <>
                                <X className="h-4 w-4" />
                                {t('cancel')}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="p-4 sm:p-5 border-b border-gray-100">
                      <TaskRouteMap
                        task={task}
                        warehouseLabel={t('warehouse')}
                        openInGoogleLabel={t('openInGoogle')}
                        openInYandexLabel={t('openInYandex')}
                        driverPosition={driverPosition ?? undefined}
                        driverLabel={t('driverMarker')}
                      />
                      {/* Warehouse: when assigned/loading — full block with buttons; when in transit + photo — only photo */}
                      {(task.status?.toLowerCase() === 'assigned' ||
                        task.status?.toLowerCase() === 'loading' ||
                        ((task.status?.toLowerCase() === 'in_transit' ||
                          task.status?.toLowerCase() === 'partially_delivered') &&
                          task.loading_photo_media_id)) && (
                        <div className="pt-3 mt-3 border-t border-gray-100">
                          {(task.status?.toLowerCase() === 'assigned' ||
                            task.status?.toLowerCase() === 'loading') && (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-medium text-gray-700">
                                {t('warehouse')}
                              </span>
                              <div className="flex items-center gap-2">
                                {task.status?.toLowerCase() === 'assigned' && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartLoading(task.task_id)}
                                    disabled={loadingActionId === task.task_id}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                                  >
                                    {loadingActionId === task.task_id ? (
                                      <>
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        {t('taking')}
                                      </>
                                    ) : (
                                      t('startLoading')
                                    )}
                                  </button>
                                )}
                                {task.status?.toLowerCase() === 'loading' && (
                                  <>
                                    {task.loading_expected_count != null &&
                                      task.loading_expected_count > 0 && (
                                      <span className="text-sm text-gray-600 w-full sm:w-auto">
                                        {t('scanProgress', {
                                          scanned: String(task.loading_scanned_count ?? 0),
                                          expected: String(task.loading_expected_count),
                                        })}
                                      </span>
                                    )}
                                    <input
                                      ref={(el) => {
                                        loadingPhotoInputRef.current = el;
                                      }}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleUploadLoadingPhoto(task.task_id, f);
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => loadingPhotoInputRef.current?.click()}
                                      disabled={uploadingPhotoTaskId === task.task_id}
                                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                                    >
                                      {uploadingPhotoTaskId === task.task_id ? (
                                        <>
                                          <RefreshCw className="h-4 w-4 animate-spin" />
                                          {t('taking')}
                                        </>
                                      ) : (
                                        <>
                                          <Camera className="h-4 w-4" />
                                          {t('addLoadingPhoto')}
                                        </>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setScanTaskId(task.task_id)}
                                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                                    >
                                      <QrCode className="h-4 w-4" />
                                      {t('scanQr')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDepart(task.task_id)}
                                      disabled={
                                        departingId === task.task_id ||
                                        (task.loading_expected_count != null &&
                                          task.loading_expected_count > 0 &&
                                          (task.loading_scanned_count ?? 0) < task.loading_expected_count)
                                      }
                                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                                    >
                                      {departingId === task.task_id ? (
                                        <>
                                          <RefreshCw className="h-4 w-4 animate-spin" />
                                          {t('taking')}
                                        </>
                                      ) : (
                                        t('depart')
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                          {task.loading_photo_media_id &&
                            (task.status?.toLowerCase() === 'loading' ||
                              task.status?.toLowerCase() === 'in_transit' ||
                              task.status?.toLowerCase() === 'partially_delivered') && (
                              <div
                                className={
                                  task.status?.toLowerCase() === 'loading'
                                    ? 'mt-3 pt-3 border-t border-gray-100 w-full'
                                    : 'mt-3 pt-3 w-full'
                                }
                              >
                                {(task.status?.toLowerCase() === 'in_transit' ||
                                  task.status?.toLowerCase() === 'partially_delivered') && (
                                  <span className="text-sm font-medium text-gray-700 block mb-2">
                                    {t('warehouse')}
                                  </span>
                                )}
                                <DriverMediaImage
                                  mediaId={String(task.loading_photo_media_id)}
                                  alt="Loading"
                                  className="max-h-40 w-auto rounded-lg border border-gray-200 object-cover shadow-sm"
                                />
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                    <div className="divide-y divide-gray-100">
                      {task.deliveries.map((dc) => {
                        const isDcDelivered = dc.status?.toLowerCase() === 'delivered';
                        const unloadPhotoKey = `${task.task_id}-${dc.dc_id}`;
                        return (
                          <div key={dc.dc_id} className="p-4 sm:p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-blue-100 shrink-0">
                                  <Building2 className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-900">{dc.dc_name}</h3>
                                  {dc.dc_address && (
                                    <p className="text-sm text-gray-600 mt-0.5">{dc.dc_address}</p>
                                  )}
                                  <p className="text-xs text-gray-500 mt-1">
                                    {warehouseCoords(dc.dc_lat, dc.dc_lon)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                {isDcDelivered ? (
                                  <span className="inline-flex items-center gap-1 text-sm text-green-700 font-medium">
                                    <Check className="h-4 w-4" />
                                    {t('statusDelivered')}
                                  </span>
                                ) : (
                                  (task.status?.toLowerCase() === 'in_transit' ||
                                    task.status?.toLowerCase() === 'partially_delivered') && (
                                    <button
                                      type="button"
                                      onClick={() => handleUnload(task.task_id, dc.dc_id)}
                                      disabled={unloadingKey === unloadPhotoKey}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                      {unloadingKey === unloadPhotoKey ? (
                                        <>
                                          <RefreshCw className="h-4 w-4 animate-spin" />
                                          {t('unloading')}
                                        </>
                                      ) : (
                                        t('unload')
                                      )}
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                            <ul className="space-y-1.5 ml-11">
                              {dc.items.map((item, idx) => (
                                <li
                                  key={`${item.sku_code}-${idx}`}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-gray-700">
                                    {item.sku_name}
                                    {item.sku_code && (
                                      <span className="text-gray-500 ml-1">({item.sku_code})</span>
                                    )}
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {item.quantity} {t('pcs')}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            {isDcDelivered && (
                              <div className={`mt-3 ml-11 flex ${dc.unload_photo_media_id ? 'justify-start' : 'justify-end'}`}>
                                {dc.unload_photo_media_id ? (
                                  <DriverMediaImage
                                    mediaId={String(dc.unload_photo_media_id)}
                                    alt="Unload"
                                    className="max-h-32 w-auto rounded-lg border border-gray-200 object-cover shadow-sm"
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      unloadPhotoTargetRef.current = {
                                        taskId: task.task_id,
                                        dcId: dc.dc_id,
                                      };
                                      unloadPhotoInputRef.current?.click();
                                    }}
                                    disabled={uploadingUnloadKey === unloadPhotoKey}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                                  >
                                    {uploadingUnloadKey === unloadPhotoKey ? (
                                      <>
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        {t('taking')}
                                      </>
                                    ) : (
                                      <>
                                        <Camera className="h-4 w-4" />
                                        {t('addLoadingPhoto')}
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {canCompleteTask(task) && (
                      <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/50">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleCompleteTask(task.task_id)}
                            disabled={completingId === task.task_id}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            {completingId === task.task_id ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                {t('completing')}
                              </>
                            ) : (
                              t('completeOrder')
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!error && tasks.length > 0 && myTasks.length === 0 && (
            <div className="space-y-6">
              {tasks.map((task) => (
                <div
                  key={task.task_id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-100">
                          <Package className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <h2 className="font-semibold text-gray-900">
                            {t('order')} {task.order_number}
                          </h2>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span>{t('pickupAt')}</span>
                            <code className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                              {warehouseCoords(task.warehouse_lat, task.warehouse_lon)}
                            </code>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTake(task.task_id)}
                        disabled={takingId === task.task_id}
                        className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {takingId === task.task_id ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            {t('taking')}
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            {t('take')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="p-4 sm:p-5 border-b border-gray-100">
                    <TaskRouteMap
                      task={task}
                      warehouseLabel={t('warehouse')}
                      openInGoogleLabel={t('openInGoogle')}
                      openInYandexLabel={t('openInYandex')}
                      driverPosition={driverPosition}
                      driverLabel={t('driverMarker')}
                    />
                  </div>
                  <div className="divide-y divide-gray-100">
                    {task.deliveries.map((dc) => (
                      <div key={dc.dc_id} className="p-4 sm:p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="p-2 rounded-lg bg-blue-100 shrink-0">
                            <Building2 className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{dc.dc_name}</h3>
                            {dc.dc_address && (
                              <p className="text-sm text-gray-600 mt-0.5">
                                {dc.dc_address}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {warehouseCoords(dc.dc_lat, dc.dc_lon)}
                            </p>
                          </div>
                        </div>
                        <ul className="space-y-1.5 ml-11">
                          {dc.items.map((item, idx) => (
                            <li
                              key={`${item.sku_code}-${idx}`}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-gray-700">
                                {item.sku_name}
                                {item.sku_code && (
                                  <span className="text-gray-500 ml-1">
                                    ({item.sku_code})
                                  </span>
                                )}
                              </span>
                              <span className="font-medium text-gray-900">
                                {item.quantity} {t('pcs')}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={cancelConfirmTaskId != null} onOpenChange={(open) => !open && setCancelConfirmTaskId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('cancelConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('cancelConfirmDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelConfirmTaskId(null)}>
              {t('cancelConfirmKeep')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={cancellingId != null}
            >
              {cancellingId != null ? t('cancelling') : t('cancelConfirmYes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <QrScanDialog
        open={scanTaskId != null}
        onOpenChange={(open) => !open && setScanTaskId(null)}
        onScan={handleScan}
      />
    </RequireDriverAuth>
  );
}
