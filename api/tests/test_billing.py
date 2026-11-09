import json
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from darb_api.billing import signature
from darb_api.billing.stripe import CompletedCheckout, completed_from_session
from darb_api.config import Settings
from darb_api.main import create_app
from darb_api.repository import BillingRecord
from darb_api.schemas import Tier
from tests.conftest import AS_ADA, AS_DEMO, NOW
from tests.fake_services import FakeBilling
from tests.fakes import FakeTokenVerifier, InMemoryUserRepository

WEBHOOK_SECRET = "whsec_test_secret"
SESSION = "cs_test_a1B2c3D4e5"


@pytest.fixture
def billing() -> FakeBilling:
    return FakeBilling()


@pytest.fixture
def client(
    verifier: FakeTokenVerifier, repository: InMemoryUserRepository, billing: FakeBilling
) -> Iterator[TestClient]:
    settings = Settings(
        environment="test",
        firebase_project_id="demo-darb",
        app_url="https://darb.example",
        stripe_webhook_secret=SecretStr(WEBHOOK_SECRET),
    )
    app = create_app(settings, verifier, repository, clock=lambda: NOW, billing_client=billing)
    with TestClient(app) as test_client:
        test_client.post("/api/me", headers=AS_ADA)
        yield test_client


def _pay(billing: FakeBilling, uid: str = "user-ada") -> None:
    billing.paid[SESSION] = CompletedCheckout(uid, "cus_1", "sub_1")


def test_live_stripe_keys_are_refused() -> None:
    with pytest.raises(ValueError, match="test-mode"):
        Settings(firebase_project_id="p", stripe_secret_key=SecretStr("sk_live_123"))


def test_status_says_whether_checkout_is_available(client: TestClient) -> None:
    status = client.get("/api/billing", headers=AS_ADA).json()

    assert status == {"available": True, "tier": "free", "priceCents": 500}


def test_without_keys_checkout_is_unavailable(
    settings: Settings, verifier: FakeTokenVerifier, repository: InMemoryUserRepository
) -> None:
    with TestClient(create_app(settings, verifier, repository, clock=lambda: NOW)) as client:
        client.post("/api/me", headers=AS_ADA)
        assert client.get("/api/billing", headers=AS_ADA).json()["available"] is False
        response = client.post("/api/billing/checkout", headers=AS_ADA)
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "billing_unavailable"


def test_checkout_returns_stripes_hosted_page(client: TestClient, billing: FakeBilling) -> None:
    response = client.post("/api/billing/checkout", headers=AS_ADA)

    assert response.json() == {"url": "https://checkout.stripe.com/c/pay/cs_test_user-ada"}
    [(uid, email, success, cancel)] = billing.checkouts
    assert (uid, email) == ("user-ada", "ada@example.com")
    assert success == "https://darb.example/settings?checkout={CHECKOUT_SESSION_ID}"
    assert cancel == "https://darb.example/pricing?checkout=cancelled"


def test_confirming_a_paid_checkout_upgrades_to_pro(
    client: TestClient, billing: FakeBilling, repository: InMemoryUserRepository
) -> None:
    _pay(billing)

    profile = client.post("/api/billing/confirm", json={"sessionId": SESSION}, headers=AS_ADA)

    assert profile.json()["tier"] == "pro"
    assert repository.billing["user-ada"] == BillingRecord(
        customer_id="cus_1", subscription_id="sub_1"
    )
    assert client.get("/api/me/usage", headers=AS_ADA).json()["limit"] == 100


def test_someone_elses_or_unpaid_checkout_is_refused(
    client: TestClient, billing: FakeBilling
) -> None:
    unpaid = client.post("/api/billing/confirm", json={"sessionId": SESSION}, headers=AS_ADA)
    _pay(billing, uid="someone-else")
    other = client.post("/api/billing/confirm", json={"sessionId": SESSION}, headers=AS_ADA)

    assert unpaid.status_code == other.status_code == 409


def test_session_ids_are_validated(client: TestClient) -> None:
    response = client.post("/api/billing/confirm", json={"sessionId": "../x/y"}, headers=AS_ADA)

    assert response.status_code == 422


def test_cancelling_returns_to_free(
    client: TestClient, billing: FakeBilling, repository: InMemoryUserRepository
) -> None:
    _pay(billing)
    client.post("/api/billing/confirm", json={"sessionId": SESSION}, headers=AS_ADA)

    profile = client.post("/api/billing/cancel", headers=AS_ADA).json()

    assert profile["tier"] == "free"
    assert billing.cancelled == ["sub_1"]
    assert "user-ada" not in repository.billing


def test_stripe_outage_is_a_clear_error(client: TestClient, billing: FakeBilling) -> None:
    billing.fail = True

    response = client.post("/api/billing/checkout", headers=AS_ADA)

    assert response.status_code == 502


def test_demo_users_can_try_checkout_too(client: TestClient, billing: FakeBilling) -> None:
    client.post("/api/me", headers=AS_DEMO)

    assert client.post("/api/billing/checkout", headers=AS_DEMO).status_code == 200


def _signed(client: TestClient, event: dict[str, object], secret: str = WEBHOOK_SECRET) -> int:
    body = json.dumps(event).encode()
    timestamp = int(NOW.timestamp())
    header = f"t={timestamp},v1={signature.sign(body, secret, timestamp)}"
    response = client.post(
        "/api/billing/webhook", content=body, headers={"Stripe-Signature": header}
    )
    return response.status_code


def _session_event() -> dict[str, object]:
    session = {
        "status": "complete",
        "payment_status": "paid",
        "client_reference_id": "user-ada",
        "customer": "cus_9",
        "subscription": "sub_9",
    }
    return {"type": "checkout.session.completed", "data": {"object": session}}


def test_signed_webhooks_upgrade_and_downgrade(
    client: TestClient, repository: InMemoryUserRepository
) -> None:
    assert _signed(client, _session_event()) == 200
    assert repository.profiles["user-ada"].tier is Tier.PRO

    deleted = {"id": "sub_9", "metadata": {"uid": "user-ada"}}
    assert _signed(client, {"type": "customer.subscription.deleted", "data": {"object": deleted}})
    assert repository.profiles["user-ada"].tier.value == "free"


def test_unsigned_or_forged_webhooks_are_refused(
    client: TestClient, repository: InMemoryUserRepository
) -> None:
    assert _signed(client, _session_event(), secret="whsec_wrong") == 400
    unsigned = client.post("/api/billing/webhook", content=b"{}")
    assert unsigned.status_code == 400
    assert repository.profiles["user-ada"].tier is Tier.FREE


def test_stale_signatures_are_refused() -> None:
    body = b"{}"
    old = int(NOW.timestamp()) - signature.TOLERANCE_SECONDS - 1
    header = f"t={old},v1={signature.sign(body, 's', old)}"

    assert not signature.is_valid(body, header, "s", int(NOW.timestamp()))


def test_only_paid_complete_sessions_count() -> None:
    session = {"status": "open", "payment_status": "unpaid", "client_reference_id": "u"}

    assert completed_from_session(session) is None
