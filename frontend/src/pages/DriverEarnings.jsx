import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, TrendingUp } from "lucide-react";

export default function DriverEarnings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rides, setRides] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/rides/my");
        setRides(data.rides.filter((r) => r.status === "completed"));
      } catch {}
    })();
  }, []);

  const today = rides.filter((r) => {
    const d = new Date(r.completed_at || r.created_at);
    return d.toDateString() === new Date().toDateString();
  });
  const todayEarn = today.reduce((s, r) => s + r.fare, 0);
  const total = rides.reduce((s, r) => s + r.fare, 0);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white px-5 py-6 max-w-md mx-auto">
      <button
        onClick={() => navigate("/driver")}
        data-testid="earnings-back-btn"
        className="inline-flex items-center gap-2 label-eyebrow text-[#A1A1AA] hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2.5} /> Back
      </button>

      <span className="label-eyebrow text-[#DFFF00]">Earnings</span>
      <h1 className="font-display font-black tracking-tighter text-4xl sm:text-5xl mt-2 mb-8 leading-none">
        Your money.
      </h1>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="border-2 border-[#27272A] bg-[#18181B] p-4">
          <div className="label-eyebrow text-[#A1A1AA]">Today</div>
          <div className="font-display font-black text-3xl tracking-tighter text-[#DFFF00] mt-1" data-testid="earnings-today">
            £{todayEarn.toFixed(2)}
          </div>
          <div className="text-xs text-[#A1A1AA] mt-1">{today.length} trips</div>
        </div>
        <div className="border-2 border-[#27272A] bg-[#18181B] p-4">
          <div className="label-eyebrow text-[#A1A1AA]">All time</div>
          <div className="font-display font-black text-3xl tracking-tighter text-[#DFFF00] mt-1" data-testid="earnings-total">
            £{total.toFixed(2)}
          </div>
          <div className="text-xs text-[#A1A1AA] mt-1">{rides.length} trips</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-[#DFFF00]" strokeWidth={2.5} />
        <span className="label-eyebrow text-[#DFFF00]">Recent trips</span>
      </div>

      {rides.length === 0 ? (
        <div className="border-2 border-dashed border-[#27272A] p-8 text-center text-[#A1A1AA]" data-testid="earnings-empty">
          No completed trips yet.
        </div>
      ) : (
        <div className="space-y-2" data-testid="earnings-list">
          {rides.map((r) => (
            <div key={r.id} className="bg-[#18181B] border-2 border-[#27272A] p-3 flex justify-between items-center">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-[#A1A1AA]">
                  {new Date(r.completed_at || r.created_at).toLocaleString()}
                </div>
                <div className="text-sm font-medium truncate">{r.drop_address}</div>
              </div>
              <div className="font-display font-black text-xl tracking-tighter text-[#DFFF00]">
                £{r.fare.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
