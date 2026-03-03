'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, AttributionControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const warehouseIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="
    background-color: #3B82F6;
    width: 28px;
    height: 28px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const dcIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="
    background-color: #10B981;
    width: 24px;
    height: 24px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

// Грузовик вид сверху (кабина + кузов)
const driverIcon = new L.DivIcon({
  className: 'custom-marker driver-truck-icon',
  html: `<div style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.35));">
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="18" height="12" rx="2" fill="#F59E0B" stroke="white" stroke-width="2"/>
      <rect x="18" y="6" width="8" height="8" rx="1" fill="#D97706" stroke="white" stroke-width="2"/>
      <circle cx="7" cy="16" r="2" fill="#1f2937" stroke="white" stroke-width="1"/>
      <circle cx="21" cy="16" r="2" fill="#1f2937" stroke="white" stroke-width="1"/>
    </svg>
  </div>`,
  iconSize: [28, 20],
  iconAnchor: [14, 10],
  popupAnchor: [0, -10],
});

interface MapPoint {
  lat: number;
  lon: number;
  label: string;
  type: 'warehouse' | 'dc';
}

/** Подгоняем карту под маршрут: водитель (старт) + склад + РЦ. Ресайз только при смене точек, не при каждом обновлении позиции водителя. */
function MapBounds({
  points,
  driverPosition,
}: {
  points: MapPoint[];
  driverPosition?: { lat: number; lon: number };
}) {
  const map = useMap();
  useEffect(() => {
    const coords = points.map((p) => [p.lat, p.lon] as [number, number]);
    if (driverPosition) coords.push([driverPosition.lat, driverPosition.lon]);
    if (coords.length > 0) {
      map.fitBounds(L.latLngBounds(coords), { padding: [30, 30], maxZoom: 14 });
    }
    // Не включаем driverPosition в deps — не подгоняем карту при каждом движении водителя
  }, [map, points]);
  return null;
}

interface TaskRouteMapInnerProps {
  points: MapPoint[];
  driverPosition?: { lat: number; lon: number };
  driverLabel?: string;
}

export function TaskRouteMapInner({ points, driverPosition, driverLabel = 'Вы' }: TaskRouteMapInnerProps) {
  if (points.length === 0) return null;

  return (
    <MapContainer
      center={[points[0].lat, points[0].lon]}
      zoom={11}
      className="h-full w-full"
      attributionControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <AttributionControl position="bottomright" prefix="" />
      <MapBounds points={points} driverPosition={driverPosition} />

      {driverPosition && (
        <Marker position={[driverPosition.lat, driverPosition.lon]} icon={driverIcon}>
          <Tooltip permanent direction="top" offset={[0, -16]} opacity={1}>
            <span className="font-medium text-sm whitespace-nowrap">{driverLabel}</span>
          </Tooltip>
          <Popup>{driverLabel}</Popup>
        </Marker>
      )}

      {points.map((p, i) => (
        <Marker
          key={`${p.type}-${p.lat}-${p.lon}-${i}`}
          position={[p.lat, p.lon]}
          icon={p.type === 'warehouse' ? warehouseIcon : dcIcon}
        >
          <Tooltip permanent direction="top" offset={[0, -22]} opacity={1}>
            <span className="font-medium text-sm whitespace-nowrap">{p.label}</span>
          </Tooltip>
          <Popup>{p.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
