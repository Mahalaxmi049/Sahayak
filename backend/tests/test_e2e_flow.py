"""End-to-end integration test of the full Sahayak Pass hackathon story.

CITIZEN DELEGATES → HELPER GETS LIMITED ACCESS → LOW-RISK ACTIONS WORK →
HIGH-RISK ACTION IS BLOCKED → CITIZEN DENIES → NOTHING CHANGES →
CITIZEN APPROVES → ACTION EXECUTED EXACTLY ONCE → EVERYTHING AUDITED →
PASS REVOKED → ACCESS TERMINATED
"""

from .conftest import make_pass


def test_complete_product_story(client, identities):
    citizen_id, helper_id = identities

    # 1. Citizen creates pass with low-risk and high-risk actions
    p = client.post("/passes", json={
        "citizen_id": citizen_id,
        "helper_id": helper_id,
        "task_label": "View pension status, Download certificate, Change bank account",
        "allowed_actions": ["view_pension_status", "download_pension_certificate", "change_bank_account"],
        "duration_minutes": 30,
    }).json()

    token = p["token"]
    pass_id = p["id"]
    headers = {"X-Pass-Token": token}

    # 2. Helper validates token
    hp = client.get("/helper/pass", headers=headers)
    assert hp.status_code == 200
    hp_data = hp.json()
    assert hp_data["citizen_name"] == "Savitri Devi"
    assert hp_data["helper_name"] == "Ravi"
    assert hp_data["helper_type"] == "csc_operator"
    assert "view_pension_status" in hp_data["allowed_actions"]

    # 3. Low-risk action 1: View pension status -> 200 executed
    r1 = client.post("/helper/act", headers=headers, json={"action": "view_pension_status"})
    assert r1.status_code == 200
    assert r1.json()["status"] == "executed"
    assert r1.json()["result"]["pension_status"] == "Active"
    assert r1.json()["result"]["bank_account"] == "XXXX-1234"

    # 4. Low-risk action 2: Download pension certificate -> 200 executed
    r2 = client.post("/helper/act", headers=headers, json={"action": "download_pension_certificate"})
    assert r2.status_code == 200
    assert r2.json()["status"] == "executed"
    assert r2.json()["result"]["status"] == "ready"

    # 5. Out-of-scope action: update_mobile_number (not in allowed_actions) -> 403
    r_out = client.post("/helper/act", headers=headers, json={"action": "update_mobile_number"})
    assert r_out.status_code == 403

    # 6. High-risk action: Change bank account -> 202 step-up required (NOT executed)
    r3 = client.post("/helper/act", headers=headers, json={"action": "change_bank_account"})
    assert r3.status_code == 202
    step_up_id = r3.json()["step_up_id"]

    # 7. Citizen sees pending approval request
    pending = client.get(f"/citizen/{citizen_id}/stepups/pending").json()
    assert any(x["id"] == step_up_id and x["action"] == "change_bank_account" for x in pending)

    # 8. Citizen DENIES the first attempt
    deny_res = client.post(f"/stepups/{step_up_id}/resolve", json={"decision": "deny", "via": "button"})
    assert deny_res.status_code == 200
    assert deny_res.json()["status"] == "denied"

    # 9. Helper checks status of denied request -> blocked
    check_denied = client.get(f"/helper/stepups/{step_up_id}", headers=headers).json()
    assert check_denied["status"] == "blocked"

    # 10. Helper tries again -> creates a new step-up request
    r4 = client.post("/helper/act", headers=headers, json={"action": "change_bank_account"})
    assert r4.status_code == 202
    step_up_id_2 = r4.json()["step_up_id"]
    assert step_up_id_2 != step_up_id

    # 11. Citizen APPROVES this time via voice
    approve_res = client.post(f"/stepups/{step_up_id_2}/resolve", json={"decision": "approve", "via": "voice"})
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"

    # 12. Helper collects the approved step-up -> executes and returns masked updated bank account
    exec_res = client.get(f"/helper/stepups/{step_up_id_2}", headers=headers).json()
    assert exec_res["status"] == "executed"
    assert exec_res["result"]["bank_account"] == "XXXX-5678"

    # 13. Ensure action executes EXACTLY ONCE -> subsequent calls return already_executed
    again_res = client.get(f"/helper/stepups/{step_up_id_2}", headers=headers).json()
    assert again_res["status"] == "already_executed"

    # 14. Audit log records every event with actors and details
    audit_events = client.get(f"/passes/{pass_id}/audit").json()
    event_names = [x["event"] for x in audit_events]
    assert "pass_created" in event_names
    assert "action_executed" in event_names
    assert "blocked_out_of_scope" in event_names
    assert "step_up_requested" in event_names
    assert "step_up_denied" in event_names
    assert "step_up_approved" in event_names
    assert "step_up_executed" in event_names

    # 15. Plain-language summaries in en, hi, and kn
    sum_en = client.get(f"/passes/{pass_id}/summary?lang=en").json()
    assert "Helper completed" in sum_en["summary"]

    sum_kn = client.get(f"/passes/{pass_id}/summary?lang=kn").json()
    assert "ಸಹಾಯಕರು ಪೂರ್ಣಗೊಳಿಸಿದ್ದು" in sum_kn["summary"]

    sum_hi = client.get(f"/passes/{pass_id}/summary?lang=hi").json()
    assert "सहायक ने पूरा किया" in sum_hi["summary"]

    # 16. Citizen revokes the pass
    rev_res = client.post(f"/passes/{pass_id}/revoke")
    assert rev_res.status_code == 200
    assert rev_res.json()["status"] == "revoked"

    # 17. Further actions with revoked pass are strictly rejected
    act_revoked = client.post("/helper/act", headers=headers, json={"action": "view_pension_status"})
    assert act_revoked.status_code == 403
    hp_revoked = client.get("/helper/pass", headers=headers)
    assert hp_revoked.status_code == 403

    # 18. Audit log records pass revocation
    audit_after = client.get(f"/passes/{pass_id}/audit").json()
    assert any(x["event"] == "pass_revoked" for x in audit_after)


