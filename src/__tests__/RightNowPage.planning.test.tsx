import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { I18nContext, type Language } from '../lib/i18n';
import type { Band, CrewUser } from '../types';
import type { Festival } from '../types/festival';
import type { PlanningNowData } from '../hooks/usePlanningNowData';

const mocks = vi.hoisted(() => ({
  festival: null as Festival | null,
  planningData: null as PlanningNowData | null,
  useNowData: vi.fn(),
  useBadgesEnabled: vi.fn(() => true),
}));

vi.mock('../hooks/useActiveFestival', () => ({
  useActiveFestival: () => ({ festival: mocks.festival }),
}));

vi.mock('../hooks/usePlanningNowData', () => ({
  usePlanningNowData: () => mocks.planningData,
}));

vi.mock('../hooks/useNowData', () => ({
  useNowData: mocks.useNowData,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ session: { user: { id: 'self' } } }),
}));

vi.mock('../hooks/usePickActions', () => ({
  usePickActions: () => ({ pickedIds: new Set(), togglePick: vi.fn() }),
}));

vi.mock('../hooks/useBandAttendees', () => ({
  useBandAttendees: () => ({}),
}));

vi.mock('../hooks/useMissedBands', () => ({
  useMissedBands: () => ({
    allMissed: [],
    missedBandIds: new Set(),
    toggleMissed: vi.fn(),
  }),
}));

vi.mock('../hooks/useBandRatings', () => ({
  useBandRatings: () => ({
    userRatingByBand: {},
    toggleRating: vi.fn(),
    clearRating: vi.fn(),
  }),
}));

vi.mock('../contexts/DuckEnabledContext', () => ({
  useDuckEnabled: () => false,
}));

vi.mock('../contexts/BadgesEnabledContext', () => ({
  useBadgesEnabled: mocks.useBadgesEnabled,
}));

vi.mock('../hooks/useDuckQuack', () => ({
  useDuckQuack: () => ({ quack: vi.fn(), cooldownUntil: null }),
}));

vi.mock('../hooks/useWrapTeaserVisible', () => ({
  useWrapTeaserVisible: () => false,
}));

vi.mock('../components/OfflineBanner', () => ({ default: () => <div data-testid="offline-banner" /> }));
vi.mock('../components/FestivalSwitcher', () => ({
  default: () => <button type="button">Wacken Open Air 2027</button>,
}));
vi.mock('../components/BottomNav', () => ({ default: () => <nav data-testid="bottom-nav" /> }));
vi.mock('../components/BadgesDisplay', () => ({
  default: () => <div data-testid="badges-display" />,
}));
vi.mock('../components/PresenceToggle', () => ({ default: () => <div>Where am I?</div> }));
vi.mock('../components/now/LatestAnnouncementBanner', () => ({ default: () => null }));
vi.mock('../components/now/UpcomingBandCard', () => ({ default: () => <div>Next pick</div> }));
vi.mock('../components/wrap/WrapTeaserBanner', () => ({ default: () => null }));
vi.mock('../components/now/CrewGroupsSection', () => ({ default: () => <div>Vira-latas now</div> }));
vi.mock('../components/now/LiveCardSheet', () => ({ default: () => null }));
vi.mock('../components/now/StageRadarSection', () => ({ default: () => <div>Stage radar</div> }));
vi.mock('../components/now/StageRadarSheet', () => ({ default: () => null }));
vi.mock('../components/StageScheduleSheet', () => ({ default: () => <div>Stages</div> }));
vi.mock('../components/BandDetailModalHost', () => ({
  BandDetailModalHost: ({ modalProps }: { modalProps: { band: Band } | null }) =>
    modalProps ? <div data-testid="band-modal">{modalProps.band.name}</div> : null,
}));

import RightNowPage from '../pages/RightNowPage';

const ANNOUNCEMENT_FESTIVAL: Festival = {
  id: 'festival-1',
  slug: 'wacken-2027',
  name: 'Wacken Open Air 2027',
  timezone: 'Europe/Berlin',
  starts_at: '2027-07-28T00:00:00+02:00',
  ends_at: '2027-07-31T23:00:00+02:00',
  features: { running_order: false, camp: true, map: true },
  cache_version: '1',
};

