export const USER_INITIATED_SIGN_OUT_KEY = 'userInitiatedSignOut';
export const SESSION_EXPIRED_BANNER_DISMISSED_KEY = 'sessionExpiredBannerDismissed';

export function markUserInitiatedSignOut(): void {
  sessionStorage.setItem(USER_INITIATED_SIGN_OUT_KEY, 'true');
}

export function clearUserInitiatedSignOut(): void {
  sessionStorage.removeItem(USER_INITIATED_SIGN_OUT_KEY);
}

export function isUserInitiatedSignOut(): boolean {
  return sessionStorage.getItem(USER_INITIATED_SIGN_OUT_KEY) === 'true';
}

export function clearSessionExpiredBannerDismissed(): void {
  sessionStorage.removeItem(SESSION_EXPIRED_BANNER_DISMISSED_KEY);
}

export function dismissSessionExpiredBanner(): void {
  sessionStorage.setItem(SESSION_EXPIRED_BANNER_DISMISSED_KEY, 'true');
}

export function isSessionExpiredBannerDismissed(): boolean {
  return sessionStorage.getItem(SESSION_EXPIRED_BANNER_DISMISSED_KEY) === 'true';
}
