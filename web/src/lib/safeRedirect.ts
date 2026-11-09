const FALLBACK = '/today';

/**
 * Only same-site paths are allowed after sign-in, so a crafted `?redirect=` link cannot send
 * users to another site (open redirect).
 */
export function safeRedirect(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return FALLBACK;
  if (value.startsWith('//') || value.startsWith('/\\')) return FALLBACK;
  if (value.startsWith('/sign-in')) return FALLBACK;
  return value;
}
