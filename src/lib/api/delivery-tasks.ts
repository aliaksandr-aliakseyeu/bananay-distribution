import { API_BASE_URL } from '../constants';
import { apiClient } from './client';

export interface DeliveryTaskItem {
  sku_name: string;
  sku_code: string;
  quantity: number;
}

export interface DCDelivery {
  dc_id: number;
  dc_name: string;
  dc_address: string | null;
  dc_lat: number;
  dc_lon: number;
  items: DeliveryTaskItem[];
  /** For my tasks: pending, in_transit, delivered */
  status?: string | null;
  delivered_at?: string | null;
  /** Media ID of optional unload photo; use getMediaUrl(mediaId) to view */
  unload_photo_media_id?: string | null;
}

export interface DriverDeliveryTask {
  task_id: number;
  order_id: number;
  order_number: string;
  warehouse_lat: number;
  warehouse_lon: number;
  deliveries: DCDelivery[];
  status?: string; // assigned, loading, in_transit, etc. (for my tasks)
  /** Media ID of optional loading photo; use getMediaUrl(mediaId) to view */
  loading_photo_media_id?: string | null;
  /** Total item points to scan at loading (for QR flow) */
  loading_expected_count?: number | null;
  /** Item points already scanned at loading; depart enabled when >= loading_expected_count */
  loading_scanned_count?: number | null;
}

export interface ScanQrResponse {
  delivery_order_item_point_id: number;
  order_id: number;
  quantity: number;
  delivery_point_name: string | null;
  sku_name: string | null;
  loading_expected_count: number;
  loading_scanned_count: number;
}

export interface CompletedTask {
  task_id: number;
  order_id: number;
  order_number: string;
  delivered_at: string;
}

const BASE = '/api/v1/driver';

export interface LocationConfig {
  send_interval_sec: number;
  poll_interval_sec: number;
  stale_after_sec: number;
}

export interface LocationReportBody {
  lat: number;
  lon: number;
  accuracy?: number;
  device_info?: string;
}

export const deliveryTasksApi = {
  getTasks: () =>
    apiClient.get<DriverDeliveryTask[]>(`${BASE}/delivery-tasks`),

  getMyTasks: () =>
    apiClient.get<DriverDeliveryTask[]>(`${BASE}/delivery-tasks/my`),

  getCompletedTasks: () =>
    apiClient.get<CompletedTask[]>(`${BASE}/delivery-tasks/completed`),

  getLocationConfig: () =>
    apiClient.get<LocationConfig>(`${BASE}/delivery-tasks/location-config`),

  reportLocation: (taskId: number, body: LocationReportBody) =>
    apiClient.post<{ order_id: number; lat: number; lon: number }>(
      `${BASE}/delivery-tasks/${taskId}/location`,
      body
    ),

  takeTask: (taskId: number) =>
    apiClient.post<{ task_id: number; status: string }>(
      `${BASE}/delivery-tasks/${taskId}/take`
    ),

  cancelTask: (taskId: number) =>
    apiClient.post<{ task_id: number; status: string }>(
      `${BASE}/delivery-tasks/${taskId}/cancel`
    ),

  startLoading: (taskId: number) =>
    apiClient.post<{ task_id: number; status: string }>(
      `${BASE}/delivery-tasks/${taskId}/start-loading`
    ),

  depart: (taskId: number) =>
    apiClient.post<{ task_id: number; status: string }>(
      `${BASE}/delivery-tasks/${taskId}/depart`
    ),

  unloadAtDc: (taskId: number, dcId: number) =>
    apiClient.post<{ task_id: number; dc_id: number; status: string }>(
      `${BASE}/delivery-tasks/${taskId}/dc/${dcId}/unload`
    ),

  completeTask: (taskId: number) =>
    apiClient.post<{ task_id: number; status: string }>(
      `${BASE}/delivery-tasks/${taskId}/complete`
    ),

  uploadLoadingPhoto: (taskId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.postForm<DriverDeliveryTask>(
      `${BASE}/delivery-tasks/${taskId}/upload-loading-photo`,
      form
    );
  },

  uploadUnloadPhoto: (taskId: number, dcId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.postForm<DriverDeliveryTask>(
      `${BASE}/delivery-tasks/${taskId}/dc/${dcId}/upload-unload-photo`,
      form
    );
  },

  /** Submit QR scan at loading (phase=loading). First scan transitions task to loading. */
  submitScan: (taskId: number, qrToken: string) =>
    apiClient.post<ScanQrResponse>(`${BASE}/delivery-tasks/${taskId}/scan`, {
      qr_token: qrToken,
    }),
};

/** URL to view a driver media file (documents, vehicle photo, loading photo). */
export function getMediaUrl(mediaId: string): string {
  return `${API_BASE_URL}/api/v1/driver/media/${mediaId}`;
}
