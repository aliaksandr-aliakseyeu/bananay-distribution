'use client';

import { useEffect, useState } from 'react';
import { driverApi } from '@/lib/api/driver';

/** Кэш blob URL по mediaId — одна загрузка на все использования. */
const mediaBlobCache = new Map<string, { url: string; refCount: number }>();

function getToken(): string | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('driver-auth-storage') : null;
    if (!raw) return null;
    const { state } = JSON.parse(raw);
    return state?.token ?? null;
  } catch {
    return null;
  }
}

/** Fetches driver media with auth and displays as img. Reuses cached blob URL for same mediaId. */
export function DriverMediaImage({
  mediaId,
  alt = '',
  className,
  ...props
}: { mediaId: string; alt?: string } & React.ComponentProps<'img'>) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const entry = mediaId ? mediaBlobCache.get(mediaId) : undefined;
    if (entry) {
      entry.refCount += 1;
      setSrc(entry.url);
      return () => {
        entry.refCount -= 1;
        if (entry.refCount <= 0) {
          entry.refCount = 0;
          // Не удаляем из кэша — при следующем раскрытии используем тот же URL без повторной загрузки
        }
      };
    }
    let cancelled = false;
    const token = getToken();
    const url = driverApi.getMediaUrl(mediaId);
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (cancelled || !blob) return;
        const u = URL.createObjectURL(blob);
        mediaBlobCache.set(mediaId, { url: u, refCount: 1 });
        setSrc(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      const e = mediaBlobCache.get(mediaId);
      if (e) {
        e.refCount -= 1;
        if (e.refCount <= 0) {
          e.refCount = 0;
          // Не удаляем — повторное раскрытие без новой загрузки
        }
      }
    };
  }, [mediaId]);

  if (!src) return null;
  return <img src={src} alt={alt} className={className} {...props} />;
}
