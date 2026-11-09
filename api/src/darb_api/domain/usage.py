"""Plan limits: AI requests per day and skills per account.

A "day" is a UTC calendar day, so AI limits reset at midnight UTC for everyone.
"""

from datetime import datetime, timedelta
from enum import StrEnum


class UsageScope(StrEnum):
    USER = "user"  # this user's daily allowance
    GLOBAL = "global"  # the whole app's daily budget, which protects the shared free quota


class UsageLimitError(Exception):
    def __init__(self, scope: UsageScope) -> None:
        super().__init__(f"daily AI limit reached ({scope.value})")
        self.scope = scope


def usage_day(now: datetime) -> str:
    return now.date().isoformat()


def next_reset(now: datetime) -> datetime:
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return midnight + timedelta(days=1)


def check_allowance(
    used_by_user: int, used_globally: int, user_limit: int, global_limit: int
) -> None:
    """Raise if one more AI request would go over either limit."""
    if used_globally >= global_limit:
        raise UsageLimitError(UsageScope.GLOBAL)
    if used_by_user >= user_limit:
        raise UsageLimitError(UsageScope.USER)


FREE_SKILLS = 1
# Demo accounts can add a couple of skills, so a reviewer can try onboarding end to end.
DEMO_SKILLS = 3


def skill_allowance(is_pro: bool, is_demo: bool) -> int | None:
    """How many skills the account may have; None means unlimited."""
    if is_pro:
        return None
    return DEMO_SKILLS if is_demo else FREE_SKILLS


def can_add_skill(skills: int, allowance: int | None) -> bool:
    return allowance is None or skills < allowance
