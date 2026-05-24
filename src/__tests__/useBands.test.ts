import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteViralatasDatabase, installFakeIndexedDB } from './helpers/fakeIdb';

installFakeIndexedDB();

import { resetDbConnectionForTests, saveBands } from '../lib/db';
import { useBands } from '../hooks/useBands';
import type { Band } from '../types';

const sampleBand: Band = {
  id: 'band-1',
  slot_id: 'FAS1',
  name: 'Test Band',
  stage: 'Faster',
  start_time: '2026-07-29T18:00:00Z',
  end_time: '2026-07-29T19:00:00Z',
  image_url: null,
  genre: 'Thrash',
  category: 'band',
};

beforeEach(async () => {
  await resetDbConnectionForTests();
  await deleteViralatasDatabase();
});

describe('useBands', () => {
  it('loads bands from IDB on mount', async () => {
    await saveBands([sampleBand]);
    const { result } = renderHook(() => useBands());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.bands).toHaveLength(1);
    expect(result.current.bands[0]?.id).toBe('band-1');
  });

  it('updates when bands sync writes to IDB', async () => {
    const { result } = renderHook(() => useBands());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.bands).toEqual([]);

    await saveBands([sampleBand]);
    await waitFor(() => expect(result.current.bands).toHaveLength(1));
  });
});
