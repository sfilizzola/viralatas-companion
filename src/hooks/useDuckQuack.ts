import { useCallback, useEffect, useState } from 'react';
import { duckRepository } from '../repositories/duck';
import { useCooldown } from './useCooldown';

const COOLDOWN_MS = 90_000;

function cooldownKey(userId: string, bandId: string) {
  return `duck_cooldown:${userId}:${bandId}`;
}

function readCooldownUntil(userId: string, bandId: string): number | null {
  const stored = localStorage.getItem(cooldownKey(userId, bandId));
  if (!stored) return null;
  const until = Number.parseInt(stored, 10);
  if (Date.now() >= until) {
    localStorage.removeItem(cooldownKey(userId, bandId));
    return null;
  }
  return until;
}

/**
 * Manages the 90-second per-user per-band duck cooldown and fires the quack.
 * Pass null userId or bandId to get a no-op (safe for conditional rendering).
 */
export function useDuckQuack(userId: string | null, bandId: string | null) {
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(() => {
    if (!userId || !bandId) return null;
    return readCooldownUntil(userId, bandId);
  });

  // Re-read from localStorage when userId/bandId changes (band rotation)
  useEffect(() => {
    if (!userId || !bandId) {
      setCooldownUntil(null);
      return;
    }
    setCooldownUntil(readCooldownUntil(userId, bandId));
  }, [userId, bandId]);

  // Auto-clear cooldown when it expires
  useEffect(() => {
    if (!cooldownUntil) return;
    const remaining = cooldownUntil - Date.now();
    if (remaining <= 0) {
      setCooldownUntil(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setCooldownUntil(null);
      if (userId && bandId) localStorage.removeItem(cooldownKey(userId, bandId));
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [cooldownUntil, userId, bandId]);

  const isOnCooldown = useCooldown(cooldownUntil);

  const quack = useCallback(async () => {
    if (!userId || !bandId || isOnCooldown) return;

    const until = Date.now() + COOLDOWN_MS;
    localStorage.setItem(cooldownKey(userId, bandId), String(until));
    setCooldownUntil(until);

    await duckRepository.quackBand(userId, bandId);
  }, [userId, bandId, isOnCooldown]);

  return { quack, isOnCooldown, cooldownUntil };
}
