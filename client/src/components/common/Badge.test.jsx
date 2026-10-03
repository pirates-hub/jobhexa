import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from './Badge.jsx';

describe('Badge', () => {
  it('renders with correct text', () => {
    render(<Badge>Eligible</Badge>);
    expect(screen.getByText('Eligible')).toBeInTheDocument();
  });

  it('applies correct color class for green', () => {
    render(<Badge color="green">Success</Badge>);
    const badge = screen.getByText('Success');
    expect(badge.className).toContain('bg-green-100');
    expect(badge.className).toContain('text-green-800');
  });

  it('applies correct color class for red', () => {
    render(<Badge color="red">Failed</Badge>);
    const badge = screen.getByText('Failed');
    expect(badge.className).toContain('bg-red-100');
  });

  it('renders with default gray when no color provided', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge.className).toContain('bg-gray-100');
  });
});
