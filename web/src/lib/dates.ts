/** Today's date in the user's own time zone, as YYYY-MM-DD. */
export function todayLocalIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Adds whole years to a YYYY-MM-DD date. */
export function addYearsIso(isoDate: string, years: number): string {
  const [year = '0', rest = ''] = isoDate.split(/-(.*)/s);
  return `${String(Number(year) + years).padStart(4, '0')}-${rest}`;
}

/** Formats a YYYY-MM-DD calendar date without shifting it through UTC. */
export function formatLocalDate(isoDate: string, locale: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}
