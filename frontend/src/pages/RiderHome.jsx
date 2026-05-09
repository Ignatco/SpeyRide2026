import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import MapView from "@/components/MapView";
import { Car, CarFront, Truck, MapPin, Navigation2, History, LogOut, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

const VEHICLES = [
  { id: "mini", label: "Mini", icon: Car, desc: "Compact · 2 seats", eta: "3 min" },
  { id: "sedan", label: "Sedan", icon: CarFront, desc: "Comfort · 4 seats", eta: "4 min" },
  { id: "suv", label: "SUV", icon: Truck, desc: "Spacious · 6 seats", eta: "6 min" },
];

// Geocoding via Nominatim
async function geocode(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  return res.json();
}

function AddressInput({ value, onPick, placeholder, testid, color = "#002FA7" }) {
  const [q, setQ] = useState(value?.address || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const tRef = useRef(null);

  useEffect(() => {
    setQ(value?.address || "");
  }, [value]);

  const onChange = (v) => {
    setQ(v);
    setOpen(true);
    if (tRef.current) clearTimeout(tRef.current);
    if (!v || v.length < 3) {
      setResults([]);
      return;
    }
    tRef.current = setTimeout(async () => {
      try {
        const r = await geocode(v);
        setResults(r);
      } catch (e) {
        setResults([]);
      }
    }, 350);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-3 border-2 border-black bg-white px-3 py-3">
        <span className="w-3 h-3 rounded-full" style={{ background: color }} />
        <input
          data-testid={testid}
          value={q}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder={placeholder}
          className="flex-1 outline-none text-sm font-medium bg-transparent"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border-2 border-black max-h-64 overflow-auto shadow-[4px_4px_0_0_#0A0A0A]">
          {results.map((r, i) => (
            <button
              key={i}
              onMouseDown={() => {
                onPick({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), address: r.display_name });
                setQ(r.display_name);
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-[#F4F4F5] border-b border-[#E4E4E7] last:border-b-0"
              data-testid={`${testid}-suggestion-${i}`}
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RiderHome() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [estimates, setEstimates] = useState(null);
  const [vehicle, setVehicle] = useState("sedan");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [activeRide, setActiveRide] = useState(null);

  // Try geolocate user as default pickup
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (pickup) return;
          const { latitude, longitude } = pos.coords;
          try {
            const r = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
              { headers: { "Accept-Language": "en-GB" } }
            ).then((x) => x.json());
            if (r?.address?.country_code === "gb") {
              setPickup({ lat: latitude, lng: longitude, address: r.display_name || "Current location" });
            } else {
              setPickup({ lat: 57.1959, lng: -3.829, address: "Aviemore, Highland (default)" });
            }
          } catch {
            setPickup({ lat: 57.1959, lng: -3.829, address: "Aviemore, Highland (default)" });
          }
        },
        () => {
          setPickup({ lat: 57.1959, lng: -3.829, address: "Aviemore, Highland (default)" });
        },
        { timeout: 5000 }
      );
    } else {
      setPickup({ lat: 57.1959, lng: -3.829, address: "Aviemore, Highland (default)" });
    }
    // eslint-disable-next-line
  }, []);

  // Check existing active ride
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/rides/active");
        if (data.ride) {
          setActiveRide(data.ride);
          navigate(`/rider/ride/${data.ride.id}`);
        }
      } catch {}
    })();
  }, [navigate]);

  // Fetch estimates when both points selected
  useEffect(() => {
    if (!pickup || !drop) {
      setEstimates(null);
      return;
    }
    (async () => {
      try {
        const { data } = await api.post("/rides/estimate", {
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          drop_lat: drop.lat,
          drop_lng: drop.lng,
        });
        setEstimates(data);
      } catch (e) {
        // ignore
      }
    })();
  }, [pickup, drop]);

  const book = async () => {
    if (!pickup || !drop) return toast.error("Set pickup and destination");
    setLoading(true);
    try {
      const { data } = await api.post("/rides", {
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        pickup_address: pickup.address,
        drop_lat: drop.lat,
        drop_lng: drop.lng,
        drop_address: drop.address,
        vehicle_class: vehicle,
        payment_method: paymentMethod,
      });
      navigate(`/rider/ride/${data.ride.id}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full relative bg-white">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-4 flex justify-between items-start pointer-events-none">
        <div className="bg-white border-2 border-black px-3 py-2 pointer-events-auto" data-testid="rider-greeting">
          <div className="label-eyebrow text-[#52525B]">Hello</div>
          <div className="font-display font-bold text-sm tracking-tight">{user?.name || "Rider"}</div>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => navigate("/rider/history")}
            className="bg-white border-2 border-black p-2 hover:-translate-y-[2px] hover:shadow-[4px_4px_0_0_#0A0A0A] transition-all"
            data-testid="rider-history-btn"
          >
            <History className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <button
            onClick={() => { logout(); navigate("/"); }}
            className="bg-white border-2 border-black p-2 hover:-translate-y-[2px] hover:shadow-[4px_4px_0_0_#0A0A0A] transition-all"
            data-testid="rider-logout-btn"
          >
            <LogOut className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="absolute inset-0">
        <MapView pickup={pickup} drop={drop} dark={false} />
      </div>

      {/* Bottom sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-white border-t-2 border-black p-5 pb-8 max-h-[68vh] overflow-y-auto no-scrollbar">
        <div className="w-12 h-1 bg-black mx-auto mb-5" />

        <span className="label-eyebrow text-[#002FA7]">Where to?</span>
        <h2 className="font-display font-black tracking-tighter text-3xl mb-4 mt-1">Plan your trip.</h2>

        <div className="space-y-2 mb-5">
          <AddressInput
            value={pickup}
            onPick={setPickup}
            placeholder="Pickup location (UK)"
            testid="pickup-input"
            color="#002FA7"
          />
          <AddressInput
            value={drop}
            onPick={setDrop}
            placeholder="Where to? (UK)"
            testid="drop-input"
            color="#FF2B2B"
          />
        </div>

        {estimates && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4" data-testid="vehicle-grid">
              {VEHICLES.map((v) => {
                const Icon = v.icon;
                const est = estimates.estimates[v.id];
                const active = vehicle === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setVehicle(v.id)}
                    data-testid={`vehicle-${v.id}-btn`}
                    className={`p-3 border-2 text-left transition-all ${
                      active
                        ? "border-[#002FA7] bg-[#002FA7] text-white"
                        : "border-black bg-white hover:-translate-y-[2px]"
                    }`}
                  >
                    <Icon className="w-6 h-6 mb-2" strokeWidth={2.5} />
                    <div className="font-display font-bold text-sm tracking-tight">{v.label}</div>
                    <div className="text-[10px] opacity-80 mb-1">{v.eta}</div>
                    <div className="font-display font-black text-lg tracking-tighter">£{est.fare.toFixed(2)}</div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {["cash", "stripe"].map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  data-testid={`payment-${m}-btn`}
                  className={`py-2.5 border-2 font-display font-bold text-sm uppercase tracking-wide transition-all ${
                    paymentMethod === m ? "border-black bg-black text-white" : "border-black bg-white"
                  }`}
                >
                  {m === "cash" ? "Cash" : "Card · Stripe"}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-end mb-3 text-sm">
              <span className="text-[#52525B]">Distance</span>
              <span className="font-display font-bold">{estimates.distance_km} km</span>
            </div>

            <button
              onClick={book}
              disabled={loading || !pickup || !drop}
              data-testid="book-ride-btn"
              className="w-full py-5 bg-[#002FA7] text-white font-display font-black text-lg tracking-tight inline-flex items-center justify-center gap-2 transition-all hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_#0A0A0A] disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation2 className="w-5 h-5" strokeWidth={2.5} />}
              Confirm {VEHICLES.find((x) => x.id === vehicle).label} · £{estimates.estimates[vehicle].fare.toFixed(2)}
            </button>
          </>
        )}
        {!estimates && pickup && !drop && (
          <div className="bg-[#F4F4F5] border-2 border-dashed border-[#E4E4E7] p-5 text-center text-sm text-[#52525B] flex items-center justify-center gap-2">
            <Search className="w-4 h-4" /> Pick a destination to see fare estimates
          </div>
        )}
      </div>
    </div>
  );
}
