import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from './Home.jsx';

describe('Home', () => {
  it('renders welcome text', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    expect(screen.getByText(/Government job matching/i)).toBeInTheDocument();
  });

  it('renders JobHexa description', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    expect(screen.getByText(/matching engine for government jobs/i)).toBeInTheDocument();
  });

  it('renders call to action link', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    expect(screen.getByText(/Start for free/i)).toBeInTheDocument();
  });
});
