import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({
  badgesEnabled: false,
}));

vi.mock('../contexts/BadgesEnabledContext', () => ({
  useBadgesEnabled: () => mocks.badgesEnabled,
}));
vi.mock('../lib/db', () => ({
  CREW_USERS_CHANGED_EVENT: 'viralatas:crew-users-changed',
  loadCrewUsers: vi.fn().mockResolvedValue([]),
}));
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { updateUser: vi.fn() },
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}));
vi.mock('../components/profile/PatchesBackgroundPicker', () => ({
  default: () => <div data-testid="patches-background-picker" />,
}));
vi.mock('../components/profile/PatchesLayoutToggle', () => ({
  default: () => <div data-testid="patches-layout-toggle" />,
}));

import EditProfileForm from '../components/profile/EditProfileForm';

const user = {
  id: 'user-1',
  user_metadata: {},
} as User;

function renderForm() {
  return render(
    <EditProfileForm
      user={user}
      displayName="Vira Lata"
      language="en"
      setLanguage={vi.fn()}
      currentAvatarUrl={null}
      onAvatarChange={vi.fn()}
      t={(key) => key}
    />,
  );
}

describe('EditProfileForm badge preference gate', () => {
  beforeEach(() => {
    mocks.badgesEnabled = false;
  });

  it('hides the complete patch preference block when badges are disabled', () => {
    const { unmount } = renderForm();
    expect(screen.queryByText('patchesBackground')).not.toBeInTheDocument();
    expect(screen.queryByTestId('patches-background-picker')).not.toBeInTheDocument();
    expect(screen.queryByTestId('patches-layout-toggle')).not.toBeInTheDocument();

    unmount();
    mocks.badgesEnabled = true;
    renderForm();
    expect(screen.getByText('patchesBackground')).toBeInTheDocument();
    expect(screen.getByTestId('patches-background-picker')).toBeInTheDocument();
    expect(screen.getByTestId('patches-layout-toggle')).toBeInTheDocument();
  });
});