const LIVE_FESTIVAL: Festival = {
  ...ANNOUNCEMENT_FESTIVAL,
  features: { running_order: true },
};

function band(id: string, name: string): Band {
  return {
    id,
    festival_id: ANNOUNCEMENT_FESTIVAL.id,
    slot_id: null,
    name,
    stage: 'Leftover Stage',
    start_time: '2027-07-28T18:00:00Z',
    end_time: '2027-07-28T19:00:00Z',
    image_url: null,
    genre: 'Metal',
    category: 'band',
    created_at: `2027-0${id.length}-01T00:00:00Z`,
  };
}

function member(id: string, name: string): CrewUser {
  return {
    id,
    display_name: name,
    avatar_url: null,
    wacken_arrival_day: null,
    is_friend: false,
  };
}

const BANDS = [band('one', 'Crypta'), band('two-two', 'Amenra'), band('three-three', 'Kreator')];
const MEMBERS = [
  member('one', 'Ana'),
  member('two', 'Bruno'),
  member('three', 'Carla'),
  member('four', 'Diogo'),
  member('five', 'Eva'),
];

function planningData(overrides: Partial<PlanningNowData> = {}): PlanningNowData {
  return {
    festival: ANNOUNCEMENT_FESTIVAL,
    bands: BANDS,
    members: MEMBERS,
    newestBands: BANDS,
    activity: [
      {
        member: MEMBERS[1],
        band: BANDS[1],
        pick: {
          user_id: MEMBERS[1].id,
          band_id: BANDS[1].id,
          festival_id: ANNOUNCEMENT_FESTIVAL.id,
          created_at: '2027-06-01T12:00:00Z',
        },
      },
    ],
    countdown: { kind: 'days', days: 57 },
    now: new Date('2027-06-01T13:00:00Z'),
    loading: false,
    ...overrides,
  };
}

function renderPage(language: Language = 'en') {
  return render(
    <I18nContext.Provider value={{ language, setLanguage: vi.fn() }}>
      <MemoryRouter>
        <RightNowPage />
      </MemoryRouter>
    </I18nContext.Provider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.festival = ANNOUNCEMENT_FESTIVAL;
  mocks.planningData = planningData();
  mocks.useBadgesEnabled.mockReturnValue(true);
  mocks.useNowData.mockReturnValue({
    user: null,
    userId: null,
    isFriend: false,
    bands: [],
    picks: [],
    crewUsers: [],
    latestAnnouncement: null,
    now: new Date('2027-07-28T12:00:00Z'),
    loading: false,
    undoState: null,
    metalPlaceConfig: null,
    liveTestBand: null,
    isMetalPlaceWindowActive: false,
    presenceValue: 'none',
    myPlan: { status: 'empty', band: null },
    nextBand: null,
    crewPlans: [],
    crewGroups: [],
    handleSkip: vi.fn(),
    handleUndo: vi.fn(),
    handlePresenceChange: vi.fn(),
    duckBandId: null,
    duckQuack: vi.fn(),
    duckCooldownUntil: null,
  });
});

