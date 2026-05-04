// Alert queue and cooldown tracking (Phase 5 placeholder — Phase 1 ships the module, not the logic)

export type AlertType = 'conflict' | 'crew_split' | 'discovery_nudge' | 'day_recap';

export type QueuedAlert = {
  id: string;
  type: AlertType;
  userId: string;
  payload: Record<string, unknown>;
  queuedAt: string;
};

// In-memory queue for now; Phase 5 will wire this to the Edge Function
const pendingAlerts: QueuedAlert[] = [];

export function enqueueAlert(alert: Omit<QueuedAlert, 'id' | 'queuedAt'>) {
  pendingAlerts.push({
    ...alert,
    id: crypto.randomUUID(),
    queuedAt: new Date().toISOString(),
  });
}

export function drainAlertQueue(): QueuedAlert[] {
  return pendingAlerts.splice(0);
}
