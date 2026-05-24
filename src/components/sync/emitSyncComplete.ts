import { SYNC_COMPLETE_EVENT } from '../SyncToast';

export function emitSyncComplete() {
  window.dispatchEvent(new Event(SYNC_COMPLETE_EVENT));
}
