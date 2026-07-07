import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { LineupPlanSummary } from '../../lib/lineup-remote-plan';
import styles from '../../pages/ProfilePage.module.css';

const LAST_CHECKED_KEY = 'godlike_lineup_last_check';

type UiState = 'idle' | 'loading' | 'in_sync' | 'preview' | 'applying' | 'success' | 'error';

type PreviewResponse = {
  ok: boolean;
  fetchedAt?: string;
  planToken?: string;
  summary?: LineupPlanSummary;
  report?: string;
  inSync?: boolean;
  applicable?: boolean;
  error?: string;
};

type ApplyResponse = {
  ok: boolean;
  applied?: LineupPlanSummary;
  skipped?: { blockedMoves: number; blockedDeletes: number };
  cacheVersion?: string;
  report?: string;
  error?: string;
  message?: string;
};

type LineupSyncSectionProps = {
  t: (key: string, values?: Record<string, string | number>) => string;
};

function formatLocalTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function chipParts(summary: LineupPlanSummary): string[] {
  const parts: string[] = [];
  if (summary.updates > 0) parts.push(`${summary.updates} updates`);
  if (summary.moves > 0) parts.push(`${summary.moves} moves`);
  if (summary.inserts > 0) parts.push(`${summary.inserts} inserts`);
  if (summary.deletes > 0) parts.push(`${summary.deletes} deletes`);
  return parts;
}

