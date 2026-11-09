"""Stand-ins for Stripe, Cloud Scheduler's signed calls and Firebase account deletion."""

from darb_api.billing.stripe import BillingError, CompletedCheckout


class FakeBilling:
    """Stripe stand-in: checkouts complete when a test marks them paid."""

    def __init__(self) -> None:
        self.checkouts: list[tuple[str, str | None, str, str]] = []
        self.paid: dict[str, CompletedCheckout] = {}
        self.cancelled: list[str] = []
        self.fail = False

    async def create_checkout(
        self, uid: str, email: str | None, success_url: str, cancel_url: str
    ) -> str:
        if self.fail:
            raise BillingError("down")
        self.checkouts.append((uid, email, success_url, cancel_url))
        return f"https://checkout.stripe.com/c/pay/cs_test_{uid}"

    async def completed_checkout(self, session_id: str) -> CompletedCheckout | None:
        if self.fail:
            raise BillingError("down")
        return self.paid.get(session_id)

    async def cancel_subscription(self, subscription_id: str) -> None:
        if self.fail:
            raise BillingError("down")
        self.cancelled.append(subscription_id)


class FakeServiceVerifier:
    def __init__(self, tokens: dict[str, str]) -> None:
        self.tokens = tokens

    def email_of(self, token: str, audience: str) -> str | None:
        return self.tokens.get(f"{audience}|{token}")


class FakeAccountDeleter:
    def __init__(self) -> None:
        self.deleted: list[str] = []

    def delete(self, uids: list[str]) -> int:
        self.deleted.extend(uids)
        return 0
