import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Avatar,
  Button,
  Chip,
  Collapsible,
  Input,
  Modal,
  SectionTitle,
  Select,
  SegmentedControl,
  Switch,
} from '../ui';

describe('Button', () => {
  it('renders variants, sizes, and handles clicks', () => {
    const onClick = vi.fn();
    render(
      <>
        <Button onClick={onClick}>Primary</Button>
        <Button variant="outline" size="sm" fullWidth>Outline</Button>
        <Button variant="ghost" type="submit">Ghost</Button>
        <Button variant="destructive">Delete</Button>
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Primary' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Outline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ghost' })).toHaveAttribute('type', 'submit');
  });
});

describe('Avatar', () => {
  it('renders image when src is provided', () => {
    const { container } = render(
      <Avatar src="https://example.com/a.jpg" initial="A" size={56} color="#c0392b" />,
    );
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/a.jpg');
  });

  it('renders initial fallback for each size', () => {
    const { rerender } = render(<Avatar initial="B" size={24} />);
    expect(screen.getByText('B')).toBeInTheDocument();

    rerender(<Avatar initial="C" size={32} />);
    rerender(<Avatar initial="D" size={40} />);
    rerender(<Avatar initial="E" size={56} />);
    expect(screen.getByText('E')).toBeInTheDocument();
  });
});

describe('Input', () => {
  it('renders bare input and labeled input', () => {
    const onChange = vi.fn();
    const { rerender } = render(<Input value="" onChange={onChange} aria-label="bare" />);
    fireEvent.change(screen.getByLabelText('bare'), { target: { value: 'x' } });
    expect(onChange).toHaveBeenCalled();

    rerender(
      <Input id="email" label="Email" value="" onChange={vi.fn()} />,
    );
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
});

describe('Chip', () => {
  it('renders default and role variants', () => {
    render(
      <>
        <Chip>Default</Chip>
        <Chip variant="role-normal">Normal</Chip>
        <Chip variant="role-manager">Manager</Chip>
        <Chip variant="role-godlike">Godlike</Chip>
      </>,
    );

    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Godlike')).toBeInTheDocument();
  });
});

describe('Modal', () => {
  it('closes on Escape and backdrop click but not content click', () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Body'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports bottom position and custom content class', () => {
    render(
      <Modal onClose={vi.fn()} position="bottom" contentClassName="custom-panel">
        <p>Bottom sheet</p>
      </Modal>,
    );
    expect(screen.getByText('Bottom sheet')).toBeInTheDocument();
  });

  it('closes when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal onClose={onClose}>
        <p>Modal body</p>
      </Modal>,
    );
    const backdrop = container.querySelector('[role="presentation"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Collapsible', () => {
  it('toggles content and respects defaultOpen', () => {
    render(
      <Collapsible trigger="Toggle me" defaultOpen>
        <p>Hidden content</p>
      </Collapsible>,
    );

    const trigger = screen.getByRole('button', { name: /Toggle me/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Hidden content')).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('SectionTitle', () => {
  it('renders children with optional class', () => {
    render(<SectionTitle className="extra">Section</SectionTitle>);
    expect(screen.getByText('Section')).toBeInTheDocument();
  });
});

describe('Select', () => {
  it('renders bare select and labeled select', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Select aria-label="bare" value="a" onChange={onChange}>
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>,
    );
    fireEvent.change(screen.getByLabelText('bare'), { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalled();

    rerender(
      <Select id="day" label="Day" value="a" onChange={vi.fn()}>
        <option value="a">A</option>
      </Select>,
    );
    expect(screen.getByLabelText('Day')).toBeInTheDocument();
  });
});

describe('Switch', () => {
  it('toggles checked state for each tone', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Switch checked={false} onChange={onChange} tone="manager" ariaLabel="Manager mode" />,
    );

    const sw = screen.getByRole('switch', { name: 'Manager mode' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(
      <Switch checked={true} onChange={onChange} tone="friend" ariaLabel="Friend mode" disabled />,
    );
    const friend = screen.getByRole('switch', { name: 'Friend mode' });
    expect(friend).toBeDisabled();
    expect(friend).toHaveAttribute('aria-checked', 'true');
  });
});

describe('SegmentedControl', () => {
  it('selects options and sets aria-pressed', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        options={[
          { value: 'all', label: 'All' },
          { value: 'mine', label: 'Mine' },
        ]}
        value="all"
        onChange={onChange}
      />,
    );

    const mine = screen.getByRole('button', { name: 'Mine' });
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(mine);
    expect(onChange).toHaveBeenCalledWith('mine');
  });
});
