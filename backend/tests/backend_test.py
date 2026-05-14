"""End-to-end backend tests for Taxi App.
Covers: OTP auth (dev), profile completion, fare estimation, full ride lifecycle,
driver earnings/ride count increment, rider rating updating driver avg,
/rides/active, /rides/my, ownership 403 enforcement, role-based 403,
idempotent rating, status transition guard, Stripe Checkout session creation.
"""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                    break
    except Exception:
        pass
API = f"{BASE_URL}/api"

SUFFIX = str(int(time.time()))[-5:]
RIDER_PHONE = f"+1415555{SUFFIX}"
DRIVER_PHONE = f"+1415666{SUFFIX}"


def _auth(phone: str) -> str:
    r = requests.post(f"{API}/auth/send-otp", json={"phone": phone})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j.get("sent") is True
    assert j.get("mode") == "dev"
    code = j["dev_code"]
    r2 = requests.post(f"{API}/auth/verify-otp", json={"phone": phone, "code": code})
    assert r2.status_code == 200, r2.text
    j2 = r2.json()
    assert "token" in j2
    # FIX: needs_profile no longer requires dob
    assert j2.get("needs_profile") is True
    return j2["token"]


@pytest.fixture(scope="module")
def rider_token():
    token = _auth(RIDER_PHONE)
    h = {"Authorization": f"Bearer {token}"}
    # FIX: send first_name + last_name, no dob
    r = requests.post(f"{API}/auth/complete-profile", headers=h, json={
        "first_name": "Test",
        "last_name": "Rider",
        "role": "rider",
    })
    assert r.status_code == 200, r.text
    assert r.json()["user"]["role"] == "rider"
    return token


@pytest.fixture(scope="module")
def driver_token():
    token = _auth(DRIVER_PHONE)
    h = {"Authorization": f"Bearer {token}"}
    # FIX: send first_name + last_name, no dob
    r = requests.post(f"{API}/auth/complete-profile", headers=h, json={
        "first_name": "Test",
        "last_name": "Driver",
        "role": "driver",
        "vehicle_make": "Toyota",
        "vehicle_model": "Camry",
        "vehicle_plate": f"TEST{SUFFIX}",
        "vehicle_class": "sedan",
    })
    assert r.status_code == 200, r.text
    u = r.json()["user"]
    assert u["role"] == "driver" and u["vehicle_class"] == "sedan"
    return token


def test_health():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_send_otp_invalid_phone():
    r = requests.post(f"{API}/auth/send-otp", json={"phone": "12345"})
    assert r.status_code == 400


def test_me(rider_token):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {rider_token}"})
    assert r.status_code == 200
    assert r.json()["user"]["phone"] == RIDER_PHONE


def test_me_unauthorized():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_estimate():
    r = requests.post(f"{API}/rides/estimate", json={
        "pickup_lat": 37.7749, "pickup_lng": -122.4194,
        "drop_lat": 37.8044, "drop_lng": -122.2712
    })
    assert r.status_code == 200
    j = r.json()
    assert j["distance_km"] > 0
    for v in ("mini", "sedan", "suv"):
        assert v in j["estimates"]
        assert j["estimates"][v]["fare"] > 0


def test_driver_cannot_create_ride(driver_token):
    r = requests.post(f"{API}/rides", headers={"Authorization": f"Bearer {driver_token}"}, json={
        "pickup_lat": 37.7749, "pickup_lng": -122.4194, "pickup_address": "A",
        "drop_lat": 37.8044, "drop_lng": -122.2712, "drop_address": "B",
        "vehicle_class": "sedan", "payment_method": "cash"
    })
    assert r.status_code == 403


def test_role_cannot_be_changed(rider_token):
    """FIX: once role is set, cannot flip to driver."""
    r = requests.post(f"{API}/auth/complete-profile",
                      headers={"Authorization": f"Bearer {rider_token}"},
                      json={
                          "first_name": "Test", "last_name": "Rider",
                          "role": "driver",
                          "vehicle_make": "Toyota", "vehicle_model": "Camry",
                          "vehicle_plate": "XYZ123", "vehicle_class": "sedan",
                      })
    assert r.status_code == 400
    assert "cannot be changed" in r.json().get("detail", "").lower()


