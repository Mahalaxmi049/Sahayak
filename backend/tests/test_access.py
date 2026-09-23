from datetime import timedelta
from .conftest import make_pass
def hdr(p): return {"X-Pass-Token":p["token"]}
def test_expired_pass_is_rejected(client,identities):
    p=make_pass(client,identities)
    from app.database import SessionLocal
    from app.models import Pass
    from app.rules import now
    db=SessionLocal(); row=db.get(Pass,p["id"]); row.expires_at=now()-timedelta(seconds=1); db.commit(); db.close()
    assert client.post("/helper/act",headers=hdr(p),json={"action":"view_pension_status"}).status_code==401
def test_revoked_pass_is_rejected(client,identities):
    p=make_pass(client,identities); client.post(f'/passes/{p["id"]}/revoke')
    assert client.post("/helper/act",headers=hdr(p),json={"action":"view_pension_status"}).status_code==403
def test_out_of_scope_gets_403(client,identities):
    p=make_pass(client,identities)
    assert client.post("/helper/act",headers=hdr(p),json={"action":"change_bank_account"}).status_code==403
def test_high_risk_returns_202_and_does_not_execute(client,identities):
    p=make_pass(client,identities,["change_bank_account"]); r=client.post("/helper/act",headers=hdr(p),json={"action":"change_bank_account"}); assert r.status_code==202
    from app.database import SessionLocal
    from app.models import StepUpRequest
    db=SessionLocal(); assert db.get(StepUpRequest,r.json()["step_up_id"]).executed is False; db.close()
def test_denied_stepup_never_executes(client,identities):
    p=make_pass(client,identities,["update_mobile_number"]); sid=client.post("/helper/act",headers=hdr(p),json={"action":"update_mobile_number"}).json()["step_up_id"]
    client.post(f"/stepups/{sid}/resolve",json={"decision":"deny","via":"button"})
    assert client.get(f"/helper/stepups/{sid}",headers=hdr(p)).json()["status"]=="blocked"
def test_approved_stepup_executes_exactly_once(client,identities):
    p=make_pass(client,identities,["change_bank_account"]); sid=client.post("/helper/act",headers=hdr(p),json={"action":"change_bank_account"}).json()["step_up_id"]
    client.post(f"/stepups/{sid}/resolve",json={"decision":"approve","via":"voice"})
    assert client.get(f"/helper/stepups/{sid}",headers=hdr(p)).json()["status"]=="executed"
    assert client.get(f"/helper/stepups/{sid}",headers=hdr(p)).json()["status"]=="already_executed"
def test_audit_records_every_event(client,identities):
    p=make_pass(client,identities,["view_pension_status"]); client.post("/helper/act",headers=hdr(p),json={"action":"view_pension_status"}); client.post("/helper/act",headers=hdr(p),json={"action":"change_bank_account"})
    events=[x["event"] for x in client.get(f'/passes/{p["id"]}/audit').json()]
    assert {"pass_created","action_executed","blocked_out_of_scope"}.issubset(events)