def test_reusable_authorization_across_services(client, identities):
    """Verify that Sahayak Pass acts as a reusable authorization layer across all services.
    Service → Action → Risk Level → Sahayak Pass Authorization
    """
    citizen_id, helper_id = identities

    # 1. Citizen creates pass for Certificates & Documents
    p = client.post("/passes", json={
        "citizen_id": citizen_id,
        "helper_id": helper_id,
        "task_label": "Check certificate status, Request reissuance",
        "allowed_actions": ["view_certificate_status", "request_certificate_reissuance"],
        "duration_minutes": 15,
    }).json()

    token = p["token"]
    headers = {"X-Pass-Token": token}

    # 2. Low-risk certificate action executes immediately
    r_low = client.post("/helper/act", headers=headers, json={"action": "view_certificate_status"})
    assert r_low.status_code == 200
    assert r_low.json()["status"] == "executed"
    assert r_low.json()["result"]["status"] == "Approved / Issued"

    # 3. High-risk certificate action triggers step-up approval (202)
    r_high = client.post("/helper/act", headers=headers, json={"action": "request_certificate_reissuance"})
    assert r_high.status_code == 202
    step_up_id = r_high.json()["step_up_id"]

    # 4. Citizen approves the sensitive certificate request
    approve = client.post(f"/stepups/{step_up_id}/resolve", json={"decision": "approve", "via": "button"})
    assert approve.status_code == 200

    # 5. Helper collects executed certificate action
    collected = client.get(f"/helper/stepups/{step_up_id}", headers=headers).json()
    assert collected["status"] == "executed"
    assert "ACK-" in collected["result"]["acknowledgement_no"]

    # 6. Attempting an action from another service (Health Services) is blocked as out of scope
    r_out = client.post("/helper/act", headers=headers, json={"action": "view_health_coverage"})
    assert r_out.status_code == 403
