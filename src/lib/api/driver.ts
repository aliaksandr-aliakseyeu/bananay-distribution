import { API_BASE_URL } from '../constants';
import { apiClient } from './client';

export interface DriverProfileResponse {
  id: string;
  phone_e164: string;
  status: string;
  full_name: string | null;
  city: string | null;
  street: string | null;
  building: string | null;
  apartment: string | null;
  region_id: number | null;
  payout_account: string | null;
  created_at: string;
  updated_at: string;
  can_submit: boolean;
  required_fields: Record<string, boolean>;
  required_document_kinds: string[];
}

export interface DriverProfileUpdate {
  full_name?: string | null;
  city?: string | null;
  street?: string | null;
  building?: string | null;
  apartment?: string | null;
  region_id?: number | null;
  payout_account?: string | null;
}

export interface DriverVehicleResponse {
  id: string;
  driver_id: string;
  plate_number: string;
  model: string | null;
  capacity_kg: number;
  capacity_m3: number;
  body_type: string | null;
  photo_media_id: string | null;
  sts_media_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DriverVehicleCreate {
  plate_number: string;
  model?: string | null;
  capacity_kg: number;
  capacity_m3: number;
  body_type?: string | null;
}

export interface DriverVehicleUpdate {
  plate_number?: string | null;
  model?: string | null;
  capacity_kg?: number | null;
  capacity_m3?: number | null;
  body_type?: string | null;
  is_active?: boolean | null;
}

export interface DriverMediaFileResponse {
  id: string;
  owner_type: string;
  owner_id: string;
  kind: string;
  blob_path: string;
  content_type: string;
  size_bytes: number | null;
  created_at: string;
}

export interface DriverApplicationResponse {
  id: string;
  driver_id: string;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
}

const BASE = '/api/v1/driver';

export const driverApi = {
  getMe: () => apiClient.get<DriverProfileResponse>(`${BASE}/me`),
  updateMe: (data: DriverProfileUpdate) =>
    apiClient.patch<DriverProfileResponse>(`${BASE}/me`, data),

  getVehicles: () => apiClient.get<DriverVehicleResponse[]>(`${BASE}/vehicles`),
  createVehicle: (data: DriverVehicleCreate) =>
    apiClient.post<DriverVehicleResponse>(`${BASE}/vehicles`, data),
  getVehicle: (id: string) => apiClient.get<DriverVehicleResponse>(`${BASE}/vehicles/${id}`),
  updateVehicle: (id: string, data: DriverVehicleUpdate) =>
    apiClient.patch<DriverVehicleResponse>(`${BASE}/vehicles/${id}`, data),
  deleteVehicle: (id: string) =>
    apiClient.delete<void>(`${BASE}/vehicles/${id}`),
  uploadVehiclePhoto: async (vehicleId: string, file: File): Promise<DriverVehicleResponse> => {
    const token = typeof window !== 'undefined' && (() => {
      try {
        const raw = localStorage.getItem('driver-auth-storage');
        if (!raw) return null;
        const { state } = JSON.parse(raw);
        return state?.token ?? null;
      } catch { return null; }
    })();
    const url = `${API_BASE_URL}${BASE}/vehicles/${vehicleId}/photo`;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || String(res.status));
    }
    return res.json();
  },
  uploadVehicleSts: async (vehicleId: string, file: File): Promise<DriverVehicleResponse> => {
    const token = typeof window !== 'undefined' && (() => {
      try {
        const raw = localStorage.getItem('driver-auth-storage');
        if (!raw) return null;
        const { state } = JSON.parse(raw);
        return state?.token ?? null;
      } catch { return null; }
    })();
    const url = `${API_BASE_URL}${BASE}/vehicles/${vehicleId}/sts`;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || String(res.status));
    }
    return res.json();
  },
  getMediaUrl: (mediaId: string) => `${API_BASE_URL}${BASE}/media/${mediaId}`,

  getDocuments: () =>
    apiClient.get<DriverMediaFileResponse[]>(`${BASE}/documents`),
  uploadDocument: async (kind: string, file: File): Promise<DriverMediaFileResponse> => {
    const token = typeof window !== 'undefined' && (() => {
      try {
        const raw = localStorage.getItem('driver-auth-storage');
        if (!raw) return null;
        const { state } = JSON.parse(raw);
        return state?.token ?? null;
      } catch { return null; }
    })();
    const url = `${API_BASE_URL}${BASE}/documents?kind=${encodeURIComponent(kind)}`;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || String(res.status));
    }
    return res.json();
  },

  getApplication: () =>
    apiClient.get<DriverApplicationResponse | null>(`${BASE}/application`),
  submitApplication: () =>
    apiClient.post<DriverApplicationResponse>(`${BASE}/application/submit`),
};