export default function LineupSyncSection({ t }: LineupSyncSectionProps) {
  const [uiState, setUiState] = useState<UiState>('idle');
  const [online, setOnline] = useState(navigator.onLine);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successDetail, setSuccessDetail] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LAST_CHECKED_KEY);
    if (stored) setLastCheckedAt(stored);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const summary = preview?.summary;
  const totalChanges = useMemo(() => {
    if (!summary) return 0;
    return (
      summary.updates +
      summary.moves +
      summary.inserts +
      summary.deletes +
      summary.blockedMoves +
      summary.blockedDeletes
    );
  }, [summary]);

  useEffect(() => {
    if (uiState === 'preview' && summary) {
      setDetailsExpanded(totalChanges <= 3);
    }
  }, [uiState, summary, totalChanges]);

  const blockedDeletesNeedConfirm =
    (summary?.blockedDeletes ?? 0) > 0 && deleteConfirmText !== 'DELETE';

  const invokeWithAuth = useCallback(async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('no_session');
    }
    const res = await supabase.functions.invoke('lineup-sync', {
      body,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    if (res.error) {
      throw new Error(res.error.message || String(res.error));
    }
    return res.data as PreviewResponse | ApplyResponse;
  }, []);

  const handleCheck = useCallback(async () => {
    if (!online) return;
    setUiState('loading');
    setError(null);
    setSuccessDetail(null);
    setDeleteConfirmText('');
    try {
      const data = await invokeWithAuth({ action: 'preview' }) as PreviewResponse;
      if (!data.ok) {
        throw new Error(data.error || t('lineupSyncError'));
      }
      setPreview(data);
      const checkedAt = data.fetchedAt ?? new Date().toISOString();
      localStorage.setItem(LAST_CHECKED_KEY, checkedAt);
      setLastCheckedAt(checkedAt);
      setUiState(data.inSync ? 'in_sync' : 'preview');
    } catch (err) {
      console.error('Lineup preview failed:', err);
      setError(t('lineupSyncError'));
      setUiState('error');
    }
  }, [invokeWithAuth, online, t]);

  const handleApply = useCallback(async () => {
    if (!online || !preview?.planToken || blockedDeletesNeedConfirm) return;
    setUiState('applying');
    setError(null);
    setSuccessDetail(null);
    try {
      const data = await invokeWithAuth({
        action: 'apply',
        planToken: preview.planToken,
        confirmDeletes: deleteConfirmText === 'DELETE',
      }) as ApplyResponse;

      if (data.error === 'plan_stale') {
        setError(t('lineupSyncStale'));
        setUiState('error');
        return;
      }
      if (!data.ok) {
        throw new Error(data.error || t('lineupSyncError'));
      }

      const applied = data.applied ?? {
        updates: 0,
        moves: 0,
        inserts: 0,
        deletes: 0,
        blockedMoves: 0,
        blockedDeletes: 0,
      };
      const skipped = data.skipped ?? { blockedMoves: 0, blockedDeletes: 0 };
      const appliedParts = chipParts(applied);
      const skippedParts: string[] = [];
      if (skipped.blockedMoves > 0) {
        skippedParts.push(`${skipped.blockedMoves} blocked move(s)`);
      }
      if (skipped.blockedDeletes > 0) {
        skippedParts.push(`${skipped.blockedDeletes} blocked delete(s)`);
      }

      const lines = [
        appliedParts.length > 0
          ? t('lineupSyncAppliedSummary', { summary: appliedParts.join(' · ') })
          : t('lineupSyncNothingApplied'),
      ];
      if (skippedParts.length > 0) {
        lines.push(t('lineupSyncSkippedSummary', { summary: skippedParts.join(' · ') }));
      }
      if (data.cacheVersion) {
        lines.push(t('lineupSyncSuccess', { version: data.cacheVersion }));
      }
      setSuccessDetail(lines.join(' '));
      setPreview(null);
      setUiState('success');
    } catch (err) {
      console.error('Lineup apply failed:', err);
      setError(t('lineupSyncError'));
      setUiState('error');
    }
  }, [
    blockedDeletesNeedConfirm,
    deleteConfirmText,
    invokeWithAuth,
    online,
    preview?.planToken,
    t,
  ]);

  const showApply =
    (uiState === 'preview' || uiState === 'applying') &&
    preview?.applicable !== false &&
    (summary?.updates ?? 0) +
      (summary?.moves ?? 0) +
      (summary?.inserts ?? 0) +
      (summary?.deletes ?? 0) > 0;

  return (
    <div className={styles.lineupSyncSection}>
      <h4 className={styles.lineupSyncSectionTitle}>{t('lineupSyncTitle')}</h4>
      <p className={styles.lineupSyncDescription}>{t('lineupSyncDescription')}</p>

      {lastCheckedAt && (
        <p className={styles.lineupSyncMeta}>
          {t('lineupSyncLastChecked', { time: formatLocalTime(lastCheckedAt) })}
        </p>
      )}

      {!online && (
        <p className={styles.lineupSyncWarning}>{t('lineupSyncOffline')}</p>
      )}

      {error && <p className={styles.metalPlaceError}>{error}</p>}
      {successDetail && <p className={styles.resetMessage}>{successDetail}</p>}

      {uiState === 'in_sync' && (
        <p className={styles.resetMessage}>{t('lineupSyncInSync')}</p>
      )}

      {(uiState === 'preview' || uiState === 'applying') && summary && (
        <>
          {chipParts(summary).length > 0 && (
            <div className={styles.lineupSyncChipRow}>
              {chipParts(summary).join(' · ')}
            </div>
          )}

          {(summary.blockedMoves > 0 || summary.blockedDeletes > 0) && (
            <p className={styles.lineupSyncWarning}>
              {summary.blockedMoves > 0 && t('lineupSyncBlockedMoveWarning', { count: summary.blockedMoves })}
              {summary.blockedMoves > 0 && summary.blockedDeletes > 0 ? ' ' : ''}
              {summary.blockedDeletes > 0 && t('lineupSyncBlockedDeleteWarning', { count: summary.blockedDeletes })}
            </p>
          )}

          {summary.moves > 0 && (
            <p className={styles.lineupSyncWarning}>{t('lineupSyncMoveWarning')}</p>
          )}

          {preview.report && (
            <>
              <button
                type="button"
                className={styles.lineupSyncAccordionToggle}
                onClick={() => setDetailsExpanded((open) => !open)}
              >
                {detailsExpanded ? t('lineupSyncHideDetails') : t('lineupSyncReviewDetails')}
              </button>
              {detailsExpanded && (
                <pre className={styles.lineupSyncReport}>{preview.report}</pre>
              )}
            </>
          )}

          {summary.blockedDeletes > 0 && (
            <>
              <p className={styles.lineupSyncDeleteWarning}>{t('lineupSyncDeleteWarning')}</p>
              <input
                className={styles.lineupSyncDeleteInput}
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                placeholder={t('lineupSyncDeletePlaceholder')}
                aria-label={t('lineupSyncDeletePlaceholder')}
              />
            </>
          )}
        </>
      )}

      <div className={styles.lineupSyncActions}>
        <button
          className={styles.saveButton}
          type="button"
          onClick={handleCheck}
          disabled={!online || uiState === 'loading' || uiState === 'applying'}
        >
          {uiState === 'loading' ? t('lineupSyncChecking') : t('lineupSyncCheckButton')}
        </button>

        {showApply && (
          <button
            className={styles.saveButton}
            type="button"
            onClick={handleApply}
            disabled={!online || uiState === 'applying' || blockedDeletesNeedConfirm}
          >
            {uiState === 'applying' ? t('lineupSyncApplying') : t('lineupSyncApplyButton')}
          </button>
        )}
      </div>
    </div>
  );
}
