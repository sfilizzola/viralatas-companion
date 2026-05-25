import { BandSync } from './BandSync';
import { CacheVersionCheck } from './CacheVersionCheck';
import { DuckNotificationsListener } from './DuckNotificationsListener';
import { PushSetup } from './PushSetup';
import { ReconnectSync } from './ReconnectSync';

export function SyncOrchestration() {
  return (
    <>
      <CacheVersionCheck />
      <BandSync />
      <ReconnectSync />
      <PushSetup />
      <DuckNotificationsListener />
    </>
  );
}
