import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import MapView from "@/components/MapView";
import { Power, History, UserCircle, Loader2, MapPin, ArrowRight, DollarSign, Star } from "lucide-react";
import { toast } from "sonner";

export default function DriverHome() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [online, setOnline] = useState(user?.is_online || false);
  const [loc, setLoc] = useState({ lat: user?.current_lat || 57.1959, lng: user?.current_lng || -3.829 });
  const [requests, setRequests] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [accepting, setAccepting] = useState(null);

  // Geolocate
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { timeout: 5000 }
      );
    }
  }, []);

  // Active ride redirect
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/rides/active");
        if (data.ride && data.ride.driver_id === user?.id) {
          navigate(`/driver/ride/${data.ride.id}`);
        }
      } catch {}
    })();
  }, [navigate, user]);

  const toggleOnline = async () => {
    const next = !online;
    try {
      await api.post("/driver/online", { is_online: next, lat: loc.lat, lng: loc.lng });
      setOnline(next);
      toast.success(next ? "You're online" : "You're offline");
      refresh();
    } catch (e) {
      toast.error("Failed");
    }
  };

  const fetchRequests = useCallback(async () => {
    if (!online) return;
    try {
      const { data } = await api.get("/driver/requests");
      setRequests(data.rides);
    } catch {}
  }, [online]);

  useEffect(() => {
    fetchRequests();
    const t = setInterval(fetchRequests, 4000);
    return () => clearInterval(t);
  }, [fetchRequests]);

  const accept = async (id) => {
    setAccepting(id);
    try {
      await api.post(`/rides/${id}/accept`);
      navigate(`/driver/ride/${id}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not accept");
      fetchRequests();
    } finally {
      setAccepting(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Top nav */}
      <div className="px-5 pt-5 flex justify-between items-center">
        <div>
          <div className="label-eyebrow text-[#A1A1AA]">Driver</div>
          <div className="font-display font-bold text-lg tracking-tight" data-testid="driver-name-display">
            {user?.name}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/driver/earnings")}
            className="bg-[#18181B] border-2 border-[#27272A] p-2 hover:border-[#DFFF00] transition-colors"
            data-testid="driver-earnings-btn"
          >
            <DollarSign className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <button
            onClick={() => navigate("/driver/history")}
            className="bg-[#18181B] border-2 border-[#27272A] p-2 hover:border-[#DFFF00] transition-colors"
            data-testid="driver-history-btn"
          >
            <History className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <button
            onClick={() => navigate("/account")}
            className="bg-[#18181B] border-2 border-[#27272A] p-2 hover:border-[#DFFF00] transition-colors"
            data-testid="driver-account-btn"
          >
            <UserCircle className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="mt-4 h-[36vh] mx-5 border-2 border-[#27272A]">
        <MapView center={[loc.lat, loc.lng]} pickup={{ lat: loc.lat, lng: loc.lng }} dark fitBounds={false} />
      </div>

      {/* Stats grid */}
      <div className="px-5 mt-4 grid grid-cols-3 gap-2">
        <div className="bg-[#18181B] border-2 border-[#27272A] p-3">
          <div className="label-eyebrow text-[#A1A1AA]">Earnings</div>
          <div className="font-display font-black tracking-tighter text-xl text-[#DFFF00]" data-testid="stat-earnings">
            £{(user?.earnings_total || 0).toFixed(2)}
          </div>
        </div>
        <div className="bg-[#18181B] border-2 border-[#27272A] p-3">
          <div className="label-eyebrow text-[#A1A1AA]">Trips</div>
          <div className="font-display font-black tracking-tighter text-xl">{user?.rides_count || 0}</div>
        </div>
        <div className="bg-[#18181B] border-2 border-[#27272A] p-3">
          <div className="label-eyebrow text-[#A1A1AA]">Rating</div>
          <div className="font-display font-black tracking-tighter text-xl flex items-center gap-1">
            <Star className="w-4 h-4 fill-[#DFFF00] text-[#DFFF00]" /> {(user?.rating || 5).toFixed(1)}
          </div>
        </div>
      </div>

      {/* Online toggle */}
      <div className="px-5 mt-4">
        <button
          onClick={toggleOnline}
          data-testid="online-toggle-btn"
          className={`w-full py-7 font-display font-black text-3xl tracking-tighter inline-flex items-center justify-center gap-3 border-2 transition-all ${
            online
              ? "bg-[#DFFF00] text-black border-[#DFFF00] hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_#DFFF00]"
              : "bg-[#0A0A0A] text-white border-[#27272A] hover:border-[#DFFF00]"
          }`}
        >
          <Power className="w-7 h-7" strokeWidth={3} />
          {online ? "ONLINE" : "GO ONLINE"}
        </button>
      </div>

      {/* Requests */}
      <div className="px-5 mt-6 pb-10">
        <div className="flex items-center justify-between mb-3">
          <span className="label-eyebrow text-[#DFFF00]">Incoming requests</span>
          <span className="text-xs text-[#A1A1AA]">{requests.length} active</span>
        </div>

        {!online ? (
          <div className="border-2 border-dashed border-[#27272A] p-8 text-center text-[#A1A1AA]">
            Go online to receive ride requests
          </div>
        ) : requests.length === 0 ? (
          <div className="border-2 border-dashed border-[#27272A] p-8 text-center text-[#A1A1AA] flex flex-col items-center gap-2" data-testid="no-requests">
            <Loader2 className="w-5 h-5 animate-spin" />
            Searching for riders…
          </div>
        ) : (
          <div className="space-y-3" data-testid="requests-list">
            {requests.map((r) => (
              <div key={r.id} className="border-2 border-[#27272A] bg-[#18181B] p-4" data-testid={`request-${r.id}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="label-eyebrow text-[#A1A1AA]">{r.rider_name}</div>
                    <div className="font-display font-black text-2xl tracking-tighter text-[#DFFF00]">
                      £{r.fare.toFixed(2)}
                    </div>
                  </div>
                  <span className="label-eyebrow bg-[#DFFF00] text-black px-2 py-1">{r.vehicle_class}</span>
                </div>
                <div className="text-xs space-y-1 mb-4">
                  <div className="flex gap-2"><MapPin className="w-3 h-3 mt-0.5 text-[#DFFF00]" /> <span className="truncate flex-1">{r.pickup_address}</span></div>
                  <div className="flex gap-2"><MapPin className="w-3 h-3 mt-0.5 text-[#FF2B2B]" /> <span className="truncate flex-1">{r.drop_address}</span></div>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs text-[#A1A1AA] flex-1 self-center">{r.distance_km} km · ~{r.duration_min} min</span>
                  <button
                    onClick={() => accept(r.id)}
                    disabled={accepting === r.id}
                    data-testid={`accept-${r.id}-btn`}
                    className="px-5 py-3 bg-[#DFFF00] text-black font-display font-bold tracking-tight inline-flex items-center gap-2 hover:-translate-y-[2px] hover:shadow-[4px_4px_0_0_#DFFF00] transition-all disabled:opacity-50"
                  >
                    {accepting === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" strokeWidth={3} />}
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
