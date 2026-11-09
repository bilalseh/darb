"""Scheduled housekeeping, called by Cloud Scheduler: erasing week-old demo accounts."""

import logging

from fastapi import APIRouter, Header, HTTPException, Request, status
from starlette.concurrency import run_in_threadpool

from darb_api.billing.stripe import BillingError
from darb_api.demo import demo_expiry_cutoff
from darb_api.dependencies import BillingDep, ClockDep, RepositoryDep, SettingsDep
from darb_api.service_auth import AccountDeleter, ServiceTokenVerifier

router = APIRouter(tags=["maintenance"], prefix="/internal", include_in_schema=False)
logger = logging.getLogger(__name__)

BATCH = 100


@router.post("/cleanup-demo-accounts")
async def cleanup_demo_accounts(
    request: Request,
    repository: RepositoryDep,
    billing: BillingDep,
    settings: SettingsDep,
    clock: ClockDep,
    authorization: str = Header(default=""),
) -> dict[str, int]:
    """Erase demo accounts started more than a week ago: their data, then their sign-in."""
    audience, invoker = settings.cleanup_audience, settings.cleanup_invoker
    if not audience or not invoker:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    verifier: ServiceTokenVerifier = request.app.state.service_verifier
    token = authorization.removeprefix("Bearer ").strip()
    email = await run_in_threadpool(verifier.email_of, token, audience) if token else None
    if email != invoker:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not allowed")

    uids = await repository.expired_demo_users(demo_expiry_cutoff(clock()), BATCH)
    for uid in uids:
        record = await repository.get_billing(uid)
        if record and billing:
            try:
                await billing.cancel_subscription(record.subscription_id)
            except BillingError:
                logger.warning("Could not cancel a demo account's subscription")
        await repository.delete_user_data(uid)
    deleter: AccountDeleter = request.app.state.account_deleter
    try:
        failed = await run_in_threadpool(deleter.delete, uids)
    except Exception:
        logger.exception("Deleting demo sign-in accounts failed")
        failed = len(uids)
    logger.info("Demo cleanup erased %d accounts (%d sign-ins kept)", len(uids), failed)
    return {"erased": len(uids), "signInsNotDeleted": failed}
