// src/lib/appSettings.ts
// Wrapper barrel — thin delegates to featureFlags.
// Phase 2 will migrate callers to featureFlags directly and delete this file.
import { featureFlags } from './featureFlags';

export const getRegistrationEnabled = () => featureFlags.get('registration_enabled');
// Setters return Promise<true> (not void) to preserve backward compat with callers
// that assert the resolved value (e.g. duckKillswitch.test.tsx:79).
// Remove this shim when Phase 2 migrates callers to featureFlags directly.
export const setRegistrationEnabled  = (v: boolean) =>
  featureFlags.set('registration_enabled', v).then(() => true as const);

export const getDuckEnabled = () => featureFlags.get('duck_enabled');
export const setDuckEnabled = (v: boolean) =>
  featureFlags.set('duck_enabled', v).then(() => true as const);

export const getPlaylistTesting = () => featureFlags.get('playlist_testing');
export const setPlaylistTesting = (v: boolean) =>
  featureFlags.set('playlist_testing', v).then(() => true as const);

export const getMoshSplitEnabled = () => featureFlags.get('moshsplit_enabled');
export const setMoshSplitEnabled = (v: boolean) =>
  featureFlags.set('moshsplit_enabled', v).then(() => true as const);
