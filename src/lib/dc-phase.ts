import type { DcBox, DcItemPhase } from './api/dc';

export type DcActionKey =
  | 'scanReceive'
  | 'scanMoveToSorting'
  | 'scanSortToZone'
  | 'scanHandoverCourier2';

export interface DcActionOption {
  key: DcActionKey;
  phase: DcItemPhase;
}

export const DC_ACTIONS: DcActionOption[] = [
  { key: 'scanReceive', phase: 'received_at_dc' },
  { key: 'scanMoveToSorting', phase: 'moved_to_sorting' },
  { key: 'scanSortToZone', phase: 'sorted_to_zone' },
  { key: 'scanHandoverCourier2', phase: 'handed_to_courier2' },
];

export function getAllowedActions(box: DcBox): DcActionOption[] {
  const hasExplicitFlags =
    typeof box.can_receive === 'boolean' ||
    typeof box.can_move_to_sorting === 'boolean' ||
    typeof box.can_sort_to_zone === 'boolean' ||
    typeof box.can_handover_to_courier2 === 'boolean';

  if (!hasExplicitFlags) {
    if (box.phase === 'received_at_dc') return [DC_ACTIONS[1]];
    if (box.phase === 'moved_to_sorting') return [DC_ACTIONS[2]];
    if (box.phase === 'sorted_to_zone') return [DC_ACTIONS[3]];
    return [];
  }

  const res: DcActionOption[] = [];
  if (box.can_receive) res.push(DC_ACTIONS[0]);
  if (box.can_move_to_sorting) res.push(DC_ACTIONS[1]);
  if (box.can_sort_to_zone) res.push(DC_ACTIONS[2]);
  if (box.can_handover_to_courier2) res.push(DC_ACTIONS[3]);
  return res;
}

export function getPhaseStepLabel(phase: DcItemPhase): number {
  if (phase === 'received_at_dc') return 1;
  if (phase === 'moved_to_sorting') return 2;
  if (phase === 'sorted_to_zone') return 3;
  return 4;
}
