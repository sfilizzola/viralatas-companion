import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import FestivalGate from '../components/FestivalGate';

const mocks = vi.hoisted(() => ({
  useActiveFestival: vi.fn(),
}));

vi.mock('../hooks/useActiveFestival', () => ({
  useActiveFestival: () => mocks.useActiveFestival(),
}));

vi.mock('../components/AuthBootstrapShell', () => ({
  default: () => <div>bootstrapping</div>,
}));

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

beforeEach(() => {
  vi.clearAllMocks();
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
});
