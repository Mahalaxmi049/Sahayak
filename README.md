# Sahayak Pass

Prototype for narrowly scoped, expiring helper access to a **mock** pension service. Helpers use a pass token only; the API intentionally contains no OTP, PIN, or password fields.

## Run

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload
```

The API is at `http://127.0.0.1:8000` and interactive documentation is at `/docs`. CORS permits `http://localhost:5173` for the future frontend.

## Test

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest
```

`frontend/` is deliberately empty, ready for the client application.
