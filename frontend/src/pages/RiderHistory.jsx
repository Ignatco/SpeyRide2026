import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { ArrowLeft, MapPin } from "lucide-react";

export default function RiderHistory() {
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/rides/my");
        setRides(data.rides);
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-white text-black px-5 py-6 max-w-2xl mx-auto">
      <button
        onClick={() => navigate("/rider")}
        data-testid="history-back-btn"
        className="inline-flex items-center gap-2 label-eyebrow text-[#52525B] hover:text-black mb-6"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2.5} /> Back
      </button>
      <span className="label-eyebrow text-[#002FA7]">Archive</span>
      <h1 className="font-display font-black tracking-tighter text-4xl sm:text-5xl mt-2 mb-8 leading-none">
        Ride history
      </h1>

      {loading ? (
        <div className="text-center text-sm text-[#52525B]">Loading…</div>
      ) : rides.length === 0 ? (
        <div className="border-2 border-dashed border-[#E4E4E7] p-10 text-center text-[#52525B]" data-testid="history-empty">
          <MapPin className="w-10 h-10 mx-auto mb-3" strokeWidth={2} />
          No rides yet.
        </div>
      ) : (
        <div className="space-y-3" data-testid="history-list">
          {rides.map((r) => (
            <div key={r.id} className="border-2 border-black p-4" data-testid={`history-item-${r.id}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="label-eyebrow text-[#52525B]">{new Date(r.created_at).toLocaleDateString()}</span>
                <span
                  className={`label-eyebrow ${
                    r.status === "completed" ? "text-[#00E676]" : r.status === "cancelled" ? "text-[#FF2B2B]" : "text-[#002FA7]"
                  }`}
                >
                  {r.status}
                </span>
              </div>
              <div className="text-sm font-medium truncate">↑ {r.pickup_address}</div>
              <div className="text-sm font-medium truncate">↓ {r.drop_address}</div>
              <div className="flex justify-between mt-3 pt-3 border-t border-[#E4E4E7]">
                <span className="text-sm text-[#52525B]">{r.distance_km} km · {r.vehicle_class}</span>
                <span className="font-display font-black tracking-tighter text-xl">${r.fare.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
