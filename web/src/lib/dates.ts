/** Intl locale for an app language: Arabic keeps Western digits, matching the translations. */
export function intlLocale(language: string): string {
  return language === 'ar' ? 'ar-u-nu-latn' : language;
}

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
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium' }).format(date);
}

/** Adds days to a YYYY-MM-DD date (calendar arithmetic, no time zone involved). */
export function addDaysIso(isoDate: string, days: number): string {
  const [year = 1970, month = 1, day = 1] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

/** Monday of the week that contains a YYYY-MM-DD date. */
export function mondayOfIso(isoDate: string): string {
  const [year = 1970, month = 1, day = 1] = isoDate.split('-').map(Number);
  const weekday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
  return addDaysIso(isoDate, -weekday);
}

/** Short weekday and day for a YYYY-MM-DD date, for example "Wed 11". */
export function formatDayLabel(isoDate: string, locale: string): string {
  const [year = 1970, month = 1, day = 1] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'short', day: 'numeric' }).format(
    new Date(year, month - 1, day),
  );
}

/** Day and short month for a YYYY-MM-DD date, for example "11/9"; fits narrow controls. */
export function formatShortDate(isoDate: string, locale: string): string {
  const [year = 1970, month = 1, day = 1] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'numeric' }).format(
    new Date(year, month - 1, day),
  );
}