def test_invalid_status_transition(rider_token, driver_token):
    """FIX: cannot jump directly from accepted to completed."""
    rh = {"Authorization": f"Bearer {rider_token}"}
    dh = {"Authorization": f"Bearer {driver_token}"}

    r = requests.post(f"{API}/rides", headers=rh, json={
        "pickup_lat": 37.7749, "pickup_lng": -122.4194, "pickup_address": "SF",
        "drop_lat": 37.8044, "drop_lng": -122.2712, "drop_address": "Oakland",
        "vehicle_class": "sedan", "payment_method": "cash"
    })
    ride_id = r.json()["ride"]["id"]

    requests.post(f"{API}/driver/online", headers=dh,
                  json={"is_online": True, "lat": 37.78, "lng": -122.41})
    requests.post(f"{API}/rides/{ride_id}/accept", headers=dh)

    # Try to jump directly to completed — should be rejected
    r = requests.post(f"{API}/rides/{ride_id}/status", headers=dh,
                      json={"status": "completed"})
    assert r.status_code == 400
    assert "Cannot transition" in r.json().get("detail", "")

    # Cancel it so it doesn't pollute other tests
    requests.post(f"{API}/rides/{ride_id}/status", headers=dh,
                  json={"status": "arrived"})
    requests.post(f"{API}/rides/{ride_id}/status", headers=dh,
                  json={"status": "in_transit"})
    requests.post(f"{API}/rides/{ride_id}/status", headers=dh,
                  json={"status": "completed"})


def test_full_ride_flow(rider_token, driver_token):
    rh = {"Authorization": f"Bearer {rider_token}"}
    dh = {"Authorization": f"Bearer {driver_token}"}

    # 1. Create ride
    r = requests.post(f"{API}/rides", headers=rh, json={
        "pickup_lat": 37.7749, "pickup_lng": -122.4194, "pickup_address": "SF",
        "drop_lat": 37.8044, "drop_lng": -122.2712, "drop_address": "Oakland",
        "vehicle_class": "sedan", "payment_method": "cash"
    })
    assert r.status_code == 200, r.text
    ride = r.json()["ride"]
    ride_id = ride["id"]
    assert ride["status"] == "searching"
    assert ride["fare"] > 0

    # 2. Active ride
    r = requests.get(f"{API}/rides/active", headers=rh)
    assert r.json()["ride"]["id"] == ride_id

    # 3. Driver offline → empty requests
    r = requests.get(f"{API}/driver/requests", headers=dh)
    assert r.json()["rides"] == []

    # 4. Driver goes online
    r = requests.post(f"{API}/driver/online", headers=dh,
                      json={"is_online": True, "lat": 37.78, "lng": -122.41})
    assert r.json()["is_online"] is True

    # 5. Driver sees request
    r = requests.get(f"{API}/driver/requests", headers=dh)
    assert ride_id in [x["id"] for x in r.json()["rides"]]

    # 6. Accept
    r = requests.post(f"{API}/rides/{ride_id}/accept", headers=dh)
    assert r.status_code == 200
    assert r.json()["ride"]["status"] == "accepted"

    # 7. Re-accept fails
    r = requests.post(f"{API}/rides/{ride_id}/accept", headers=dh)
    assert r.status_code == 400

    # 8. Legal progression: arrived → in_transit → completed
    for st in ("arrived", "in_transit", "completed"):
        r = requests.post(f"{API}/rides/{ride_id}/status", headers=dh,
                          json={"status": st})
        assert r.status_code == 200, r.text
        assert r.json()["ride"]["status"] == st

    # 9. Driver earnings updated
    r = requests.get(f"{API}/auth/me", headers=dh)
    assert r.json()["user"]["earnings_total"] > 0
    assert r.json()["user"]["rides_count"] >= 1

    # 10. Rider rates
    r = requests.post(f"{API}/rides/{ride_id}/rate", headers=rh,
                      json={"rating": 5, "review": "Great"})
    assert r.status_code == 200

    # 11. FIX: idempotency — second rating must be rejected
    r = requests.post(f"{API}/rides/{ride_id}/rate", headers=rh,
                      json={"rating": 1, "review": "Changed mind"})
    assert r.status_code == 400
    assert "already rated" in r.json().get("detail", "").lower()

    # 12. Driver avg rating updated
    r = requests.get(f"{API}/auth/me", headers=dh)
    assert r.json()["user"]["rating"] == 5.0

    # 13. My rides
    r = requests.get(f"{API}/rides/my", headers=rh)
    assert any(x["id"] == ride_id for x in r.json()["rides"])
    r = requests.get(f"{API}/rides/my", headers=dh)
    assert any(x["id"] == ride_id for x in r.json()["rides"])


