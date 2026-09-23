from datetime import timedelta
import secrets
from fastapi import Depends, FastAPI, Header, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from .database import Base, engine, get_db
from .models import AuditLog, Citizen, Helper, Pass, StepUpRequest
from .rules import RISK, collect_stepup, helper_action, log, now

Base.metadata.create_all(bind=engine)
app=FastAPI(title="Sahayak Pass")
app.add_middleware(CORSMiddleware,allow_origins=["http://localhost:5173"],allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
class PassCreate(BaseModel):
    citizen_id:int; helper_id:int; task_label:str; allowed_actions:list[str]=Field(min_length=1); duration_minutes:int=Field(gt=0,le=1440)
class Act(BaseModel): action:str
class Resolve(BaseModel): decision:str; via:str
def dump(obj): return {c.name:getattr(obj,c.name) for c in obj.__table__.columns}
@app.post("/passes",status_code=201)
def create_pass(data:PassCreate,db:Session=Depends(get_db)):
    if not db.get(Citizen,data.citizen_id) or not db.get(Helper,data.helper_id): raise HTTPException(404,"Citizen or helper not found")
    if any(a not in RISK for a in data.allowed_actions): raise HTTPException(400,"Unknown allowed action")
    created=now(); p=Pass(**data.model_dump(),status="active",created_at=created,expires_at=created+timedelta(minutes=data.duration_minutes),token=secrets.token_urlsafe(32))
    db.add(p); db.flush(); log(db,p.id,"citizen","pass_created",data.task_label); db.commit(); db.refresh(p); return dump(p)
@app.get("/passes/{pass_id}")
def get_pass(pass_id:int,db:Session=Depends(get_db)):
    p=db.get(Pass,pass_id)
    if not p: raise HTTPException(404,"Pass not found")
    return dump(p)
@app.post("/passes/{pass_id}/revoke")
def revoke(pass_id:int,db:Session=Depends(get_db)):
    p=db.get(Pass,pass_id)
    if not p: raise HTTPException(404,"Pass not found")
    p.status="revoked"; log(db,p.id,"citizen","pass_revoked","Citizen revoked pass"); db.commit(); return {"status":"revoked"}
@app.post("/helper/act")
def act(data:Act,response:Response,x_pass_token:str=Header(...),db:Session=Depends(get_db)):
    code,payload=helper_action(db,x_pass_token,data.action); response.status_code=code; return payload
@app.get("/helper/stepups/{stepup_id}")
def stepup(stepup_id:int,x_pass_token:str=Header(...),db:Session=Depends(get_db)): return collect_stepup(db,x_pass_token,stepup_id)
@app.get("/citizen/{citizen_id}/stepups/pending")
def pending(citizen_id:int,db:Session=Depends(get_db)):
    return [dump(x) for x in db.query(StepUpRequest).join(Pass).filter(Pass.citizen_id==citizen_id,StepUpRequest.status=="pending").all()]
@app.post("/stepups/{stepup_id}/resolve")
def resolve(stepup_id:int,data:Resolve,db:Session=Depends(get_db)):
    if data.decision not in ("approve","deny") or data.via not in ("voice","button"): raise HTTPException(422,"Invalid decision or method")
    req=db.get(StepUpRequest,stepup_id)
    if not req: raise HTTPException(404,"Step-up request not found")
    if req.status!="pending": raise HTTPException(409,"Step-up already resolved")
    req.status="approved" if data.decision=="approve" else "denied"; req.resolved_at=now(); req.resolved_via=data.via; log(db,req.pass_id,"citizen","step_up_"+req.status,req.action); db.commit(); return {"status":req.status}
@app.get("/passes/{pass_id}/audit")
def audit(pass_id:int,db:Session=Depends(get_db)):
    if not db.get(Pass,pass_id): raise HTTPException(404,"Pass not found")
    return [dump(x) for x in db.query(AuditLog).filter(AuditLog.pass_id==pass_id).order_by(AuditLog.timestamp).all()]
SUMMARY={"en":{"done":"Helper completed: {done}.","blocked":"Blocked: {blocked}.","none":"No helper activity yet."},"hi":{"done":"सहायक ने पूरा किया: {done}.","blocked":"रोका गया: {blocked}.","none":"अभी तक सहायक गतिविधि नहीं हुई।"},"kn":{"done":"ಸಹಾಯಕರು ಪೂರ್ಣಗೊಳಿಸಿದ್ದು: {done}.","blocked":"ತಡೆಯಲಾಗಿದೆ: {blocked}.","none":"ಇನ್ನೂ ಸಹಾಯಕ ಚಟುವಟಿಕೆ ಇಲ್ಲ."}}
@app.get("/passes/{pass_id}/summary")
def summary(pass_id:int,lang:str="en",db:Session=Depends(get_db)):
    if lang not in SUMMARY: raise HTTPException(400,"Unsupported language")
    if not db.get(Pass,pass_id): raise HTTPException(404,"Pass not found")
    rows=db.query(AuditLog).filter(AuditLog.pass_id==pass_id).all(); done=[x.detail for x in rows if x.event in ("action_executed","step_up_executed")]; blocked=[x.detail for x in rows if x.event.startswith("blocked") or x.event=="step_up_denied"]
    t=SUMMARY[lang]; text=" ".join(([t["done"].format(done=", ".join(done))] if done else [])+([t["blocked"].format(blocked=", ".join(blocked))] if blocked else [])) or t["none"]
    return {"language":lang,"summary":text}
LABELS={"view_pension_status":{"en":"View pension status","hi":"पेंशन स्थिति देखें","kn":"ಪಿಂಚಣಿ ಸ್ಥಿತಿ ನೋಡಿ"},"download_pension_certificate":{"en":"Download pension certificate","hi":"पेंशन प्रमाणपत्र डाउनलोड करें","kn":"ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ"},"update_mobile_number":{"en":"Update mobile number","hi":"मोबाइल नंबर बदलें","kn":"ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಬದಲಿಸಿ"},"change_bank_account":{"en":"Change bank account","hi":"बैंक खाता बदलें","kn":"ಬ್ಯಾಂಕ್ ಖಾತೆ ಬದಲಿಸಿ"}}
@app.get("/meta/actions")
def actions(lang:str="en"):
    if lang not in ("en","hi","kn"): raise HTTPException(400,"Unsupported language")
    return [{"action":a,"label":LABELS[a][lang],"risk":risk} for a,risk in RISK.items()]
