import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import MapView from "@/components/MapView";
import { Phone, Loader2, Navigation2, CheckCircle2, ArrowLeft, MapPin } from "lucide-react";
import { toast } from "sonner";

const NEXT_ACTION = {
  accepted: { next: "arrived", label: "I've arrived" },
  arrived: { next: "in_transit", label: "Start trip" },
  in_transit: { next: "completed", label: "Complete trip" },
};

export default function DriverRide() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [acting, setActing] = useState(false);

  const fetchRide = useCallback(async () => {
    try {
      const { data } = await api.get(`/rides/${id}`);
      setRide(data.ride);
    } catch {}
  }, [id]);

  useEffect(() => {
    fetchRide();
    const t = setInterval(fetchRide, 5000);
    return () => clearInterval(t);
  }, [fetchRide]);

  if (!ride) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">
        <Loader2 className="w-7 h-7 animate-spin" />
      </div>
    );
  }

  const action = NEXT_ACTION[ride.status];
  const isCompleted = ride.status === "completed";

  const advance = async () => {
    if (!action) return;
    setActing(true);
    try {
      await api.post(`/rides/${ride.id}/status`, { status: action.next });
      fetchRide();
      if (action.next === "completed") {
        toast.success("Trip completed");
      }
    } catch (e) {
      toast.error("Failed");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* Map */}
      <div className="h-[42vh] relative border-b-2 border-[#27272A]">
        <MapView
          pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
          drop={{ lat: ride.drop_lat, lng: ride.drop_lng }}
          dark
        />
      </div>

      <div className="flex-1 px-5 pt-5 pb-10 max-w-md mx-auto w-full">
        <span className="label-eyebrow text-[#DFFF00]">Active trip</span>
        <h1 className="font-display font-black tracking-tighter text-3xl mt-1 mb-4">
          {ride.status === "accepted" && "Drive to pickup"}
          {ride.status === "arrived" && "Pickup the rider"}
          {ride.status === "in_transit" && "Drop off in progress"}
          {isCompleted && "Trip complete"}
        </h1>

        {/* Rider card */}
        <div className="bg-[#18181B] border-2 border-[#27272A] p-4 mb-4">
          <span className="label-eyebrow text-[#A1A1AA]">Rider</span>
          <div className="flex items-center justify-between mt-2">
            <div>
              <div className="font-display font-bold text-xl tracking-tight" data-testid="ride-rider-name">{ride.rider_name}</div>
              <div className="text-sm text-[#A1A1AA] uppercase tracking-wide">{ride.vehicle_class}</div>
            </div>
            <a href={`tel:${ride.rider_phone}`} className="p-3 bg-[#DFFF00] text-black" data-testid="call-rider-btn">
              <Phone className="w-5 h-5" strokeWidth={2.5} />
            </a>
          </div>
        </div>

        {/* Trip */}
        <div className="bg-[#18181B] border-2 border-[#27272A] p-4 mb-4">
          <div className="flex gap-3 mb-3">
            <span className="w-3 h-3 rounded-full bg-[#DFFF00] mt-1" />
            <div className="text-sm flex-1">
              <div className="label-eyebrow text-[#A1A1AA]">Pickup</div>
              <div className="font-medium">{ride.pickup_address}</div>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="w-3 h-3 rounded-full bg-[#FF2B2B] mt-1" />
            <div className="text-sm flex-1">
              <div className="label-eyebrow text-[#A1A1AA]">Drop</div>
              <div className="font-medium">{ride.drop_address}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#27272A]">
            <div>
              <div className="label-eyebrow text-[#A1A1AA]">Distance</div>
              <div className="font-display font-bold">{ride.distance_km} km</div>
            </div>
            <div>
              <div className="label-eyebrow text-[#A1A1AA]">Time</div>
              <div className="font-display font-bold">~{ride.duration_min} min</div>
            </div>
            <div>
              <div className="label-eyebrow text-[#A1A1AA]">Earn</div>
              <div className="font-display font-bold text-[#DFFF00]" data-testid="ride-earnings">£{ride.fare.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {action && (
          <button
            onClick={advance}
            disabled={acting}
            data-testid="advance-status-btn"
            className="w-full py-6 bg-[#DFFF00] text-black font-display font-black text-2xl tracking-tighter inline-flex items-center justify-center gap-2 transition-all hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_#DFFF00] disabled:opacity-50"
          >
            {acting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Navigation2 className="w-6 h-6" strokeWidth={3} />}
            {action.label}
          </button>
        )}

        {isCompleted && (
          <div className="text-center" data-testid="trip-complete-section">
            <CheckCircle2 className="w-14 h-14 mx-auto mb-3 text-[#00E676]" strokeWidth={2.5} />
            <p className="text-[#A1A1AA] mb-5">+£{ride.fare.toFixed(2)} added to earnings</p>
            <button
              onClick={() => navigate("/driver")}
              data-testid="back-to-driver-btn"
              className="w-full py-5 bg-[#DFFF00] text-black font-display font-black text-xl tracking-tighter"
            >
              Back to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
