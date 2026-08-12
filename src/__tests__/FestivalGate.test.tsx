import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import FestivalGate, { FeatureRoute } from '../components/FestivalGate';
import type { Festival } from '../types/festival';

const mocks = vi.hoisted(() => ({
  useActiveFestival: vi.fn(),
}));

vi.mock('../hooks/useActiveFestival', () => ({
  useActiveFestival: () => mocks.useActiveFestival(),
}));

vi.mock('../components/AuthBootstrapShell', () => ({
  default: () => <div>bootstrapping</div>,
}));

const wacken: Festival = {
  id: 'f1',
  slug: 'wacken-2026',
  name: 'Wacken',
  timezone: 'Europe/Berlin',
  starts_at: '2026-07-27T00:00:00+02:00',
  ends_at: '2026-08-02T03:00:00+02:00',
  features: { map: true, wrap: true },
  cache_version: '1',
};

function renderGate() {
  return render(
    <MemoryRouter initialEntries={['/now']}>
      <Routes>
        <Route
          path="/now"
          element={
            <FestivalGate>
              <div>festival content</div>
            </FestivalGate>
          }
        />
        <Route path="/festivals" element={<div>festivals catalog</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderFeatureRoute(feature: 'map' | 'wrap', festival: Festival | null) {
  mocks.useActiveFestival.mockReturnValue({
    ready: true,
    memberships: festival ? [{ user_id: 'u1', festival_id: festival.id, opted_in_at: '2026-01-01T00:00:00Z' }] : [],
    activeFestivalId: festival?.id ?? null,
    festival,
  });
  return render(
    <MemoryRouter initialEntries={['/map']}>
      <Routes>
        <Route
          path="/map"
          element={
            <FeatureRoute feature={feature}>
              <div>feature content</div>
            </FeatureRoute>
          }
        />
        <Route path="/now" element={<div>now page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

describe('FestivalGate', () => {
  it('shows loading shell while festival context is not ready', () => {
    mocks.useActiveFestival.mockReturnValue({
      ready: false,
      memberships: [],
      activeFestivalId: null,
    });
    renderGate();
    expect(screen.getByText('bootstrapping')).toBeInTheDocument();
  });

  it('redirects to /festivals when user has no memberships', () => {
    mocks.useActiveFestival.mockReturnValue({
      ready: true,
      memberships: [],
      activeFestivalId: null,
    });
    renderGate();
    expect(screen.getByText('festivals catalog')).toBeInTheDocument();
  });

  it('redirects to /festivals when memberships exist but no active festival', () => {
    mocks.useActiveFestival.mockReturnValue({
      ready: true,
      memberships: [{ user_id: 'u1', festival_id: 'f1', opted_in_at: '2026-01-01T00:00:00Z' }],
      activeFestivalId: null,
    });
    renderGate();
    expect(screen.getByText('festivals catalog')).toBeInTheDocument();
  });

  it('renders children when ready with active membership', () => {
    mocks.useActiveFestival.mockReturnValue({
      ready: true,
      memberships: [{ user_id: 'u1', festival_id: 'f1', opted_in_at: '2026-01-01T00:00:00Z' }],
      activeFestivalId: 'f1',
    });
    renderGate();
    expect(screen.getByText('festival content')).toBeInTheDocument();
  });

  it('allows through offline when activeFestivalId is set even if memberships empty', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    mocks.useActiveFestival.mockReturnValue({
      ready: true,
      memberships: [],
      activeFestivalId: 'f1',
    });
    renderGate();
    expect(screen.getByText('festival content')).toBeInTheDocument();
  });

  it('still redirects offline when activeFestivalId is missing', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    mocks.useActiveFestival.mockReturnValue({
      ready: true,
      memberships: [],
      activeFestivalId: null,
    });
    renderGate();
    expect(screen.getByText('festivals catalog')).toBeInTheDocument();
  });
});

describe('FeatureRoute', () => {
  it('renders children when the festival has the feature', () => {
    renderFeatureRoute('map', wacken);
    expect(screen.getByText('feature content')).toBeInTheDocument();
  });

  it('redirects to /now when the feature is missing', () => {
    renderFeatureRoute('map', { ...wacken, features: {} });
    expect(screen.getByText('now page')).toBeInTheDocument();
  });

  it('redirects to /now when there is no active festival', () => {
    renderFeatureRoute('wrap', null);
    expect(screen.getByText('now page')).toBeInTheDocument();
  });
});
