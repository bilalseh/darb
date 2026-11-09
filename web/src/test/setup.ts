import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import '../i18n';

// jsdom has no layout engine; the router's scroll restoration calls this on navigation.
window.scrollTo = () => undefined;

afterEach(() => {
  cleanup();
});
