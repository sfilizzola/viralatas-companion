import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CampingLocationAdminSection from '../components/profile/CampingLocationAdminSection';

vi.mock('../lib/db', () => ({
  loadCampLocation: vi.fn().mockResolvedValue(null),
}));

vi.mock('../repositories', () => ({
  campLocationRepository: {
    saveCampLocationRemote: vi.fn().mockResolvedValue(undefined),
    clearCampLocationRemote: vi.fn().mockResolvedValue(undefined),
  },
}));

import { campLocationRepository } from '../repositories';

const t = (key: string) => key;

describe('CampingLocationAdminSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows validation error for invalid input', async () => {
    render(<CampingLocationAdminSection t={t} />);
    const input = await screen.findByLabelText('GPS');
    fireEvent.change(input, { target: { value: 'not-coords' } });
    fireEvent.click(screen.getByText('campLocationSave'));
    await waitFor(() => {
      expect(screen.getByText(/campLocationInvalidFormat/)).toBeTruthy();
    });
    expect(campLocationRepository.saveCampLocationRemote).not.toHaveBeenCalled();
  });

  it('saves valid coordinates', async () => {
    render(<CampingLocationAdminSection t={t} />);
    const input = await screen.findByLabelText('GPS');
    fireEvent.change(input, { target: { value: '54.037809, 9.368845' } });
    fireEvent.click(screen.getByText('campLocationSave'));
    await waitFor(() => {
      expect(campLocationRepository.saveCampLocationRemote).toHaveBeenCalledWith({
        lat: 54.037809,
        lng: 9.368845,
      });
    });
  });
});
