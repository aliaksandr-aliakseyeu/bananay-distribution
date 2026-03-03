'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DriverDeliveryTask } from '@/lib/api/delivery-tasks';

const MapWithNoSSR = dynamic(
  () => import('./task-route-map-inner').then((m) => m.TaskRouteMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 rounded-lg border border-gray-200 bg-gray-100 animate-pulse" />
    ),
  }
);

interface MapPoint {
  lat: number;
  lon: number;
  label: string;
  type: 'warehouse' | 'dc';
}

function buildGoogleMapsUrl(points: MapPoint[]): string {
  if (points.length === 0) return 'https://www.google.com/maps';
  if (points.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&destination=${points[0].lat},${points[0].lon}`;
  }
  const dest = points[points.length - 1];
  const origin = points[0];
  const waypoints = points.slice(1, -1);
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.lat},${origin.lon}`,
    destination: `${dest.lat},${dest.lon}`,
  });
  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.map((p) => `${p.lat},${p.lon}`).join('|'));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function buildYandexMapsUrl(points: MapPoint[]): string {
  if (points.length === 0) return 'https://yandex.ru/maps';
  const rtext =
    points.length === 1
      ? `~${points[0].lat},${points[0].lon}`
      : points.map((p) => `${p.lat},${p.lon}`).join('~');
  return `https://yandex.ru/maps/?rtext=${encodeURIComponent(rtext)}&rtt=auto`;
}

interface TaskRouteMapProps {
  task: DriverDeliveryTask;
  warehouseLabel?: string;
  openInGoogleLabel: string;
  openInYandexLabel: string;
  driverPosition?: { lat: number; lon: number };
  driverLabel?: string;
}

/** After driver has departed, nav links show only DCs (no warehouse). */
function onlyDcPoints(task: DriverDeliveryTask): boolean {
  const s = task.status?.toLowerCase();
  return s === 'in_transit' || s === 'partially_delivered';
}

/** DCs that are not yet unloaded/delivered — only these go into route buttons. */
function dcNotUnloaded(status: string | null | undefined): boolean {
  const s = status?.toLowerCase();
  return s !== 'delivered' && s !== 'unloaded';
}

export function TaskRouteMap({
  task,
  warehouseLabel = 'Warehouse',
  openInGoogleLabel,
  openInYandexLabel,
  driverPosition,
  driverLabel,
}: TaskRouteMapProps) {
  const { mapPoints, allPoints, navPoints, navPointsWithDriver } = useMemo(() => {
    const points: MapPoint[] = [];
    const wh: MapPoint = {
      lat: task.warehouse_lat,
      lon: task.warehouse_lon,
      label: warehouseLabel,
      type: 'warehouse',
    };
    points.push(wh);

    for (const dc of task.deliveries || []) {
      points.push({
        lat: dc.dc_lat,
        lon: dc.dc_lon,
        label: dc.dc_name,
        type: 'dc',
      });
    }

    // For map we always show all points; for Google/Yandex after depart only DCs not yet unloaded
    const forNav = onlyDcPoints(task)
      ? points.filter((p, i) => p.type === 'dc' && dcNotUnloaded(task.deliveries?.[i - 1]?.status))
      : points;
    const nav = forNav.length ? forNav : points;
    // Маршрут строим от водителя: старт = текущая позиция, затем склад/РЦ
    const withDriver =
      driverPosition && nav.length > 0
        ? [{ lat: driverPosition.lat, lon: driverPosition.lon, label: driverLabel ?? 'Вы', type: 'warehouse' as const }, ...nav]
        : nav;
    return { mapPoints: points, allPoints: points, navPoints: nav, navPointsWithDriver: withDriver };
  }, [task, warehouseLabel, driverPosition, driverLabel]);

  if (allPoints.length === 0) return null;

  const googleUrl = buildGoogleMapsUrl(navPointsWithDriver);
  const yandexUrl = buildYandexMapsUrl(navPointsWithDriver);

  return (
    <div className="space-y-3">
      <div className="rounded-lg overflow-hidden border border-gray-200 h-64 bg-gray-100">
        <MapWithNoSSR points={allPoints} driverPosition={driverPosition} driverLabel={driverLabel} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={googleUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            {openInGoogleLabel}
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={yandexUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            {openInYandexLabel}
          </a>
        </Button>
      </div>
    </div>
  );
}
