import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UpcomingBandCard from '../components/now/UpcomingBandCard';
import type { Band } from '../types';
import type { CrewLivePlan } from '../services/livePreview';

vi.mock('../lib/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('../services/stageColors', () => ({
  stageColor: () => '#c0392b',
}));

vi.mock('../services/livePreview', () => ({
  formatFestivalTime: (time: string) => time.slice(11, 16),
}));

vi.mock('../components/QuackStrip', () => ({
  default: ({ onDuck, cooldownUntil }: any) => (
    <button data-testid="quack-strip" onClick={onDuck} disabled={!!cooldownUntil}>
      Quack
    </button>
  ),
}));

const mockBand: Band = {
  id: 'band-1',
  name: 'Test Band',
  stage: 'Main Stage',
  start_time: '2026-08-15T20:00:00Z',
  end_time: '2026-08-15T21:00:00Z',
  image_url: null,
  genre: null,
  category: 'band',
  slot_id: 'slot-1',
};

const mockCrew: CrewLivePlan[] = [
  {
    id: 'crew-1',
    display_name: 'Alice',
    label: 'Alice',
    avatar_url: 'https://example.com/alice.jpg',
    plan: { status: 'next', band: mockBand, nextBand: null },
    isCamping: false,
    isAtMetalPlace: false,
    isFriend: false,
    wacken_arrival_day: 'Aug 14',
  },
  {
    id: 'crew-2',
    display_name: 'Bob',
    label: 'Bob',
    avatar_url: 'https://example.com/bob.jpg',
    plan: { status: 'next', band: mockBand, nextBand: null },
    isCamping: false,
    isAtMetalPlace: false,
    isFriend: false,
    wacken_arrival_day: 'Aug 14',
  },
];

