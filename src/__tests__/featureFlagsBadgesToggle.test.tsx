import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';

// One in-memory app_settings row shared by reads and writes, so a toggle written
// through featureFlags.set() is visible to the next featureFlags.get(). That is
// what makes the Context refresh assertion meaningful instead of tautological.
const mocks = vi.hoisted(() => {
  const row: Record<string, unknown> = {
    id: 'app-settings-row-id',
    registration_enabled: true,
    duck_enabled: true,
    playlist_testing: true,
    moshsplit_enabled: false,
    badges_enabled: false,
  };

  // Reads for a gated column hang until the test releases them, which is how the
  // "initial fetch still pending" window is held open long enough to assert on.
  const gates = new Map<string, Promise<void>>();
  function holdColumn(columns: string) {
    let release!: () => void;
    gates.set(
      columns,
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    return () => {
      gates.delete(columns);
      release();
    };
  }

  // featureFlags.get() builds `.select(col).limit(1).single()` as one synchronous
  // chain, so the column recorded by the last select() is still the right one when
  // single() runs.
  let lastColumns = '';
  const mockSingle = vi.fn(async () => {
    const gate = gates.get(lastColumns);
    if (gate) await gate;
    if (lastColumns === 'badges_enabled' && failBadgeReads) {
      return { data: null, error: { message: 'offline' } };
    }
    return { data: { ...row }, error: null };
  });
  const mockLimit = vi.fn(() => ({ single: mockSingle }));
  const mockEq = vi.fn(async () => ({ error: null }));
  let failBadgeReads = false;
  const mockUpdate = vi.fn((payload: Record<string, unknown>) => {
    Object.assign(row, payload);
    if ('badges_enabled' in payload) failBadgeReads = true;
    return { eq: mockEq };
  });
  const mockSelect = vi.fn((columns: string) => {
    lastColumns = columns;
    return { limit: mockLimit };
  });
  const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }));
  return {
    row,
    gates,
    holdColumn,
    mockFrom,
    mockSingle,
    mockUpdate,
    mockEq,
    mockSelect,
    resetReadFailure: () => { failBadgeReads = false; },
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: { from: mocks.mockFrom },
}));

import FeatureFlagsSection from '../components/profile/FeatureFlagsSection';
import { BadgesEnabledProvider, useBadgesEnabled } from '../contexts/BadgesEnabledContext';

// Identity `t` so queries can target translation keys directly.
const t = (key: string) => key;

function ProbeBadgesEnabled({ onValue }: { onValue: (value: boolean) => void }) {
  const value = useBadgesEnabled();
  useEffect(() => {
    onValue(value);
  }, [onValue, value]);
  return null;
}

function renderSection(showDuckToggle?: boolean, onValue?: (value: boolean) => void) {
  return render(
    <BadgesEnabledProvider>
      <FeatureFlagsSection t={t} showDuckToggle={showDuckToggle} />
      {onValue && <ProbeBadgesEnabled onValue={onValue} />}
    </BadgesEnabledProvider>,
  );
}

describe('FeatureFlagsSection — badges toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.gates.clear();
    mocks.resetReadFailure();
    mocks.row.badges_enabled = false;
    mocks.row.duck_enabled = true;
  });

  it('renders the badges row first, reflecting normal ON semantics', async () => {
    mocks.row.badges_enabled = true;

    const { container } = renderSection(true);

    const badgesPill = await screen.findByRole('button', { name: 'badgesToggle' });
    // Normal semantics: badges_enabled = true renders as ON (unlike playlistToggle,
    // which inverts its flag).
    await waitFor(() => {
      expect(badgesPill).toHaveAttribute('aria-pressed', 'true');
    });

    const pills = Array.from(container.querySelectorAll('[aria-pressed]'));
    expect(pills[0]).toBe(badgesPill);
  });

  it('keeps the pill and Context on after a successful write without a post-write read', async () => {
    const observed: boolean[] = [];
    renderSection(true, (v) => observed.push(v));

    const badgesPill = await screen.findByRole('button', { name: 'badgesToggle' });
    await waitFor(() => {
      expect(badgesPill).toBeEnabled();
    });
    expect(badgesPill).toHaveAttribute('aria-pressed', 'false');
    expect(observed[observed.length - 1]).toBe(false);
    const initialBadgeReads = mocks.mockSelect.mock.calls.filter(
      ([columns]) => columns === 'badges_enabled',
    ).length;

    await userEvent.click(badgesPill);

    await waitFor(() => {
      expect(badgesPill).toHaveAttribute('aria-pressed', 'true');
    });

    const badgeWrites = mocks.mockUpdate.mock.calls
      .map(([payload]) => payload as Record<string, unknown>)
      .filter((payload) => 'badges_enabled' in payload);
    expect(badgeWrites).toHaveLength(1);
    expect(badgeWrites[0].badges_enabled).toBe(true);

    // The vest follows within the same session — no reload required.
    await waitFor(() => {
      expect(observed[observed.length - 1]).toBe(true);
    });

    // The write makes all later badge reads return an offline error. The UI
    // remains ON because the known persisted value is applied directly.
    expect(
      mocks.mockSelect.mock.calls.filter(([columns]) => columns === 'badges_enabled'),
    ).toHaveLength(initialBadgeReads);
  });

  // Without this gate the pill would be clickable while `badgesFeatureEnabled` is
  // still the placeholder `false`, so a click on an already-enabled flag would
  // write `true` — negating the placeholder instead of the stored value.
  it('disables the badges pill until the initial read settles, then enables it', async () => {
    mocks.row.badges_enabled = true;
    const releaseBadgesRead = mocks.holdColumn('badges_enabled');

    try {
      renderSection(true);

      const badgesPill = await screen.findByRole('button', { name: 'badgesToggle' });
      expect(badgesPill).toBeDisabled();

      // Other rows resolved normally, proving the disabled state is specific to the
      // pending badges read rather than the whole card being stuck.
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'duckToggle' })).toBeEnabled();
      });

      await userEvent.click(badgesPill);
      expect(mocks.mockUpdate).not.toHaveBeenCalled();
      expect(badgesPill).toHaveAttribute('aria-pressed', 'false');

      await act(async () => {
        releaseBadgesRead();
      });

      await waitFor(() => {
        expect(badgesPill).toBeEnabled();
      });
      // The stored value lands only after settlement, and no write happened in the
      // meantime.
      expect(badgesPill).toHaveAttribute('aria-pressed', 'true');
      expect(mocks.mockUpdate).not.toHaveBeenCalled();
    } finally {
      releaseBadgesRead();
    }
  });

  it('omits the duck row and never reads duck_enabled when showDuckToggle is false', async () => {
    renderSection(false);

    await screen.findByRole('button', { name: 'badgesToggle' });
    expect(screen.queryByRole('button', { name: 'duckToggle' })).not.toBeInTheDocument();
    expect(mocks.mockSelect).not.toHaveBeenCalledWith('duck_enabled');
  });

  it('renders the duck row when showDuckToggle is true', async () => {
    renderSection(true);

    expect(await screen.findByRole('button', { name: 'duckToggle' })).toBeInTheDocument();
    expect(mocks.mockSelect).toHaveBeenCalledWith('duck_enabled');
  });
});
