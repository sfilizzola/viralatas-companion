import { describe, it, expect } from 'vitest';
import { mapPasswordUpdateError } from '../lib/authPasswordErrors';

const t = (key: string) => key;

describe('mapPasswordUpdateError', () => {
  it('maps same-password oracle errors to generic key', () => {
    expect(
      mapPasswordUpdateError('New password should be different from the old password.', t),
    ).toBe('resetPasswordUpdateError');
  });

  it('maps length errors to resetPasswordTooShort', () => {
    expect(mapPasswordUpdateError('Password should be at least 6 characters.', t)).toBe(
      'resetPasswordTooShort',
    );
  });

  it('maps unknown errors to generic key', () => {
    expect(mapPasswordUpdateError('Something went wrong', t)).toBe('resetPasswordUpdateError');
  });
});
