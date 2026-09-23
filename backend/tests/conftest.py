import os
os.environ["SAHAYAK_DATABASE_URL"]="sqlite:///./test_sahayak.db"
import pytest
from fastapi.testclient import TestClient
from app.database import Base, engine, SessionLocal
from app.main import app
from app.models import Citizen, Helper
@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine); Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
@pytest.fixture
def client(): return TestClient(app)
@pytest.fixture
def identities():
    db=SessionLocal(); c=Citizen(name="Savitri Devi",language="kn",phone_masked="XXXX4321"); h=Helper(name="Ravi",helper_type="csc_operator"); db.add_all([c,h]); db.commit(); db.refresh(c); db.refresh(h); result=(c.id,h.id); db.close(); return result
def make_pass(client,identities,actions=["view_pension_status"],duration=20):
    c,h=identities
    return client.post("/passes",json={"citizen_id":c,"helper_id":h,"task_label":"Help","allowed_actions":actions,"duration_minutes":duration}).json()
