from datetime import datetime

from darb_api.schemas.base import ApiModel


class Profile(ApiModel):
    """The signed-in user's profile, stored at users/{uid}."""

    uid: str
    display_name: str | None
    email: str | None
    is_demo: bool
    created_at: datetime


class Usage(ApiModel):
    """Today's AI requests against the daily allowance."""

    used: int
    limit: int
    resets_at: datetime
