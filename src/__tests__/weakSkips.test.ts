import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUser, updateUser } = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser,
      updateUser,
    },
  },
}));

import {
  WEAK_SKIPS_2026_KEY,
  getWeakSkipCount,
  recordCommittedSkip,
} from '../services/weakSkips';

beforeEach(() => {
  getUser.mockReset();
  updateUser.mockReset();
  updateUser.mockReturnValue({ catch: vi.fn() });
});

describe('getWeakSkipCount', () => {
  it('returns 0 when key is missing', () => {
    expect(getWeakSkipCount(undefined)).toBe(0);
    expect(getWeakSkipCount({})).toBe(0);
  });

  it('returns 0 for invalid values', () => {
    expect(getWeakSkipCount({ [WEAK_SKIPS_2026_KEY]: '3' })).toBe(0);
    expect(getWeakSkipCount({ [WEAK_SKIPS_2026_KEY]: -1 })).toBe(0);
    expect(getWeakSkipCount({ [WEAK_SKIPS_2026_KEY]: NaN })).toBe(0);
  });

  it('reads an existing non-negative integer count', () => {
    expect(getWeakSkipCount({ [WEAK_SKIPS_2026_KEY]: 4 })).toBe(4);
    expect(getWeakSkipCount({ [WEAK_SKIPS_2026_KEY]: 2.9 })).toBe(2);
  });
});

describe('recordCommittedSkip', () => {
  it('increments weak_skips_2026 via updateUser', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          user_metadata: { [WEAK_SKIPS_2026_KEY]: 2 },
        },
      },
    });

    await recordCommittedSkip('user-1', 'band-a');

    expect(updateUser).toHaveBeenCalledWith({
      data: { [WEAK_SKIPS_2026_KEY]: 3 },
    });
  });

  it('starts from 0 when metadata key is missing', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          user_metadata: {},
        },
      },
    });

    await recordCommittedSkip('user-1', 'band-a');

    expect(updateUser).toHaveBeenCalledWith({
      data: { [WEAK_SKIPS_2026_KEY]: 1 },
    });
  });

  it('does nothing when no authenticated user', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    await recordCommittedSkip('user-1', 'band-a');

    expect(updateUser).not.toHaveBeenCalled();
  });

  it('does nothing when authenticated user id does not match', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'other-user',
          user_metadata: { [WEAK_SKIPS_2026_KEY]: 1 },
        },
      },
    });

    await recordCommittedSkip('user-1', 'band-a');

    expect(updateUser).not.toHaveBeenCalled();
  });
});
