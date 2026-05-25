import { BandSync } from './BandSync';
import { CacheVersionCheck } from './CacheVersionCheck';
import { DuckNotificationsListener } from './DuckNotificationsListener';
import { PushSetup } from './PushSetup';
import { RealtimeSync } from './RealtimeSync';
import { ReconnectSync } from './ReconnectSync';

export function SyncOrchestration() {
  return (
    <>
      <CacheVersionCheck />
      <BandSync />
      <ReconnectSync />
      <RealtimeSync />
      <PushSetup />
      <DuckNotificationsListener />
    </>
  );
}
