import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CampHqCard from '../components/camp/CampHqCard';

vi.mock('../hooks/useCampLocation', () => ({
  useCampLocation: vi.fn(),
}));

vi.mock('../services/campLocation', () => ({
  openCampInMaps: vi.fn(),
}));

import { useCampLocation } from '../hooks/useCampLocation';
import { openCampInMaps } from '../services/campLocation';

vi.mock('../lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

describe('CampHqCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when location is null', () => {
    vi.mocked(useCampLocation).mockReturnValue(null);
    const { container } = render(<CampHqCard />);
    expect(container.firstChild).toBeNull();
  });

  it('renders title when location is set', () => {
    vi.mocked(useCampLocation).mockReturnValue({ lat: 54.037809, lng: 9.368845 });
    render(<CampHqCard />);
    expect(screen.getByText('campHqTitle')).toBeTruthy();
  });

  it('opens maps on short tap', () => {
    vi.mocked(useCampLocation).mockReturnValue({ lat: 54, lng: 9 });
    render(<CampHqCard />);
    const btn = screen.getByRole('button', { name: 'campHqTitle' });
    fireEvent.pointerDown(btn);
    fireEvent.pointerUp(btn);
    expect(openCampInMaps).toHaveBeenCalledWith({ lat: 54, lng: 9 });
  });
});
