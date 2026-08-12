import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadUsefulLinks,
  resetUsefulLinksCacheForTests,
} from '../services/usefulLinks';

describe('loadUsefulLinks', () => {
  beforeEach(() => {
    resetUsefulLinksCacheForTests();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          links: [
            { title: 'Fallback', url: 'https://example.com/fallback' },
          ],
          linksByFestival: {
            'summer-breeze-2026': [
              { title: 'Top Up', url: 'https://sboa26.eventportal.io' },
              {
                title: 'Festival Map',
                url: 'https://www.summer-breeze.de/map.pdf',
              },
              { title: 'Splitwise', url: 'https://secure.splitwise.com/#/groups/1' },
              {
                title: 'Instagram @viralatasmetaleiros',
                url: 'https://www.instagram.com/viralatasmetaleiros/',
              },
            ],
            'wacken-2026': [
              { title: 'Top Up', url: 'https://eventportal.io/wacken' },
              { title: 'Bus Schedule', url: 'https://www.wacken.com/bus.pdf' },
            ],
          },
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetUsefulLinksCacheForTests();
  });

  it('returns Active Festival links when slug is known', async () => {
    const links = await loadUsefulLinks('summer-breeze-2026');
    expect(links.map((l) => l.title)).toEqual([
      'Top Up',
      'Festival Map',
      'Splitwise',
      'Instagram @viralatasmetaleiros',
    ]);
    expect(links[0].url).toBe('https://sboa26.eventportal.io');
  });

  it('falls back to top-level links for unknown slug', async () => {
    const links = await loadUsefulLinks('unknown-fest');
    expect(links).toEqual([{ title: 'Fallback', url: 'https://example.com/fallback' }]);
  });

  it('falls back when slug is null', async () => {
    const links = await loadUsefulLinks(null);
    expect(links[0].title).toBe('Fallback');
  });
});