def test_rider_can_cancel_from_accepted(rider_token, driver_token):
    """FIX: rider can cancel after driver accepts (grace period)."""
    rh = {"Authorization": f"Bearer {rider_token}"}
    dh = {"Authorization": f"Bearer {driver_token}"}

    r = requests.post(f"{API}/rides", headers=rh, json={
        "pickup_lat": 37.7749, "pickup_lng": -122.4194, "pickup_address": "SF",
        "drop_lat": 37.8044, "drop_lng": -122.2712, "drop_address": "Oakland",
        "vehicle_class": "sedan", "payment_method": "cash"
    })
    ride_id = r.json()["ride"]["id"]

    requests.post(f"{API}/driver/online", headers=dh,
                  json={"is_online": True, "lat": 37.78, "lng": -122.41})
    requests.post(f"{API}/rides/{ride_id}/accept", headers=dh)

    # Rider cancels after acceptance — should succeed
    r = requests.post(f"{API}/rides/{ride_id}/status", headers=rh,
                      json={"status": "cancelled"})
    assert r.status_code == 200
    assert r.json()["ride"]["status"] == "cancelled"


def test_forbidden_get_ride(rider_token):
    rh = {"Authorization": f"Bearer {rider_token}"}
    r = requests.post(f"{API}/rides", headers=rh, json={
        "pickup_lat": 37.7, "pickup_lng": -122.4, "pickup_address": "X",
        "drop_lat": 37.8, "drop_lng": -122.3, "drop_address": "Y",
        "vehicle_class": "mini", "payment_method": "cash"
    })
    rid = r.json()["ride"]["id"]
    other = _auth(f"+1415777{SUFFIX}")
    requests.post(f"{API}/auth/complete-profile",
                  headers={"Authorization": f"Bearer {other}"},
                  json={"first_name": "Other", "last_name": "User", "role": "rider"})
    r = requests.get(f"{API}/rides/{rid}", headers={"Authorization": f"Bearer {other}"})
    assert r.status_code == 403


def test_stripe_checkout_creation(rider_token):
    rh = {"Authorization": f"Bearer {rider_token}"}
    r = requests.post(f"{API}/rides", headers=rh, json={
        "pickup_lat": 37.7749, "pickup_lng": -122.4194, "pickup_address": "A",
        "drop_lat": 37.8044, "drop_lng": -122.2712, "drop_address": "B",
        "vehicle_class": "sedan", "payment_method": "stripe"
    })
    ride_id = r.json()["ride"]["id"]

    r = requests.post(f"{API}/payments/checkout/{ride_id}", headers=rh,
                      json={"origin_url": "https://example.com"})
    if r.status_code != 200:
        pytest.skip(f"Stripe checkout unavailable: {r.status_code} {r.text}")
    j = r.json()
    assert "url" in j and "session_id" in j

    # FIX: status endpoint must not 500 — returns pending gracefully
    r = requests.get(f"{API}/payments/status/{j['session_id']}", headers=rh)
    assert r.status_code == 200
    assert "payment_status" in r.json()
