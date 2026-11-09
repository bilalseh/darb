from pydantic import Field

from darb_api.schemas.base import ApiModel
from darb_api.schemas.profile import Tier


class BillingStatus(ApiModel):
    """Whether test-mode checkout is set up, and the user's current plan."""

    available: bool
    tier: Tier
    price_cents: int


class CheckoutSession(ApiModel):
    """Where to send the browser for Stripe's hosted test-mode checkout."""

    url: str


class ConfirmCheckoutRequest(ApiModel):
    session_id: str = Field(min_length=10, max_length=255, pattern=r"^cs_test_[A-Za-z0-9_]+$")
