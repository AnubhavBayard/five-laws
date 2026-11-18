import { render, screen } from '@testing-library/react';
import App from './App';
import { useProfile } from './store/profile';

describe('App routing', () => {
  it('sends a new user to onboarding', async () => {
    useProfile.setState({ loaded: true, profile: null });
    render(<App />);
    expect(await screen.findByText('Five laws, written in your own hand.')).toBeInTheDocument();
  });

  it('opens Today for an onboarded user', async () => {
    window.history.pushState({}, '', '/');
    useProfile.setState({
      loaded: true,
      profile: {
        lifeStage: 'working',
        areas: ['career'],
        checkinTime: '21:00',
        aiEnabled: true,
        aiConsentAt: null,
        unloadReminder: false,
        onboardedAt: '2026-11-18T10:00:00.000Z',
      },
    });
    render(<App />);
    expect(await screen.findByText("What's on your mind?")).toBeInTheDocument();
  });
});
