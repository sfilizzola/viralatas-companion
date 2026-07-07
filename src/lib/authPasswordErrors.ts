/** Map Supabase auth password errors to safe user-facing copy (no password oracle). */
export function mapPasswordUpdateError(
  message: string,
  t: (key: string) => string,
): string {
  const lower = message.toLowerCase();

  if (
    lower.includes('different from the old') ||
    lower.includes('same as the old') ||
    lower.includes('should be different')
  ) {
    return t('resetPasswordUpdateError');
  }

  if (lower.includes('at least') && lower.includes('character')) {
    return t('resetPasswordTooShort');
  }

  return t('resetPasswordUpdateError');
}
