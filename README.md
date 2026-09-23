# Sahayak Pass (सहायक पास / ಸಹಾಯಕ ಪಾಸ್)
### Reusable Delegated Authorization Layer for Assisted Digital Public Services

> **Important Disclaimer:**
> **Sahayak Pass is a hackathon prototype using mock public services. It is not connected to real government systems.**
> All citizen records, accounts, and helper interactions shown are simulated demonstrations for public service delegation security.

---

## 1. Project Overview

**Sahayak Pass** is a prototype of a **reusable delegated authorization layer** for assisted digital public services. It enables citizens to grant scoped, expiring permissions to trusted helpers—such as Common Service Centre (CSC) operators, family members, or neighbours—who act on their behalf across digital public service portals.

> **Key Architecture Principle:**
> **Pension is one service. Sahayak Pass is the reusable delegation and authorization layer.**

### The Core Problem
Many citizens require assistance navigating digital public services. Today, this often forces them to share confidential passwords, UPI PINs, Aadhaar OTPs, or give unrestricted access to their accounts. Once shared, credentials can be misused, stolen, or retained indefinitely.

### The Sahayak Pass Solution
Instead of sharing credentials, the citizen creates a **time-limited, scoped Sahayak Pass** allowing the helper to perform only selected tasks for a designated public service.

**Zero Credential Sharing:**
The helper **NEVER** receives, sees, or enters:
- OTP
- PIN
- Login password
- Bank password or UPI PIN
- Any other citizen credential

There is **no OTP/PIN/password input field anywhere** in the entire application or API.

### The Architectural Flow
```
Service → Action → Risk Level → Sahayak Pass Authorization
```

### The Core Story
```
CITIZEN DELEGATES → HELPER GETS LIMITED ACCESS → LOW-RISK ACTIONS WORK →
HIGH-RISK ACTION IS BLOCKED → CITIZEN APPROVES/REJECTS →
ACTION IS EXECUTED ONLY AFTER APPROVAL → EVERYTHING IS AUDITED → PASS EXPIRES/IS REVOKED
```

---

## 2. Public Services Supported

The prototype demonstrates reusable authorization across four representative public service areas:

| Public Service Area | Low-Risk Actions (Automatic Execution) | High-Risk Actions (Citizen Step-Up Required) |
|---|---|---|
| **Welfare & Pensions** *(Primary demo)* | • View pension status<br>• Download pension certificate | • Change bank account<br>• Update mobile number |
| **Certificates & Documents** | • Check certificate status<br>• Download issued certificate | • Request certificate reissuance<br>• Update applicant details |
| **Education & Scholarships** | • View scholarship disbursement<br>• Download sanction letter | • Change scholarship bank account<br>• Update student profile |
| **Health Services** | • Check health coverage<br>• Download health card (ABHA) | • Link family member to health card<br>• Change primary health center |

All services use the **exact same authorization engine**:
1. Scoped low-risk action executes immediately.
2. Sensitive high-risk action triggers a step-up approval request (HTTP 202).
3. Out-of-scope action is blocked by policy (HTTP 403).
4. Expired or revoked passes reject all requests.
5. Every authorization decision and action is permanently audited.

---

## 3. Security Model & Architecture

### Four Pillars of Protection

1. **Scope Control (Least Privilege):**
   The pass explicitly defines `allowed_actions`. Any attempted action outside this list is immediately rejected with HTTP 403 and logged as an out-of-scope event.
2. **Strict Time Limits (Ephemeral Access):**
   Passes automatically expire after the configured duration (15, 30, or 60 minutes). Expired passes cannot be used for any operation.
3. **Step-Up Approval for Sensitive Actions:**
   Actions are classified by risk:
   - **LOW Risk**: Executes immediately when scoped.
   - **HIGH Risk**: **Never** executes immediately. The backend returns HTTP 202 (`step_up_required`), generating a pending approval request that must be explicitly approved by the citizen via button or voice. Approved requests execute **exactly once**.
