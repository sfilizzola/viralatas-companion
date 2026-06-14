import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { I18nContext } from '../../lib/i18n';

export function mockT(key: string, params?: Record<string, unknown>): string {
  if (params && 'count' in params) return `${key}:${params.count}`;
  if (params && 'score' in params) return `${key}:${params.score}`;
  return key;
}

export function renderWithI18n(ui: ReactElement) {
  return render(
    <I18nContext.Provider value={{ language: 'en', setLanguage: () => {} }}>
      {ui}
    </I18nContext.Provider>,
  );
}

export function I18nWrapper({ children }: { children: ReactNode }) {
  return (
    <I18nContext.Provider value={{ language: 'en', setLanguage: () => {} }}>
      {children}
    </I18nContext.Provider>
  );
}
