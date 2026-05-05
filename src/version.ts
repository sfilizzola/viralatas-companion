// Bump MAJOR or MINOR here manually when doing a significant release.
// PATCH is injected automatically at build time — never touch it here.
export const MAJOR = 0;
export const MINOR = 9;
export const PATCH = parseInt(import.meta.env.VITE_COMMIT_COUNT ?? '0', 10);
export const VERSION = `${MAJOR}.${MINOR}.${PATCH}`;