4. **Complete Audit Trail:**
   Every event (`pass_created`, `action_executed`, `step_up_requested`, `step_up_approved`, `step_up_denied`, `blocked_out_of_scope`, `pass_revoked`, `pass_expired`) is immutably recorded with actor, action detail, and timestamp.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (React + Vite)               │
│  ┌───────────────────────────────┐ ┌─────────────────────┐  │
│  │         Citizen View          │ │ Helper / CSC Counter│  │
│  │ - Service & Action Scoping    │ │ - Token Entry       │  │
│  │ - Active Pass & Countdown     │ │ - Service Selector  │  │
│  │ - Step-up Modal (Voice/Button)│ │ - Permitted Actions │  │
│  │ - Audit Trail & Summaries     │ │ - Sensitive Actions │  │
│  │                               │ │ - Out-of-Scope Test │  │
│  └───────────────────────────────┘ └─────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON (CORS enabled)
┌──────────────────────────────▼──────────────────────────────┐
│                    Backend (FastAPI + SQLAlchemy)           │
│  ┌─────────────────┐ ┌──────────────────┐ ┌───────────────┐ │
│  │    rules.py     │ │  mock_pension.py │ │   models.py   │ │
│  │ Authorization & │ │  Mock Public     │ │ SQLite ORM    │ │
│  │ Step-Up Engine  │ │  Services Engine │ │ Entities      │ │
│  └─────────────────┘ └──────────────────┘ └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. How to Run

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ and npm

### Backend Setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API Base URL: `http://127.0.0.1:8000`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`

### Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

- Web UI: `http://localhost:5173` (or the port Vite outputs)

---

## 5. API Overview

| Method | Path | Description | Authorization / Headers |
|---|---|---|---|
| `POST` | `/passes` | Creates a new Sahayak Pass with allowed actions & expiry | None |
| `GET` | `/passes/{id}` | Fetches pass details by ID | None |
| `POST` | `/passes/{id}/revoke` | Instantly revokes the pass | None |
| `GET` | `/passes/{id}/audit` | Returns immutable audit log for the pass | None |
| `GET` | `/passes/{id}/summary` | Returns plain-language summary (`?lang=en\|hi\|kn`) | None |
| `GET` | `/citizens/{id}` | Retrieves citizen record | None |
| `GET` | `/citizen/{id}/passes` | Retrieves all passes created by a citizen | None |
| `GET` | `/citizen/{id}/stepups/pending` | Lists pending step-up requests for a citizen | None |
| `POST` | `/stepups/{id}/resolve` | Citizen approves or denies a step-up (`button` / `voice`) | None |
| `GET` | `/helpers` | Lists available helpers | None |
| `GET` | `/helper/pass` | Validates pass token and returns enriched metadata | `X-Pass-Token: <token>` |
| `POST` | `/helper/act` | Executes low-risk action (200) or initiates step-up (202) | `X-Pass-Token: <token>` |
| `GET` | `/helper/stepups/{id}` | Checks step-up status / collects execution result | `X-Pass-Token: <token>` |
| `GET` | `/meta/actions` | Metadata for available actions, risk levels, services, and i18n labels | `?lang=en\|hi\|kn` |
| `POST` | `/demo/reset` | Resets database to seeded state for demo replay | None |

---

## 6. Judge / Hackathon Demo Flow

The prototype is built for demonstration to hackathon judges in **under 2 minutes**:

1. **Open Citizen View**:
   - The citizen interface opens with the architecture pipeline banner: `Service → Action → Risk Level → Sahayak Pass Authorization`.
   - Seeded citizen: **Savitri Devi** (preferred language: **Kannada**).
   - Switch language at any time via the top-right switcher (English, हिन्दी, ಕನ್ನಡ).
2. **Create Pass**:
   - Step 1: Choose Helper: **Ravi — CSC Operator**.
   - Step 2: Choose Public Service & Actions:
     - Select **Welfare & Pensions** (or **Certificates & Documents**).
     - Select Low-Risk tasks: ☑ View pension status, ☑ Download pension certificate
     - Select High-Risk task: ☑ Change bank account
   - Step 3: Choose Duration: **30 minutes**.
   - Step 4: Click **Create Sahayak Pass**.
