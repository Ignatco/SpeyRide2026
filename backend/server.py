"""
Taxi App Backend - FastAPI
- OTP login via Twilio Verify (with dev-mode fallback)
- JWT auth
- Riders + Drivers
- Ride lifecycle, fare estimation, ratings
- Stripe Checkout for payments
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import math
import random
import uuid
import jwt
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# --- Mongo ---
mongo_url = os.environ['MONGO_URL']
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ['DB_NAME']]

# --- App ---
app = FastAPI(title="Taxi App API")
api_router = APIRouter(prefix="/api")

# --- JWT ---
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_TTL_HOURS = 24 * 14

# --- Twilio (lazy init) ---
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_API_KEY_SID = os.environ.get('TWILIO_API_KEY_SID', '')
TWILIO_API_KEY_SECRET = os.environ.get('TWILIO_API_KEY_SECRET', '')
TWILIO_VERIFY_SERVICE_SID = os.environ.get('TWILIO_VERIFY_SERVICE_SID', '')

def _twilio_ready() -> bool:
    return bool(TWILIO_VERIFY_SERVICE_SID and (TWILIO_AUTH_TOKEN or (TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET)) and TWILIO_ACCOUNT_SID)

def _twilio_client():
    from twilio.rest import Client
    if TWILIO_AUTH_TOKEN:
        return Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    return Client(TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, TWILIO_ACCOUNT_SID)

# --- Stripe (emergentintegrations) ---
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("taxi")

# ==================== MODELS ====================

class SendOTPReq(BaseModel):
    phone: str  # E.164 format

class VerifyOTPReq(BaseModel):
    phone: str
    code: str

class CompleteProfileReq(BaseModel):
    name: str
    role: Literal['rider', 'driver']
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_plate: Optional[str] = None
    vehicle_class: Optional[Literal['mini', 'sedan', 'suv']] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    phone: str
    name: Optional[str] = None
    role: Optional[Literal['rider', 'driver']] = None
    avatar_url: Optional[str] = None
    rating: float = 5.0
    rides_count: int = 0
    # driver fields
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_plate: Optional[str] = None
    vehicle_class: Optional[str] = None
    is_online: bool = False
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    earnings_total: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FareEstimateReq(BaseModel):
    pickup_lat: float
    pickup_lng: float
    drop_lat: float
    drop_lng: float

class RideCreateReq(BaseModel):
    pickup_lat: float
    pickup_lng: float
    pickup_address: str
    drop_lat: float
    drop_lng: float
    drop_address: str
    vehicle_class: Literal['mini', 'sedan', 'suv']
    payment_method: Literal['cash', 'stripe']

class Ride(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    rider_id: str
    rider_name: str
    rider_phone: str
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_vehicle: Optional[str] = None
    driver_plate: Optional[str] = None
    pickup_lat: float
    pickup_lng: float
    pickup_address: str
    drop_lat: float
    drop_lng: float
    drop_address: str
    vehicle_class: str
    distance_km: float
    duration_min: int
    fare: float
    payment_method: str
    payment_status: str = 'unpaid'  # unpaid | paid
    status: str = 'searching'  # searching | accepted | arrived | in_transit | completed | cancelled
    rating: Optional[int] = None
    review: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class StatusUpdateReq(BaseModel):
    status: Literal['arrived', 'in_transit', 'completed', 'cancelled']

class RatingReq(BaseModel):
    rating: int = Field(ge=1, le=5)
    review: Optional[str] = None

class DriverLocationReq(BaseModel):
    lat: float
    lng: float

class OnlineToggleReq(BaseModel):
    is_online: bool
    lat: Optional[float] = None
    lng: Optional[float] = None

# ==================== HELPERS ====================

def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def _create_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_TTL_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user

def _haversine_km(lat1, lng1, lat2, lng2) -> float:
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

VEHICLE_CONFIG = {
    "mini": {"base": 2.5, "per_km": 1.1, "per_min": 0.15, "label": "Mini"},
    "sedan": {"base": 3.5, "per_km": 1.5, "per_min": 0.2, "label": "Sedan"},
    "suv": {"base": 5.0, "per_km": 2.2, "per_min": 0.3, "label": "SUV"},
}

def _calc_fare(distance_km: float, vehicle_class: str) -> Dict[str, Any]:
    cfg = VEHICLE_CONFIG[vehicle_class]
    duration_min = max(3, int(distance_km * 2.5))  # rough estimate
    fare = cfg["base"] + (distance_km * cfg["per_km"]) + (duration_min * cfg["per_min"])
    return {"fare": round(fare, 2), "duration_min": duration_min, "distance_km": round(distance_km, 2)}

def _serialize(doc: dict) -> dict:
    """Convert datetime fields to iso string in a copied dict for safe response."""
    if not doc:
        return doc
    out = {k: v for k, v in doc.items() if k != "_id"}
    for k, v in out.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
    return out

# ==================== AUTH ROUTES ====================

# In-memory dev OTP store {phone: code}
_dev_otps: Dict[str, str] = {}

# ---- Rate limiting state (in-memory, per-process) ----
# Send: per phone & per IP
_send_history: Dict[str, List[float]] = {}      # key="phone:+1..." or "ip:1.2.3.4" -> list of unix ts
_send_cooldown: Dict[str, float] = {}           # phone -> next-allowed unix ts
# Verify attempts: per phone (lockout on too many wrong codes)
_verify_attempts: Dict[str, List[float]] = {}   # phone -> list of failed-attempt timestamps
_verify_lockout: Dict[str, float] = {}          # phone -> locked-until unix ts

SEND_COOLDOWN_SEC = 30          # min seconds between consecutive sends to same phone
SEND_PHONE_HOURLY = 5           # max sends per phone per hour
SEND_IP_HOURLY = 15             # max sends per IP per hour
VERIFY_MAX_FAILS = 5            # wrong codes before lockout
VERIFY_FAIL_WINDOW_SEC = 15 * 60  # rolling window for failed attempts
VERIFY_LOCKOUT_SEC = 15 * 60    # how long to lock out

def _now() -> float:
    return datetime.now(timezone.utc).timestamp()

def _prune(arr: List[float], window: float, now: float) -> List[float]:
    return [t for t in arr if now - t < window]

def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def _check_send_limits(phone: str, ip: str):
    now = _now()
    # Cooldown
    nxt = _send_cooldown.get(phone, 0)
    if now < nxt:
        wait = int(nxt - now)
        raise HTTPException(429, f"Please wait {wait}s before requesting another code")
    # Per-phone hourly
    p_key = f"phone:{phone}"
    p_hist = _prune(_send_history.get(p_key, []), 3600, now)
    if len(p_hist) >= SEND_PHONE_HOURLY:
        raise HTTPException(429, "Too many code requests for this phone. Try again in an hour.")
    # Per-IP hourly
    i_key = f"ip:{ip}"
    i_hist = _prune(_send_history.get(i_key, []), 3600, now)
    if len(i_hist) >= SEND_IP_HOURLY:
        raise HTTPException(429, "Too many code requests from this device. Try again in an hour.")
    # Record
    p_hist.append(now)
    i_hist.append(now)
    _send_history[p_key] = p_hist
    _send_history[i_key] = i_hist
    _send_cooldown[phone] = now + SEND_COOLDOWN_SEC

def _check_verify_lockout(phone: str):
    now = _now()
    locked = _verify_lockout.get(phone, 0)
    if now < locked:
        wait = int((locked - now) / 60) + 1
        raise HTTPException(429, f"Too many wrong codes. Locked for {wait} more minute(s).")

def _record_verify_failure(phone: str):
    now = _now()
    arr = _prune(_verify_attempts.get(phone, []), VERIFY_FAIL_WINDOW_SEC, now)
    arr.append(now)
    _verify_attempts[phone] = arr
    if len(arr) >= VERIFY_MAX_FAILS:
        _verify_lockout[phone] = now + VERIFY_LOCKOUT_SEC
        _verify_attempts[phone] = []  # reset window after locking

def _record_verify_success(phone: str):
    _verify_attempts.pop(phone, None)
    _verify_lockout.pop(phone, None)
    _send_cooldown.pop(phone, None)

@api_router.post("/auth/send-otp")
async def send_otp(req: SendOTPReq, request: Request):
    phone = req.phone.strip()
    if not phone.startswith("+") or len(phone) < 8:
        raise HTTPException(400, "Phone must be in E.164 format e.g. +14155552671")

    ip = _client_ip(request)
    _check_send_limits(phone, ip)
    _check_verify_lockout(phone)

    if _twilio_ready():
        try:
            client = _twilio_client()
            client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID).verifications.create(
                to=phone, channel="sms"
            )
            # Clear any stale dev OTP from prior failed attempts so verify uses Twilio path
            _dev_otps.pop(phone, None)
            return {"sent": True, "mode": "twilio"}
        except Exception as e:
            logger.error(f"Twilio send failed: {e}; falling back to dev OTP")
    # Dev fallback
    code = f"{random.randint(100000, 999999)}"
    _dev_otps[phone] = code
    logger.info(f"[DEV OTP] {phone} -> {code}")
    return {"sent": True, "mode": "dev", "dev_code": code}

@api_router.post("/auth/verify-otp")
async def verify_otp(req: VerifyOTPReq):
    phone = req.phone.strip()
    code = req.code.strip()
    _check_verify_lockout(phone)

    verified = False
    # Always try Twilio first when configured
    if _twilio_ready():
        try:
            client = _twilio_client()
            check = client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID).verification_checks.create(
                to=phone, code=code
            )
            verified = check.status == "approved"
        except Exception as e:
            logger.error(f"Twilio verify failed: {e}")
            # fall through to dev OTP check
    # Dev OTP fallback (covers: Twilio not configured, Twilio rejected, or transient error)
    if not verified:
        expected = _dev_otps.get(phone)
        if expected is not None and expected == code:
            verified = True
            _dev_otps.pop(phone, None)

    if not verified:
        _record_verify_failure(phone)
        raise HTTPException(400, "Invalid OTP")

    _record_verify_success(phone)

    # Find or create user (without role yet)
    user = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not user:
        new_user = User(id=str(uuid.uuid4()), phone=phone)
        doc = new_user.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.users.insert_one(doc)
        user = await db.users.find_one({"phone": phone}, {"_id": 0})

    token = _create_jwt(user["id"])
    return {
        "token": token,
        "user": _serialize(user),
        "needs_profile": not user.get("role") or not user.get("name"),
    }

@api_router.post("/auth/complete-profile")
async def complete_profile(req: CompleteProfileReq, current_user: dict = Depends(get_current_user)):
    update = {
        "name": req.name,
        "role": req.role,
    }
    if req.role == "driver":
        update.update({
            "vehicle_make": req.vehicle_make,
            "vehicle_model": req.vehicle_model,
            "vehicle_plate": req.vehicle_plate,
            "vehicle_class": req.vehicle_class or "sedan",
        })
    await db.users.update_one({"id": current_user["id"]}, {"$set": update})
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    return {"user": _serialize(user)}

@api_router.get("/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    return {"user": _serialize(current_user)}

# ==================== RIDES ====================

@api_router.post("/rides/estimate")
async def estimate_fare(req: FareEstimateReq):
    distance = _haversine_km(req.pickup_lat, req.pickup_lng, req.drop_lat, req.drop_lng)
    estimates = {}
    for v in VEHICLE_CONFIG:
        estimates[v] = _calc_fare(distance, v)
        estimates[v]["label"] = VEHICLE_CONFIG[v]["label"]
    return {"distance_km": round(distance, 2), "estimates": estimates}

@api_router.post("/rides")
async def create_ride(req: RideCreateReq, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "rider":
        raise HTTPException(403, "Only riders can book rides")

    distance = _haversine_km(req.pickup_lat, req.pickup_lng, req.drop_lat, req.drop_lng)
    fare_info = _calc_fare(distance, req.vehicle_class)

    ride = Ride(
        id=str(uuid.uuid4()),
        rider_id=current_user["id"],
        rider_name=current_user.get("name", "Rider"),
        rider_phone=current_user["phone"],
        pickup_lat=req.pickup_lat,
        pickup_lng=req.pickup_lng,
        pickup_address=req.pickup_address,
        drop_lat=req.drop_lat,
        drop_lng=req.drop_lng,
        drop_address=req.drop_address,
        vehicle_class=req.vehicle_class,
        distance_km=fare_info["distance_km"],
        duration_min=fare_info["duration_min"],
        fare=fare_info["fare"],
        payment_method=req.payment_method,
    )
    doc = ride.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.rides.insert_one(doc)
    return {"ride": _serialize(doc)}

@api_router.get("/rides/my")
async def my_rides(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    query = {"rider_id": current_user["id"]} if role == "rider" else {"driver_id": current_user["id"]}
    rides = await db.rides.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"rides": [_serialize(r) for r in rides]}

@api_router.get("/rides/active")
async def my_active(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    base = {"status": {"$in": ["searching", "accepted", "arrived", "in_transit"]}}
    if role == "rider":
        base["rider_id"] = current_user["id"]
    else:
        base["driver_id"] = current_user["id"]
    ride = await db.rides.find_one(base, {"_id": 0}, sort=[("created_at", -1)])
    return {"ride": _serialize(ride) if ride else None}

@api_router.get("/rides/{ride_id}")
async def get_ride(ride_id: str, current_user: dict = Depends(get_current_user)):
    ride = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    if not ride:
        raise HTTPException(404, "Ride not found")
    if ride["rider_id"] != current_user["id"] and ride.get("driver_id") != current_user["id"]:
        raise HTTPException(403, "Forbidden")
    return {"ride": _serialize(ride)}

# ==================== DRIVER ROUTES ====================

@api_router.post("/driver/online")
async def driver_toggle(req: OnlineToggleReq, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "driver":
        raise HTTPException(403, "Only drivers")
    update = {"is_online": req.is_online}
    if req.lat is not None and req.lng is not None:
        update["current_lat"] = req.lat
        update["current_lng"] = req.lng
    await db.users.update_one({"id": current_user["id"]}, {"$set": update})
    return {"ok": True, "is_online": req.is_online}

@api_router.post("/driver/location")
async def driver_location(req: DriverLocationReq, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "driver":
        raise HTTPException(403, "Only drivers")
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"current_lat": req.lat, "current_lng": req.lng}}
    )
    return {"ok": True}

@api_router.get("/driver/requests")
async def driver_requests(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "driver":
        raise HTTPException(403, "Only drivers")
    if not current_user.get("is_online"):
        return {"rides": []}
    vehicle_class = current_user.get("vehicle_class", "sedan")
    rides = await db.rides.find(
        {"status": "searching", "vehicle_class": vehicle_class},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return {"rides": [_serialize(r) for r in rides]}

@api_router.post("/rides/{ride_id}/accept")
async def accept_ride(ride_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "driver":
        raise HTTPException(403, "Only drivers")
    ride = await db.rides.find_one({"id": ride_id, "status": "searching"}, {"_id": 0})
    if not ride:
        raise HTTPException(400, "Ride no longer available")
    vehicle = f"{current_user.get('vehicle_make','')} {current_user.get('vehicle_model','')}".strip() or "Vehicle"
    update = {
        "status": "accepted",
        "driver_id": current_user["id"],
        "driver_name": current_user.get("name", "Driver"),
        "driver_phone": current_user["phone"],
        "driver_vehicle": vehicle,
        "driver_plate": current_user.get("vehicle_plate", ""),
        "accepted_at": _utcnow_iso(),
    }
    res = await db.rides.update_one(
        {"id": ride_id, "status": "searching"},
        {"$set": update}
    )
    if res.modified_count == 0:
        raise HTTPException(400, "Ride no longer available")
    ride = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    return {"ride": _serialize(ride)}

@api_router.post("/rides/{ride_id}/status")
async def update_ride_status(ride_id: str, req: StatusUpdateReq, current_user: dict = Depends(get_current_user)):
    ride = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    if not ride:
        raise HTTPException(404, "Ride not found")
    is_driver = ride.get("driver_id") == current_user["id"]
    is_rider = ride.get("rider_id") == current_user["id"]
    if not (is_driver or is_rider):
        raise HTTPException(403, "Forbidden")

    new_status = req.status
    update = {"status": new_status}
    if new_status == "completed":
        if not is_driver:
            raise HTTPException(403, "Only driver can complete")
        update["completed_at"] = _utcnow_iso()
        # increment driver earnings & ride count
        await db.users.update_one(
            {"id": ride["driver_id"]},
            {"$inc": {"earnings_total": ride["fare"], "rides_count": 1}}
        )
        await db.users.update_one(
            {"id": ride["rider_id"]},
            {"$inc": {"rides_count": 1}}
        )
    if new_status == "cancelled" and ride["status"] in ("completed",):
        raise HTTPException(400, "Already completed")
    await db.rides.update_one({"id": ride_id}, {"$set": update})
    ride = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    return {"ride": _serialize(ride)}

@api_router.post("/rides/{ride_id}/rate")
async def rate_ride(ride_id: str, req: RatingReq, current_user: dict = Depends(get_current_user)):
    ride = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    if not ride:
        raise HTTPException(404, "Ride not found")
    if ride["rider_id"] != current_user["id"]:
        raise HTTPException(403, "Only rider can rate")
    if ride["status"] != "completed":
        raise HTTPException(400, "Ride not completed")
    await db.rides.update_one({"id": ride_id}, {"$set": {"rating": req.rating, "review": req.review}})
    # Update driver avg rating
    if ride.get("driver_id"):
        agg = db.rides.aggregate([
            {"$match": {"driver_id": ride["driver_id"], "rating": {"$ne": None}}},
            {"$group": {"_id": "$driver_id", "avg": {"$avg": "$rating"}}}
        ])
        async for d in agg:
            await db.users.update_one({"id": ride["driver_id"]}, {"$set": {"rating": round(d["avg"], 2)}})
    return {"ok": True}

# ==================== STRIPE PAYMENTS ====================

@api_router.post("/payments/checkout/{ride_id}")
async def create_checkout(ride_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    ride = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    if not ride:
        raise HTTPException(404, "Ride not found")
    if ride["rider_id"] != current_user["id"]:
        raise HTTPException(403, "Forbidden")
    if ride.get("payment_status") == "paid":
        raise HTTPException(400, "Already paid")

    body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
    origin = body.get("origin_url") or request.headers.get("origin") or ""
    if not origin:
        raise HTTPException(400, "origin_url required")

    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    success_url = f"{origin}/rider/ride/{ride_id}?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/rider/ride/{ride_id}"

    amount = float(ride["fare"])  # backend authoritative
    metadata = {"ride_id": ride_id, "user_id": current_user["id"]}

    req = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session = await stripe.create_checkout_session(req)

    txn = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "ride_id": ride_id,
        "user_id": current_user["id"],
        "amount": amount,
        "currency": "gbp",
        "status": "initiated",
        "payment_status": "pending",
        "metadata": metadata,
        "created_at": _utcnow_iso(),
    }
    await db.payment_transactions.insert_one(txn)
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout

    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(404, "Transaction not found")
    if txn["user_id"] != current_user["id"]:
        raise HTTPException(403, "Forbidden")

    # If already finalized, return cached state
    if txn.get("payment_status") == "paid":
        return {"payment_status": "paid", "status": txn.get("status", "complete")}

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    try:
        status = await stripe.get_checkout_status(session_id)
    except Exception as e:
        logger.error(f"Stripe status fetch failed for {session_id}: {e}")
        return {"payment_status": txn.get("payment_status", "pending"), "status": txn.get("status", "open")}

    update = {"status": status.status, "payment_status": status.payment_status}
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})

    if status.payment_status == "paid" and txn.get("payment_status") != "paid":
        await db.rides.update_one(
            {"id": txn["ride_id"]},
            {"$set": {"payment_status": "paid"}}
        )

    return {"payment_status": status.payment_status, "status": status.status}

@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout

    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    try:
        event = await stripe.handle_webhook(body, signature)
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"ok": False}
    if event.payment_status == "paid" and event.session_id:
        await db.payment_transactions.update_one(
            {"session_id": event.session_id},
            {"$set": {"payment_status": "paid", "status": "complete"}}
        )
        txn = await db.payment_transactions.find_one({"session_id": event.session_id}, {"_id": 0})
        if txn:
            await db.rides.update_one({"id": txn["ride_id"]}, {"$set": {"payment_status": "paid"}})
    return {"ok": True}

# ==================== HEALTH ====================

@api_router.get("/")
async def root():
    return {"status": "ok", "service": "taxi-api"}

# ==================== MOUNT ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    mongo_client.close()