describe('/now planning branch', () => {
  it('renders planning without mounting live data or live chrome', () => {
    renderPage();

    expect(screen.getByTestId('planning-now')).toBeInTheDocument();
    expect(mocks.useNowData).not.toHaveBeenCalled();
    expect(screen.queryByText('Vira-latas now')).not.toBeInTheDocument();
    expect(screen.queryByText('Where am I?')).not.toBeInTheDocument();
    expect(screen.queryByText('Next pick')).not.toBeInTheDocument();
    expect(screen.queryByText('Stage radar')).not.toBeInTheDocument();
    expect(screen.queryByText('Stages')).not.toBeInTheDocument();
    expect(screen.queryByText('Map')).not.toBeInTheDocument();
    expect(screen.queryByText('Leftover Stage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('badges-display')).not.toBeInTheDocument();
    expect(mocks.useBadgesEnabled).not.toHaveBeenCalled();
  });

  it('keeps the live tree isolated from planning', () => {
    mocks.festival = LIVE_FESTIVAL;

    renderPage();

    expect(mocks.useNowData).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('planning-now')).not.toBeInTheDocument();
    expect(screen.queryByText('Pack status')).not.toBeInTheDocument();
  });

  it('gates the vest only inside the live tree', () => {
    mocks.festival = LIVE_FESTIVAL;
    mocks.useNowData.mockReturnValue({
      ...mocks.useNowData(),
      user: { id: 'self', user_metadata: {} },
      userId: 'self',
    });
    mocks.useBadgesEnabled.mockReturnValue(false);

    const { rerender } = renderPage();
    expect(screen.queryByTestId('badges-display')).not.toBeInTheDocument();

    mocks.useBadgesEnabled.mockReturnValue(true);
    rerender(
      <I18nContext.Provider value={{ language: 'en', setLanguage: vi.fn() }}>
        <MemoryRouter>
          <RightNowPage />
        </MemoryRouter>
      </I18nContext.Provider>,
    );
    expect(screen.getByTestId('badges-display')).toBeInTheDocument();
  });

  it('shows solo and honest empty lineup states while omitting empty activity', () => {
    mocks.planningData = planningData({
      members: [MEMBERS[0]],
      bands: [],
      newestBands: [],
      activity: [],
    });

    renderPage();

    expect(screen.getByText('Just you so far')).toBeInTheDocument();
    expect(screen.getByText('Lineup not posted yet')).toBeInTheDocument();
    expect(screen.queryByText('Pack picks')).not.toBeInTheDocument();
  });

  it('shows Dates TBA for an invalid festival date projection', () => {
    mocks.planningData = planningData({ countdown: { kind: 'tba' } });

    renderPage();

    expect(screen.getByText('Dates TBA')).toBeInTheDocument();
  });

  it('treats a missing catalog row as planning rather than trusting leftover times', () => {
    mocks.festival = null;
    mocks.planningData = planningData({
      festival: null,
      bands: [],
      newestBands: [],
      activity: [],
      countdown: { kind: 'tba' },
    });

    renderPage();

    expect(screen.getByTestId('planning-now')).toBeInTheDocument();
    expect(mocks.useNowData).not.toHaveBeenCalled();
    expect(screen.getByText('Dates TBA')).toBeInTheDocument();
    expect(screen.getByText('Lineup not posted yet')).toBeInTheDocument();
  });

  it('shows Today once gates day has arrived without switching to the live tree', () => {
    mocks.planningData = planningData({ countdown: { kind: 'today' } });

    renderPage();

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByTestId('planning-now')).toBeInTheDocument();
    expect(mocks.useNowData).not.toHaveBeenCalled();
  });

  it('localizes activity time from the planning clock in every locale', () => {
    mocks.planningData = planningData({ now: new Date('2027-06-01T12:30:00Z') });

    for (const [language, expected] of [
      ['en', '30 min'],
      ['br', '30 min'],
      ['es', '30 min'],
      ['de', '30 Min.'],
    ] as const) {
      const { unmount } = renderPage(language);
      expect(screen.getByText(expected)).toBeInTheDocument();
      unmount();
    }
  });

  it('opens the full roster from the pack slab', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /5 vira-latas going/i }));

    expect(screen.getByRole('dialog', { name: 'Vira-latas going' })).toBeInTheDocument();
    for (const rosterMember of MEMBERS) {
      expect(screen.getByText(rosterMember.display_name!)).toBeInTheDocument();
    }
  });

  it('opens the existing Band modal path from newest Band and activity rows', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Crypta/i }));
    expect(screen.getByTestId('band-modal')).toHaveTextContent('Crypta');

    await user.click(screen.getByRole('button', { name: /Bruno picked Amenra/i }));
    expect(screen.getByTestId('band-modal')).toHaveTextContent('Amenra');
  });
});
