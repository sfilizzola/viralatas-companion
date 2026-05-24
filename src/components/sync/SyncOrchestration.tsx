import { AnnouncementSync } from './AnnouncementSync';
import { BandSync } from './BandSync';
import { CacheVersionCheck } from './CacheVersionCheck';
import { DuckNotificationsListener } from './DuckNotificationsListener';
import { DuckSync } from './DuckSync';
import { PickSync } from './PickSync';
import { PushSetup } from './PushSetup';

export function SyncOrchestration() {
  return (
    <>
      <CacheVersionCheck />
      <BandSync />
      <PickSync />
      <AnnouncementSync />
      <DuckSync />
      <PushSetup />
      <DuckNotificationsListener />
    </>
  );
}
