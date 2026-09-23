"""In-memory MOCK public services execution; this is not a real government integration."""

PENSIONS = {1: {"pension_status": "Active", "monthly_pension": "₹3,000", "bank_account": "XXXX-1234"}}

def execute(citizen_id: int, action: str) -> dict:
    """Return plausible mock data without contacting an external system."""
    record = PENSIONS.setdefault(citizen_id, {"pension_status": "Active", "monthly_pension": "₹3,000", "bank_account": "XXXX-0000"})
    
    # ── Welfare & Pensions ──
    if action == "view_pension_status":
        return {"pension_status": record["pension_status"], "monthly_pension": record["monthly_pension"], "bank_account": record["bank_account"]}
    if action == "download_pension_certificate":
        return {"certificate": "mock-pension-certificate.pdf", "status": "ready"}
    if action == "update_mobile_number":
        return {"status": "mock mobile-number update completed", "phone": "XXXXXX7890"}
    if action == "change_bank_account":
        return {"status": "mock bank-account change completed", "bank_account": "XXXX-5678"}

    # ── Certificates & Documents ──
    if action == "view_certificate_status":
        return {"application_id": "CERT-2024-9912", "certificate_type": "Income & Asset Certificate", "status": "Approved / Issued", "valid_until": "31-Mar-2027"}
    if action == "download_issued_certificate":
        return {"certificate": "mock-income-certificate.pdf", "status": "ready"}
    if action == "request_certificate_reissuance":
        return {"status": "mock certificate reissuance submitted", "acknowledgement_no": "ACK-88129"}
    if action == "modify_certificate_details":
        return {"status": "mock certificate details updated", "applicant": "Savitri Devi"}

    # ── Education & Scholarships ──
    if action == "view_scholarship_status":
        return {"scheme": "Post-Matric Merit Scholarship", "academic_year": "2024-25", "status": "Sanctioned", "amount": "₹12,000", "disbursed_to": "XXXX-1234"}
    if action == "download_scholarship_sanction":
        return {"certificate": "mock-scholarship-sanction.pdf", "status": "ready"}
    if action == "update_disbursement_bank":
        return {"status": "mock scholarship bank updated", "bank_account": "XXXX-9876"}
    if action == "modify_student_profile":
        return {"status": "mock student profile updated", "student": "Anil Kumar"}

    # ── Health Services ──
    if action == "view_health_coverage":
        return {"scheme": "Universal Health Protection Scheme", "policy_status": "Active", "coverage_amount": "₹5,00,000", "beneficiary": "Savitri Devi"}
    if action == "download_abha_card":
        return {"certificate": "mock-health-card.pdf", "status": "ready"}
    if action == "link_new_beneficiary":
        return {"status": "mock beneficiary link completed", "member": "Anil (Son)"}
    if action == "update_primary_health_center":
        return {"status": "mock PHC update completed", "phc": "Community Health Centre - Sector 4"}

    raise ValueError(f"Unknown mock action: {action}")
