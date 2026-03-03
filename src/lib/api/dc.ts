import { dcApiClient } from './dc-client';

export type DcAccountStatus = 'draft' | 'active' | 'blocked';
export type DcItemPhase =
  | 'received_at_dc'
  | 'moved_to_sorting'
  | 'sorted_to_zone'
  | 'handed_to_courier2';

export interface DcProfile {
  id: string;
  phone_e164: string;
  status: DcAccountStatus;
  first_name: string | null;
  last_name: string | null;
  distribution_center_id: number | null;
  distribution_center_name?: string | null;
}

export interface DcProfileUpdate {
  first_name?: string | null;
  last_name?: string | null;
}

export interface DcBox {
  item_point_id: number;
  delivery_order_item_point_id?: number;
  operation_id?: string | null;
  qr_token: string;
  order_id: number;
  order_number: string | null;
  phase: DcItemPhase;
  phase_label: string;
  updated_at: string | null;
  delivery_point_name: string | null;
  sku_name: string | null;
  quantity: number | null;
  can_receive: boolean;
  can_move_to_sorting: boolean;
  can_sort_to_zone: boolean;
  can_handover_to_courier2: boolean;
}

export interface DcScanResponse {
  operation_id: string;
  item_point_id: number;
  qr_token: string;
  phase: DcItemPhase;
  phase_label: string;
  idempotent: boolean;
  scanned_at: string;
  delivery_point_name: string | null;
  sku_name: string | null;
  quantity: number | null;
  order_id: number;
  order_number: string | null;
}

export interface DcOperationEvent {
  id: number;
  phase: DcItemPhase;
  phase_label: string;
  scanned_at: string;
  actor_name: string | null;
}

export interface DcOperationDetails {
  operation_id: string;
  item_point_id: number;
  qr_token: string;
  order_id: number;
  order_number: string | null;
  events: DcOperationEvent[];
}

export interface DcHistoryEvent {
  event_id: number;
  scanned_at: string;
  phase: DcItemPhase;
  qr_token: string;
  delivery_order_item_point_id: number;
  order_id: number;
  order_number: string | null;
  operation_id: string | null;
  scanned_by_dc_id: string | null;
  actor_name: string | null;
  delivery_point_name: string | null;
  sku_name: string | null;
  quantity: number | null;
  payload: Record<string, unknown> | null;
}

export interface DcReceivingOrder {
  order_id: number;
  order_number: string | null;
  expected_count: number;
  received_count: number;
  remaining_count: number;
  updated_at: string | null;
}

export interface DcReceiveForOrderResponse {
  qr_token: string;
  delivery_order_item_point_id: number;
  order_id: number;
  current_stage: string;
  phase: DcItemPhase;
  event_id: number;
  operation_id: string | null;
  is_idempotent: boolean;
  scanned_at: string;
  delivery_point_name: string | null;
  sku_name: string | null;
  quantity: number | null;
  expected_count: number;
  received_count: number;
  remaining_count: number;
}

const BASE = '/api/v1/dc';

function scan(endpoint: string, qr_token: string, operation_id?: string) {
  return dcApiClient.post<DcScanResponse>(`${BASE}/boxes/${endpoint}`, {
    qr_token,
    operation_id,
  });
}

export const dcApi = {
  getMe: () => dcApiClient.get<DcProfile>(`${BASE}/me`),
  updateMe: (data: DcProfileUpdate) => dcApiClient.patch<DcProfile>(`${BASE}/me`, data),

  getBoxes: async (stage?: DcItemPhase) => {
    const query = stage ? `?stage=${stage}` : '';
    const data = await dcApiClient.get<DcBox[] | { items?: DcBox[] }>(`${BASE}/boxes${query}`);
    const rows = Array.isArray(data) ? data : data.items ?? [];
    return rows.map((row) => ({
      ...row,
      item_point_id: row.item_point_id ?? row.delivery_order_item_point_id ?? 0,
    }));
  },
  getOperation: (operationId: string) =>
    dcApiClient.get<DcOperationDetails>(`${BASE}/operations/${operationId}`),
  getHistoryEvents: (phase: DcItemPhase) =>
    dcApiClient.get<DcHistoryEvent[]>(`${BASE}/history/events?phase=${phase}`),
  getReceivingOrders: () =>
    dcApiClient.get<DcReceivingOrder[]>(`${BASE}/receiving/orders`),
  scanReceiveForOrder: (orderId: number, qr_token: string, operation_id?: string) =>
    dcApiClient.post<DcReceiveForOrderResponse>(`${BASE}/receiving/orders/${orderId}/scan-receive`, {
      qr_token,
      operation_id,
    }),

  scanReceive: (qr_token: string, operation_id?: string) =>
    scan('scan-receive', qr_token, operation_id),
  scanMoveToSorting: (qr_token: string, operation_id?: string) =>
    scan('scan-move-to-sorting', qr_token, operation_id),
  scanSortToZone: (qr_token: string, operation_id?: string) =>
    scan('scan-sort-to-zone', qr_token, operation_id),
  scanHandoverCourier2: (qr_token: string, operation_id?: string) =>
    scan('scan-handover-courier2', qr_token, operation_id),
};