3. **Inspect Confirmation Screen**:
   - Notice the dedicated confirmation card showing helper, task, access list, expiry, active status, token, and a security notice explaining no credentials need to be shared.
   - Click **Copy Token** (or switch tabs; the active pass token is shared automatically across views for demo convenience).
4. **Switch to Helper / CSC Counter**:
   - Notice the **Helper Counter** interface clearly displaying the active pass banner: **✓ AUTHORIZED PASS ACTIVE**, citizen name, helper name, and real-time countdown.
   - Use the **Service Selector** to switch between **Welfare & Pensions**, **Certificates & Documents**, **Education & Scholarships**, and **Health Services**.
5. **Execute Permitted Actions**:
   - Click **View pension status** → **Success**: displays beneficiary name, active status, ₹3,000 monthly pension, masked account `XXXX-1234`.
   - Click **Download pension certificate** → **Success**: displays ready certificate with a real simulated `.txt` download button.
6. **Demonstrate Policy Enforcement (Out-of-Scope)**:
   - Select another service (e.g. **Health Services**).
   - Click an out-of-scope action (e.g. **Check health coverage**).
   - Result card immediately displays:
     `✕ Action blocked by access policy: Action is outside this pass's scope`
7. **Attempt Sensitive Action (High-Risk)**:
   - Switch back to **Welfare & Pensions**, click **Change bank account** (High Risk).
   - Helper UI immediately blocks and displays:
     `🔐 Citizen Approval Required: This action is sensitive and has been blocked. Waiting for citizen approval…`
8. **Switch to Citizen View (Step-Up Approval)**:
   - Prominent modal appears:
     `Step-Up Approval Required: Ravi is requesting to perform a sensitive action:`
   - Shows: Requested by Ravi (CSC Operator), Service (Welfare & Pensions), Action (Change bank account), Pass (Sahayak Pass), Timestamp.
   - **Deny Test**: Click **Deny Action** → In Helper View, result changes to `✕ Action denied by citizen: No changes were made to the citizen record.`
   - Helper clicks **Change bank account** again → New approval request generated.
   - **Approve Test**: Citizen approves via **Button** or **Voice** (spoken Kannada/Hindi/English prompt and response).
9. **Verify Execution**:
   - Helper View updates automatically to:
     `✓ Action approved and executed`
     `✓ Bank account updated: XXXX-5678`
   - Subsequent calls return `already_executed` (executing strictly once).
10. **Examine Audit Trail & Plain-Language Summary**:
    - In Citizen View, look at **Immutable Audit Trail**:
      Every action is listed chronologically with timestamp, event, and actor (Savitri Devi, Ravi, System).
    - Look at **Plain-language Summary**: A clear summary in Kannada (`ಸಹಾಯಕರು ಪೂರ್ಣಗೊಳಿಸಿದ್ದು...`), Hindi, or English.
11. **Test Access Termination**:
    - Click **Revoke Pass** in Citizen View.
    - Status immediately becomes **REVOKED**.
    - Any subsequent action from Helper View fails with `✕ Action blocked: This pass has been revoked by the citizen.`
12. **Reset Demo**:
    - Click **Reset Demo** in the top navigation bar to reset the database and repeat the flow from scratch.

---

## 7. Testing

### Run Backend Unit & Integration Tests

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pytest -v
```

All 14 test suites verify:
- Expired passes rejected (HTTP 401)
- Revoked passes rejected (HTTP 403)
- Out-of-scope actions rejected (HTTP 403)
- High-risk actions return HTTP 202 without execution
- Denied step-up requests never execute
- Approved step-up requests execute exactly once
- Audit trail immutably records all events
- Citizen & helper lookups
- Passes sorted newest-first
- Demo reset functionality
- Enriched helper pass metadata validation
- Invalid token rejection
- Complete product story end-to-end integration
- Reusable authorization across public services (Certificates, Education, Health)

### Build Frontend

```powershell
cd frontend
npm run build
```
Builds cleanly with zero errors or warnings.
