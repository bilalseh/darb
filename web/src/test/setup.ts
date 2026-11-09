import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import '../i18n';
import { useOnboardingStore } from '../features/onboarding/onboardingStore';
import { fakeSession } from './fakeSession';

// No test talks to Firebase: the SDK entry points are replaced, and the session is a fake.
vi.mock('../lib/firebase', () => ({ firebaseApp: {}, auth: {}, useEmulators: false }));
vi.mock('../lib/firestore', () => ({ db: {} }));
vi.mock('../lib/session', async () => (await import('./fakeSession')).fakeSessionModule);

// jsdom has no layout engine; the router's scroll restoration calls this on navigation.
window.scrollTo = () => undefined;

afterEach(() => {
  cleanup();
  fakeSession.reset();
  useOnboardingStore.getState().reset();
  sessionStorage.clear();
});
