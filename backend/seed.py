from app.database import Base, SessionLocal, engine
from app.models import Citizen, Helper
Base.metadata.create_all(bind=engine)
db=SessionLocal()
try:
    if not db.query(Citizen).filter_by(name="Savitri Devi").first(): db.add(Citizen(name="Savitri Devi",language="kn",phone_masked="XXXXXX4321"))
    if not db.query(Helper).filter_by(name="Ravi").first(): db.add(Helper(name="Ravi",helper_type="csc_operator"))
    if not db.query(Helper).filter_by(name="Anil").first(): db.add(Helper(name="Anil",helper_type="family"))
    db.commit(); print("Seed data ready.")
finally: db.close()
