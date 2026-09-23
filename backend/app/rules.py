"""Small, explicit access-policy layer for all helper actions."""
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
from .models import AuditLog, Pass, StepUpRequest
from .services.mock_pension import execute

RISK = {"view_pension_status":"LOW", "download_pension_certificate":"LOW", "update_mobile_number":"HIGH", "change_bank_account":"HIGH"}
def now(): return datetime.utcnow()
def log(db: Session, pass_id: int, actor: str, event: str, detail: str = ""):
    db.add(AuditLog(pass_id=pass_id, actor=actor, event=event, detail=detail, timestamp=now()))
def pass_from_token(db: Session, token: str) -> Pass:
    p = db.query(Pass).filter(Pass.token == token).first()
    if not p: raise HTTPException(401, "Invalid pass token")
    if p.status == "active" and p.expires_at <= now():
        p.status = "expired"; log(db,p.id,"system","pass_expired","Pass expired before helper request"); db.commit()
    if p.status == "expired":
        log(db,p.id,"system","blocked_expired","Helper request rejected"); db.commit(); raise HTTPException(401,"Pass has expired")
    if p.status == "revoked":
        log(db,p.id,"system","blocked_revoked","Helper request rejected"); db.commit(); raise HTTPException(403,"Pass has been revoked")
    return p
def helper_action(db: Session, token: str, action: str):
    p = pass_from_token(db,token)
    if action not in RISK: raise HTTPException(400,"Unknown action")
    if action not in p.allowed_actions:
        log(db,p.id,"helper","blocked_out_of_scope",action); db.commit(); raise HTTPException(403,"Action is outside this pass's scope")
    if RISK[action] == "LOW":
        result=execute(p.citizen_id,action); log(db,p.id,"helper","action_executed",action); db.commit(); return 200,{"status":"executed","result":result}
    req=StepUpRequest(pass_id=p.id,action=action,status="pending",created_at=now(),executed=False)
    db.add(req); db.flush(); log(db,p.id,"helper","step_up_requested",action); db.commit(); db.refresh(req)
    return 202,{"status":"step_up_required","step_up_id":req.id}
def collect_stepup(db: Session, token: str, stepup_id: int):
    p=pass_from_token(db,token); req=db.get(StepUpRequest,stepup_id)
    if not req or req.pass_id != p.id: raise HTTPException(404,"Step-up request not found")
    if req.status == "pending": return {"status":"pending","step_up_id":req.id}
    if req.status == "denied": return {"status":"blocked","reason":"Citizen denied step-up"}
    if req.executed: return {"status":"already_executed","step_up_id":req.id}
    result=execute(p.citizen_id,req.action); req.executed=True; log(db,p.id,"system","step_up_executed",req.action); db.commit()
    return {"status":"executed","result":result}