describe('UpcomingBandCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders band info in collapsed view', () => {
    const onDismiss = vi.fn();
    const onDuck = vi.fn();
    render(
      <UpcomingBandCard
        nextBand={mockBand}
        crewMembers={mockCrew}
        onDismiss={onDismiss}
        userId="test-user" onDuck={onDuck}
        duckCooldownUntil={null}
      />,
    );

    expect(screen.getByText('upcomingLabel')).toBeInTheDocument();
    expect(screen.getByText('Test Band')).toBeInTheDocument();
    expect(screen.getByText('Main Stage')).toBeInTheDocument();
  });

  it('shows crew count in collapsed view', () => {
    const onDismiss = vi.fn();
    const onDuck = vi.fn();
    render(
      <UpcomingBandCard
        nextBand={mockBand}
        crewMembers={mockCrew}
        onDismiss={onDismiss}
        userId="test-user" onDuck={onDuck}
        duckCooldownUntil={null}
      />,
    );

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('goingLabel')).toBeInTheDocument();
  });

  it('expands to show crew list on click', () => {
    const onDismiss = vi.fn();
    const onDuck = vi.fn();
    const { container } = render(
      <UpcomingBandCard
        nextBand={mockBand}
        crewMembers={mockCrew}
        onDismiss={onDismiss}
        userId="test-user" onDuck={onDuck}
        duckCooldownUntil={null}
      />,
    );

    const card = container.querySelector('[role="button"]');
    expect(card).toBeInTheDocument();

    fireEvent.click(card!);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('collapses when clicked again', () => {
    const onDismiss = vi.fn();
    const onDuck = vi.fn();
    const { container } = render(
      <UpcomingBandCard
        nextBand={mockBand}
        crewMembers={mockCrew}
        onDismiss={onDismiss}
        userId="test-user" onDuck={onDuck}
        duckCooldownUntil={null}
      />,
    );

    const card = container.querySelector('[role="button"]');

    fireEvent.click(card!);
    expect(screen.getByText('Alice')).toBeInTheDocument();

    fireEvent.click(card!);
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('calls onDismiss when X button clicked', () => {
    const onDismiss = vi.fn();
    const onDuck = vi.fn();
    render(
      <UpcomingBandCard
        nextBand={mockBand}
        crewMembers={mockCrew}
        onDismiss={onDismiss}
        userId="test-user" onDuck={onDuck}
        duckCooldownUntil={null}
      />,
    );

    fireEvent.click(screen.getByLabelText('dismissLabel'));
    expect(onDismiss).toHaveBeenCalledWith('band-1');
  });

  it('renders QuackStrip', () => {
    const onDismiss = vi.fn();
    const onDuck = vi.fn();
    render(
      <UpcomingBandCard
        nextBand={mockBand}
        crewMembers={mockCrew}
        onDismiss={onDismiss}
        userId="test-user" onDuck={onDuck}
        duckCooldownUntil={null}
      />,
    );

    expect(screen.getByTestId('quack-strip')).toBeInTheDocument();
  });

  it('disables QuackStrip when on cooldown', () => {
    const onDismiss = vi.fn();
    const onDuck = vi.fn();
    const cooldownTime = Date.now() + 5000;
    render(
      <UpcomingBandCard
        nextBand={mockBand}
        crewMembers={mockCrew}
        onDismiss={onDismiss}
        userId="test-user" onDuck={onDuck}
        duckCooldownUntil={cooldownTime}
      />,
    );

    expect(screen.getByTestId('quack-strip')).toBeDisabled();
  });

  it('calls onDuck when QuackStrip clicked', () => {
    const onDismiss = vi.fn();
    const onDuck = vi.fn();
    render(
      <UpcomingBandCard
        nextBand={mockBand}
        crewMembers={mockCrew}
        onDismiss={onDismiss}
        userId="test-user" onDuck={onDuck}
        duckCooldownUntil={null}
      />,
    );

    fireEvent.click(screen.getByTestId('quack-strip'));
    expect(onDuck).toHaveBeenCalled();
  });

  it('shows all crew names when expanded with many members', () => {
    const largeCrew = Array.from({ length: 10 }, (_, i) => ({
      id: `crew-${i}`,
      display_name: `Person ${i}`,
      label: `Person ${i}`,
      avatar_url: `https://example.com/person${i}.jpg`,
      plan: { status: 'next', band: mockBand, nextBand: null },
      isCamping: false,
      isAtMetalPlace: false,
      isFriend: false,
      wacken_arrival_day: 'Aug 14',
    })) as CrewLivePlan[];

    const onDismiss = vi.fn();
    const onDuck = vi.fn();
    const { container } = render(
      <UpcomingBandCard
        nextBand={mockBand}
        crewMembers={largeCrew}
        onDismiss={onDismiss}
        userId="test-user" onDuck={onDuck}
        duckCooldownUntil={null}
      />,
    );

    fireEvent.click(container.querySelector('[role="button"]')!);
    expect(screen.getByText('Person 0')).toBeInTheDocument();
    expect(screen.getByText('Person 9')).toBeInTheDocument();
  });

  it('expands on Space key', () => {
    const onDismiss = vi.fn();
    const onDuck = vi.fn();
    const { container } = render(
      <UpcomingBandCard
        nextBand={mockBand}
        crewMembers={mockCrew}
        onDismiss={onDismiss}
        userId="test-user"
        onDuck={onDuck}
        duckCooldownUntil={null}
      />,
    );

    const card = container.querySelector('[role="button"]')!;
    fireEvent.keyDown(card, { key: ' ' });
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('stops propagation on dismiss button click', () => {
    const onDismiss = vi.fn();
    const onDuck = vi.fn();
    const { container } = render(
      <UpcomingBandCard
        nextBand={mockBand}
        crewMembers={mockCrew}
        onDismiss={onDismiss}
        userId="test-user" onDuck={onDuck}
        duckCooldownUntil={null}
      />,
    );

    const card = container.querySelector('[role="button"]');

    fireEvent.click(card!);
    expect(screen.getByText('Alice')).toBeInTheDocument();

    const dismissBtn = screen.getByLabelText('dismissLabel');
    fireEvent.click(dismissBtn);

    expect(onDismiss).toHaveBeenCalledWith('band-1');
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
