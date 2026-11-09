from datetime import date, timedelta

# The client sends a calendar date in the user's time zone; allow one day of skew against UTC.
TIME_ZONE_ALLOWANCE = timedelta(days=1)
MAX_GOAL_HORIZON = timedelta(days=5 * 366)


def target_date_problem(target_date: date | None, today: date) -> str | None:
    """Return why a goal date is not acceptable, or None when it is fine (or not set)."""
    if target_date is None:
        return None
    if target_date < today - TIME_ZONE_ALLOWANCE:
        return "The goal date is in the past"
    if target_date > today + MAX_GOAL_HORIZON:
        return "The goal date is more than 5 years away"
    return None
