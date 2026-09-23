from .conftest import make_pass

def test_citizen_and_helper_lookup(client, identities):
    citizen_id, helper_id = identities
    assert client.get(f"/citizens/{citizen_id}").json()["id"] == citizen_id
    assert any(row["id"] == helper_id for row in client.get("/helpers").json())

def test_citizen_passes_are_newest_first(client, identities):
    first = make_pass(client, identities)
    second = make_pass(client, identities)
    rows = client.get(f"/citizen/{identities[0]}/passes").json()
    assert [row["id"] for row in rows] == [second["id"], first["id"]]

def test_demo_reset_clears_activity_and_reseeds(client, identities):
    access_pass = make_pass(client, identities)
    assert client.post("/demo/reset").json() == {"status": "reset"}
    assert client.get("/citizen/1/passes").json() == []
    assert len(client.get("/helpers").json()) == 2

def test_helper_pass_returns_enriched_data(client, identities):
    p = make_pass(client, identities)
    r = client.get("/helper/pass", headers={"X-Pass-Token": p["token"]})
    assert r.status_code == 200
    data = r.json()
    assert data["citizen_name"] == "Savitri Devi"
    assert data["helper_name"] == "Ravi"
    assert data["helper_type"] == "csc_operator"
    assert data["allowed_actions"] == ["view_pension_status"]

def test_helper_pass_rejects_invalid_token(client, identities):
    r = client.get("/helper/pass", headers={"X-Pass-Token": "bogus"})
    assert r.status_code == 401
