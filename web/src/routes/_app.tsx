import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { profileQueryOptions } from '../features/auth/profileQuery';
import { syncQueryOptions } from '../features/checkin/checkinApi';
import { waitForAuth } from '../lib/session';

/** Layout for every signed-in page: no user means a trip to /sign-in and back. */
export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    const user = await waitForAuth();
    if (!user) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router's redirect API
      throw redirect({ to: '/sign-in', search: { redirect: location.href } });
    }
    const profile = await context.queryClient.query(profileQueryOptions(user.uid));
    // Moves missed lessons before any page reads a plan; the app still works if it fails.
    await context.queryClient.query(syncQueryOptions(user.uid)).catch(() => null);
    return { user, profile };
  },
  component: Outlet,
});
