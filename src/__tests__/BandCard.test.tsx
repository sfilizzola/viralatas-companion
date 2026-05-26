import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import BandCard from '../components/BandCard';
import { I18nContext } from '../lib/i18n';
import type { Band } from '../types';

function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nContext.Provider value={{ language: 'en', setLanguage: () => {} }}>
      {ui}
    </I18nContext.Provider>,
  );
}

const sampleBand: Band = {
  id: 'b1',
  slot_id: 'FAS1',
  name: 'Iron Maiden',
  stage: 'Faster',
  start_time: '2026-07-29T19:00:00Z',
  end_time: '2026-07-29T20:30:00Z',
  image_url: null,
  genre: 'Heavy Metal',
  category: 'band',
};

describe('BandCard', () => {
  it('does not toggle when the card body is clicked and no onClick is supplied', () => {
    const onToggle = vi.fn();
    const { container } = renderWithI18n(
      <BandCard band={sampleBand} isPicked={false} count={3} onToggle={onToggle} />,
    );

    const article = container.querySelector('article');
    expect(article).not.toBeNull();
    fireEvent.click(article!);

    expect(onToggle).not.toHaveBeenCalled();
  });

  it('calls onClick (and not onToggle) when onClick is supplied', () => {
    const onToggle = vi.fn();
    const onClick = vi.fn();
    const { getByRole } = renderWithI18n(
      <BandCard
        band={sampleBand}
        isPicked={false}
        count={3}
        onToggle={onToggle}
        onClick={onClick}
        variant="ranked"
      />,
    );

    fireEvent.click(getByRole('button', { name: /Iron Maiden/i }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('still calls onToggle when the pick button is clicked, even with onClick set', () => {
    const onToggle = vi.fn();
    const onClick = vi.fn();
    const { getByLabelText } = renderWithI18n(
      <BandCard
        band={sampleBand}
        isPicked={false}
        count={3}
        onToggle={onToggle}
        onClick={onClick}
      />,
    );

    fireEvent.click(getByLabelText('Add pick'));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('hides the pick button when hidePickButton is true', () => {
    const { queryByLabelText } = renderWithI18n(
      <BandCard
        band={sampleBand}
        isPicked={false}
        count={3}
        onToggle={vi.fn()}
        variant="ranked"
      />,
    );

    expect(queryByLabelText('Add pick')).toBeNull();
    expect(queryByLabelText('Remove pick')).toBeNull();
  });

  it('triggers onClick on Enter key when onClick is supplied', () => {
    const onClick = vi.fn();
    const onToggle = vi.fn();
    const { getByRole } = renderWithI18n(
      <BandCard
        band={sampleBand}
        isPicked={false}
        count={3}
        onToggle={onToggle}
        onClick={onClick}
        variant="ranked"
      />,
    );

    fireEvent.keyDown(getByRole('button', { name: /Iron Maiden/i }), { key: 'Enter' });

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows corner day label on schedule variant when showDayLabel is true', () => {
    const { container } = renderWithI18n(
      <BandCard
        band={sampleBand}
        isPicked={false}
        count={3}
        onToggle={vi.fn()}
        showDayLabel
      />,
    );

    const dayGhost = container.querySelector('span[class*="dayGhost"]');
    expect(dayGhost).not.toBeNull();
    expect(dayGhost?.textContent).toBe('Wed');
  });

  it('hides corner day label when showDayLabel is false', () => {
    const { container } = renderWithI18n(
      <BandCard band={sampleBand} isPicked={false} count={3} onToggle={vi.fn()} />,
    );

    expect(container.querySelector('span[class*="dayGhost"]')).toBeNull();
  });

  it('shows corner day label on ranked variant when showDayLabel is true', () => {
    const { container } = renderWithI18n(
      <BandCard
        band={sampleBand}
        isPicked={false}
        count={3}
        onToggle={vi.fn()}
        variant="ranked"
        rank={1}
        showDayLabel
      />,
    );

    expect(container.querySelector('span[class*="dayGhost"]')?.textContent).toBe('Wed');
  });
});
