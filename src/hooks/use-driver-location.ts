'use client';

import { useEffect, useRef, useState } from 'react';
import { deliveryTasksApi } from '@/lib/api/delivery-tasks';

const DEFAULT_INTERVAL_SEC = 15;

export function useDriverLocationReporting(taskIds: number[]) {
  const [position, setPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastReportRef = useRef<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (taskIds.length === 0) return;

    let intervalSec = DEFAULT_INTERVAL_SEC;
    deliveryTasksApi.getLocationConfig().then(
      (c) => { intervalSec = c.send_interval_sec; },
      () => {}
    );

    const report = (lat: number, lon: number, accuracy?: number) => {
      const body = { lat, lon, accuracy };
      for (const taskId of taskIds) {
        deliveryTasksApi.reportLocation(taskId, body).catch(() => {
          // Silent fail - don't spam user
        });
      }
    };

    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const acc = pos.coords.accuracy;
        setPosition({ lat, lon });
        setError(null);
        lastReportRef.current = { lat, lon };
        report(lat, lon, acc);
      },
      (err) => {
        setError(err.message || 'Location error');
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    intervalRef.current = setInterval(() => {
      const last = lastReportRef.current;
      if (last) report(last.lat, last.lon);
    }, intervalSec * 1000);

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setPosition(null);
    };
  }, [taskIds.join(',')]);

  return { position, error };
}

/** Только получение текущей позиции (без отправки на сервер). Нужно для маршрута от водителя на доступных задачах. */
export function useCurrentPosition() {
  const [position, setPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setError(null);
      },
      (err) => setError(err.message || 'Location error'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setPosition(null);
    };
  }, []);

  return { position, error };
}
