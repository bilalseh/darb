from datetime import date

import pytest

from darb_api.domain.onboarding import target_date_problem

TODAY = date(2026, 11, 9)


@pytest.mark.parametrize(
    "target",
    [None, TODAY, date(2026, 11, 8), date(2027, 6, 1), date(2031, 11, 9)],
)
def test_accepts_dates_from_yesterday_to_five_years_out(target: date | None) -> None:
    assert target_date_problem(target, TODAY) is None


def test_rejects_dates_in_the_past() -> None:
    assert target_date_problem(date(2026, 11, 7), TODAY) == "The goal date is in the past"


def test_rejects_dates_more_than_five_years_out() -> None:
    problem = target_date_problem(date(2031, 12, 1), TODAY)

    assert problem == "The goal date is more than 5 years away"
