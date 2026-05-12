import { describe, it, expect } from 'vitest';
import { computeAttendees } from '../services/attendees';
import type { UserPick, CrewUser } from '../types';

function makeCrewUser(
  id: string,
  displayName: string | null = null,
  avatarUrl: string | null = null,
): CrewUser {
  return { id, display_name: displayName, avatar_url: avatarUrl, wacken_arrival_day: null };
}

function makePick(userId: string, bandId: string): UserPick {
  return { user_id: userId, band_id: bandId, created_at: '2026-07-29T10:00:00Z' };
}

describe('computeAttendees', () => {
  it('returns empty map for empty picks', () => {
    const result = computeAttendees([], [makeCrewUser('user1', 'Alice')]);
    expect(result).toEqual({});
  });

  it('groups picks by band_id', () => {
    const picks = [
      makePick('user1', 'band-a'),
      makePick('user2', 'band-a'),
      makePick('user3', 'band-b'),
    ];
    const crew = [
      makeCrewUser('user1', 'Alice'),
      makeCrewUser('user2', 'Bob'),
      makeCrewUser('user3', 'Charlie'),
    ];
    const result = computeAttendees(picks, crew);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result['band-a']).toHaveLength(2);
    expect(result['band-b']).toHaveLength(1);
  });

  it('hydrates entries with matching CrewUser display name', () => {
    const picks = [makePick('user1', 'band-a')];
    const crew = [makeCrewUser('user1', 'Alice Metalhead', 'https://example.com/avatar.png')];
    const result = computeAttendees(picks, crew);

    const attendee = result['band-a'][0];
    expect(attendee.id).toBe('user1');
    expect(attendee.display_name).toBe('Alice Metalhead');
    expect(attendee.avatar_url).toBe('https://example.com/avatar.png');
    expect(attendee.label).toBe('Alice Metalhead');
  });

  it('uses fallback label for users missing from crew list', () => {
    const picks = [makePick('abcd1234', 'band-a')];
    const result = computeAttendees(picks, []);

    const attendee = result['band-a'][0];
    expect(attendee.id).toBe('abcd1234');
    expect(attendee.label).toBe('Vira-lata ABCD');
  });

  it('uses fallback label when display_name is null', () => {
    const picks = [makePick('xyz99999', 'band-a')];
    const crew = [makeCrewUser('xyz99999', null)];
    const result = computeAttendees(picks, crew);

    expect(result['band-a'][0].label).toBe('Vira-lata XYZ9');
  });

  it('uses fallback label when display_name is whitespace-only', () => {
    const picks = [makePick('abc12345', 'band-a')];
    const crew = [makeCrewUser('abc12345', '   ')];
    const result = computeAttendees(picks, crew);

    expect(result['band-a'][0].label).toBe('Vira-lata ABC1');
  });

  it('each band has its own independent attendee list', () => {
    const picks = [
      makePick('user1', 'band-x'),
      makePick('user2', 'band-y'),
    ];
    const crew = [makeCrewUser('user1', 'Alice'), makeCrewUser('user2', 'Bob')];
    const result = computeAttendees(picks, crew);

    expect(result['band-x']).toHaveLength(1);
    expect(result['band-x'][0].id).toBe('user1');
    expect(result['band-y']).toHaveLength(1);
    expect(result['band-y'][0].id).toBe('user2');
  });

  it('attendees within a band are sorted alphabetically by label', () => {
    const picks = [
      makePick('user1', 'band-a'),
      makePick('user2', 'band-a'),
      makePick('user3', 'band-a'),
    ];
    const crew = [
      makeCrewUser('user1', 'Zara'),
      makeCrewUser('user2', 'Alice'),
      makeCrewUser('user3', 'Mike'),
    ];
    const result = computeAttendees(picks, crew);
    const labels = result['band-a'].map((a) => a.label);
    expect(labels).toEqual(['Alice', 'Mike', 'Zara']);
  });
});
