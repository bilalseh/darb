from collections.abc import Iterator
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from darb_api.config import Settings
from darb_api.main import create_app
from darb_api.repository import BillingRecord
from darb_api.schemas import Profile
from tests.conftest import AS_ADA, AS_DEMO, NOW
from tests.fake_services import FakeAccountDeleter, FakeBilling, FakeServiceVerifier
from tests.fakes import FakeTokenVerifier, InMemoryUserRepository

AUDIENCE = "https://darb.example/api/internal/cleanup-demo-accounts"
INVOKER = "darb-api@darb.iam.gserviceaccount.com"
PATH = "/api/internal/cleanup-demo-accounts"


@pytest.fixture
def deleter() -> FakeAccountDeleter:
    return FakeAccountDeleter()


@pytest.fixture
def billing() -> FakeBilling:
    return FakeBilling()


@pytest.fixture
def client(
    verifier: FakeTokenVerifier,
    repository: InMemoryUserRepository,
    deleter: FakeAccountDeleter,
    billing: FakeBilling,
) -> Iterator[TestClient]:
    settings = Settings(
        environment="test",
        firebase_project_id="demo-darb",
        cleanup_audience=AUDIENCE,
        cleanup_invoker=INVOKER,
    )
    service = FakeServiceVerifier(
        {f"{AUDIENCE}|scheduler-token": INVOKER, f"{AUDIENCE}|other-token": "x@y.z"}
    )
    app = create_app(
        settings,
        verifier,
        repository,
        clock=lambda: NOW,
        billing_client=billing,
        service_verifier=service,
        account_deleter=deleter,
    )
    with TestClient(app) as test_client:
        yield test_client


def _old_demo(repository: InMemoryUserRepository, uid: str, days_ago: int) -> None:
    # Demo profiles are back-dated three weeks when the demo starts.
    started = NOW - timedelta(days=days_ago) - timedelta(weeks=3)
    repository.profiles[uid] = Profile(
        uid=uid, display_name=None, email=None, is_demo=True, created_at=started
    )


def test_erases_demo_accounts_older_than_a_week(
    client: TestClient,
    repository: InMemoryUserRepository,
    deleter: FakeAccountDeleter,
    billing: FakeBilling,
) -> None:
    client.post("/api/me", headers=AS_DEMO)  # started now: kept
    client.post("/api/me", headers=AS_ADA)  # a real account: kept
    _old_demo(repository, "old-demo", days_ago=8)
    _old_demo(repository, "recent-demo", days_ago=6)
    repository.billing["old-demo"] = BillingRecord(customer_id="c", subscription_id="sub_old")

    response = client.post(PATH, headers={"Authorization": "Bearer scheduler-token"})

    assert response.json() == {"erased": 1, "signInsNotDeleted": 0}
    assert set(repository.profiles) == {"user-demo", "user-ada", "recent-demo"}
    assert deleter.deleted == ["old-demo"]
    assert billing.cancelled == ["sub_old"]


@pytest.mark.parametrize("token", ["", "other-token", "made-up"])
def test_only_the_scheduler_may_call_it(
    client: TestClient, repository: InMemoryUserRepository, token: str
) -> None:
    _old_demo(repository, "old-demo", days_ago=30)

    response = client.post(PATH, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403
    assert "old-demo" in repository.profiles


def test_is_hidden_until_configured(client: TestClient, settings: Settings) -> None:
    app = create_app(settings, FakeTokenVerifier({}), InMemoryUserRepository(), clock=lambda: NOW)
    with TestClient(app) as unconfigured:
        response = unconfigured.post(PATH, headers={"Authorization": "Bearer scheduler-token"})

    assert response.status_code == 404
