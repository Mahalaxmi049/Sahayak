from datetime import timedelta
import secrets
from fastapi import Depends, FastAPI, Header, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import delete
from .database import Base, engine, get_db
from .models import AuditLog, Citizen, Helper, Pass, StepUpRequest
from .rules import RISK, collect_stepup, helper_action, log, now

Base.metadata.create_all(bind=engine)
app=FastAPI(title="Sahayak Pass")
app.add_middleware(CORSMiddleware,allow_origins=["http://localhost:5173","http://localhost:5174","http://localhost:5175","http://localhost:5176","http://localhost:5177"],allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
class PassCreate(BaseModel):
    citizen_id:int; helper_id:int; task_label:str; allowed_actions:list[str]=Field(min_length=1); duration_minutes:int=Field(gt=0,le=1440)
class Act(BaseModel): action:str
class Resolve(BaseModel): decision:str; via:str
def dump(obj): return {c.name:getattr(obj,c.name) for c in obj.__table__.columns}
def seed_demo(db: Session):
    """Resettable local demo data only; it never contacts a real pension service."""
    db.add(Citizen(name="Savitri Devi", language="kn", phone_masked="XXXXXX4321"))
    db.add_all([Helper(name="Ravi", helper_type="csc_operator"), Helper(name="Anil", helper_type="family")])
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
@app.get("/citizens/{citizen_id}")
def get_citizen(citizen_id:int, db:Session=Depends(get_db)):
    citizen=db.get(Citizen,citizen_id)
    if not citizen: raise HTTPException(404,"Citizen not found")
    return dump(citizen)
@app.get("/helpers")
def helpers(db:Session=Depends(get_db)):
    return [dump(helper) for helper in db.query(Helper).order_by(Helper.id).all()]
@app.get("/citizen/{citizen_id}/passes")
def citizen_passes(citizen_id:int, db:Session=Depends(get_db)):
    if not db.get(Citizen,citizen_id): raise HTTPException(404,"Citizen not found")
    return [dump(p) for p in db.query(Pass).filter(Pass.citizen_id==citizen_id).order_by(Pass.created_at.desc()).all()]
@app.post("/demo/reset")
def demo_reset(db:Session=Depends(get_db)):
    db.execute(delete(AuditLog)); db.execute(delete(StepUpRequest)); db.execute(delete(Pass)); db.execute(delete(Helper)); db.execute(delete(Citizen))
    seed_demo(db); db.commit()
    return {"status":"reset"}
@app.post("/passes/{pass_id}/revoke")
def revoke(pass_id:int,db:Session=Depends(get_db)):
    p=db.get(Pass,pass_id)
    if not p: raise HTTPException(404,"Pass not found")
    p.status="revoked"; log(db,p.id,"citizen","pass_revoked","Citizen revoked pass"); db.commit(); return {"status":"revoked"}
@app.post("/helper/act")
def act(data:Act,response:Response,x_pass_token:str=Header(...),db:Session=Depends(get_db)):
    code,payload=helper_action(db,x_pass_token,data.action); response.status_code=code; return payload
@app.get("/helper/pass")
def helper_pass(x_pass_token:str=Header(...),db:Session=Depends(get_db)):
    """Validate a pass token and return enriched pass information."""
    from .rules import pass_from_token
    p=pass_from_token(db,x_pass_token); c=db.get(Citizen,p.citizen_id); h=db.get(Helper,p.helper_id)
    return {**dump(p),"citizen_name":c.name if c else None,"helper_name":h.name if h else None,"helper_type":h.helper_type if h else None}
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
SERVICES = {
    # Welfare & Pensions
    "view_pension_status": "welfare_pensions",
    "download_pension_certificate": "welfare_pensions",
    "update_mobile_number": "welfare_pensions",
    "change_bank_account": "welfare_pensions",
    # Certificates & Documents
    "view_certificate_status": "certificates_documents",
    "download_issued_certificate": "certificates_documents",
    "request_certificate_reissuance": "certificates_documents",
    "modify_certificate_details": "certificates_documents",
    # Education & Scholarships
    "view_scholarship_status": "education_scholarships",
    "download_scholarship_sanction": "education_scholarships",
    "update_disbursement_bank": "education_scholarships",
    "modify_student_profile": "education_scholarships",
    # Health Services
    "view_health_coverage": "health_services",
    "download_abha_card": "health_services",
    "link_new_beneficiary": "health_services",
    "update_primary_health_center": "health_services",
}

LABELS = {
    # Welfare & Pensions
    "view_pension_status": {"en": "View pension status", "hi": "पेंशन स्थिति देखें", "kn": "ಪಿಂಚಣಿ ಸ್ಥಿತಿ ನೋಡಿ"},
    "download_pension_certificate": {"en": "Download pension certificate", "hi": "पेंशन प्रमाणपत्र डाउनलोड करें", "kn": "ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ"},
    "update_mobile_number": {"en": "Update mobile number", "hi": "मोबाइल नंबर बदलें", "kn": "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಬದಲಿಸಿ"},
    "change_bank_account": {"en": "Change bank account", "hi": "बैंक खाता बदलें", "kn": "ಬ್ಯಾಂಕ್ ಖಾತೆ ಬದಲಿಸಿ"},
    # Certificates & Documents
    "view_certificate_status": {"en": "Check certificate status", "hi": "प्रमाणपत्र स्थिति देखें", "kn": "ಪ್ರಮಾಣಪತ್ರ ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ"},
    "download_issued_certificate": {"en": "Download issued certificate", "hi": "जारी प्रमाणपत्र डाउनलोड करें", "kn": "ನೀಡಲಾದ ಪ್ರಮಾಣಪತ್ರ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ"},
    "request_certificate_reissuance": {"en": "Request certificate reissuance", "hi": "प्रमाणपत्र पुनर्जारी करने का अनुरोध", "kn": "ಪ್ರಮಾಣಪತ್ರ ಮರು-ವಿತರಣೆ ಕೋರಿಕೆ"},
    "modify_certificate_details": {"en": "Update applicant details", "hi": "आवेदक विवरण अपडेट करें", "kn": "ಅರ್ಜಿದಾರರ ವಿವರ ನವೀಕರಿಸಿ"},
    # Education & Scholarships
    "view_scholarship_status": {"en": "View scholarship disbursement", "hi": "छात्रवृत्ति स्थिति देखें", "kn": "ವಿದ್ಯಾರ್ಥಿವೇತನ ಸ್ಥಿತಿ ನೋಡಿ"},
    "download_scholarship_sanction": {"en": "Download sanction letter", "hi": "मंज़ूरी पत्र डाउनलोड करें", "kn": "ಮಂಜೂರಾತಿ ಪತ್ರ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ"},
    "update_disbursement_bank": {"en": "Change scholarship bank account", "hi": "छात्रवृत्ति बैंक खाता बदलें", "kn": "ವಿದ್ಯಾರ್ಥಿವೇತನ ಬ್ಯಾಂಕ್ ಖಾತೆ ಬದಲಿಸಿ"},
    "modify_student_profile": {"en": "Update student profile", "hi": "छात्र प्रोफाइल अपडेट करें", "kn": "ವಿದ್ಯಾರ್ಥಿ ಪ್ರೊಫೈಲ್ ನವೀಕರಿಸಿ"},
    # Health Services
    "view_health_coverage": {"en": "Check health insurance coverage", "hi": "स्वास्थ्य बीमा कवरेज देखें", "kn": "ಆರೋಗ್ಯ ವಿಮೆ ವ್ಯಾಪ್ತಿ ಪರಿಶೀಲಿಸಿ"},
    "download_abha_card": {"en": "Download health card (ABHA)", "hi": "स्वास्थ्य कार्ड (ABHA) डाउनलोड करें", "kn": "ಆರೋಗ್ಯ ಕಾರ್ಡ್ (ABHA) ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ"},
    "link_new_beneficiary": {"en": "Link family member to health card", "hi": "स्वास्थ्य कार्ड में परिवार का सदस्य जोड़ें", "kn": "ಆರೋಗ್ಯ ಕಾರ್ಡ್‌ಗೆ ಕುಟುಂಬ ಸದಸ್ಯರನ್ನು ಸೇರಿಸಿ"},
    "update_primary_health_center": {"en": "Change primary health center", "hi": "प्राथमिक स्वास्थ्य केंद्र बदलें", "kn": "ಪ್ರಾಥಮಿಕ ಆರೋಗ್ಯ ಕೇಂದ್ರ ಬದಲಿಸಿ"},
}

@app.get("/meta/actions")
def actions(lang: str = "en"):
    if lang not in ("en", "hi", "kn"): raise HTTPException(400, "Unsupported language")
    return [{"action": a, "label": LABELS.get(a, {}).get(lang, a), "risk": risk, "service": SERVICES.get(a, "welfare_pensions")} for a, risk in RISK.items()]
