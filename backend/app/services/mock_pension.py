"""In-memory MOCK pension service; this is not a real government integration."""
PENSIONS = {1: {"pension_status": "Active", "monthly_pension": "₹3,000", "bank_account": "XXXX-1234"}}
def execute(citizen_id: int, action: str) -> dict:
    """Return plausible mock data without contacting an external system."""
    record = PENSIONS.setdefault(citizen_id, {"pension_status":"Active", "monthly_pension":"₹3,000", "bank_account":"XXXX-0000"})
    if action == "view_pension_status": return {"pension_status":record["pension_status"], "monthly_pension":record["monthly_pension"], "bank_account":record["bank_account"]}
    if action == "download_pension_certificate": return {"certificate":"mock-pension-certificate.pdf", "status":"ready"}
    if action == "update_mobile_number": return {"status":"mock mobile-number update completed", "phone":"XXXXXX7890"}
    if action == "change_bank_account": return {"status":"mock bank-account change completed", "bank_account":"XXXX-5678"}
    raise ValueError("Unknown mock action")
