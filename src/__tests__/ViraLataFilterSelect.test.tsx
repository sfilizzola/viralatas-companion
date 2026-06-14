import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import ViraLataFilterSelect from '../components/ViraLataFilterSelect';
import type { BandAttendee } from '../hooks/useBandAttendees';
import { renderWithI18n } from './helpers/i18nMock';

const members: BandAttendee[] = [
  {
    id: 'u1',
    label: 'Alice Anderson',
    display_name: 'Alice Anderson',
    avatar_url: null,
    wacken_arrival_day: null,
    is_friend: false,
  },
  {
    id: 'u2',
    label: 'Bob Builder',
    display_name: 'Bob Builder',
    avatar_url: 'https://example.com/bob.jpg',
    wacken_arrival_day: null,
    is_friend: false,
  },
  {
    id: 'u3',
    label: 'Very Long Display Name That Should Truncate',
    display_name: 'Very Long Display Name That Should Truncate',
    avatar_url: null,
    wacken_arrival_day: null,
    is_friend: false,
  },
];

describe('ViraLataFilterSelect', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders prompt when no member is selected', () => {
    renderWithI18n(
      <ViraLataFilterSelect value={null} onChange={vi.fn()} members={members} pickCounts={{}} />,
    );

    expect(screen.getByText('Choose a vira-lata…')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('opens list, selects member, and shows pick count', () => {
    const onChange = vi.fn();
    renderWithI18n(
      <ViraLataFilterSelect
        value={null}
        onChange={onChange}
        members={members}
        pickCounts={{ u2: 7 }}
      />,
    );

    fireEvent.click(screen.getByLabelText('Filter by vira-lata picks'));
    fireEvent.click(screen.getByRole('option', { name: /Bob Builder/i }));

    expect(onChange).toHaveBeenCalledWith('u2');
  });

  it('shows selected member summary in trigger', () => {
    renderWithI18n(
      <ViraLataFilterSelect
        value="u2"
        onChange={vi.fn()}
        members={members}
        pickCounts={{ u2: 4 }}
      />,
    );

    expect(screen.getByText('Bob Builder')).toBeInTheDocument();
    expect(screen.getByText('4 picks')).toBeInTheDocument();
  });

  it('filters members by search query and shows empty state', () => {
    renderWithI18n(
      <ViraLataFilterSelect value={null} onChange={vi.fn()} members={members} pickCounts={{}} />,
    );

    fireEvent.click(screen.getByLabelText('Filter by vira-lata picks'));
    fireEvent.change(screen.getByLabelText('Search vira-lata…'), {
      target: { value: 'zzzzz' },
    });

    expect(screen.getByText('No vira-lata found.')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Alice/i })).not.toBeInTheDocument();
  });

  it('clears search with the clear button', () => {
    renderWithI18n(
      <ViraLataFilterSelect value={null} onChange={vi.fn()} members={members} pickCounts={{}} />,
    );

    fireEvent.click(screen.getByLabelText('Filter by vira-lata picks'));
    const search = screen.getByLabelText('Search vira-lata…') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'Alice' } });
    expect(search.value).toBe('Alice');

    fireEvent.click(screen.getByLabelText('Clear'));
    expect(search.value).toBe('');
  });

  it('clears selection via the "all" option', () => {
    const onChange = vi.fn();
    renderWithI18n(
      <ViraLataFilterSelect
        value="u1"
        onChange={onChange}
        members={members}
        pickCounts={{ u1: 2 }}
      />,
    );

    fireEvent.click(screen.getByLabelText('Filter by vira-lata picks'));
    fireEvent.click(screen.getByRole('option', { name: /All/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('closes on outside mousedown', () => {
    renderWithI18n(
      <div>
        <ViraLataFilterSelect value={null} onChange={vi.fn()} members={members} pickCounts={{}} />
        <button type="button">outside</button>
      </div>,
    );

    fireEvent.click(screen.getByLabelText('Filter by vira-lata picks'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
