import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Car, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Onboarding() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [role, setRole] = useState(params.get("role") || "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [vMake, setVMake] = useState("");
  const [vModel, setVModel] = useState("");
  const [vPlate, setVPlate] = useState("");
  const [vClass, setVClass] = useState("sedan");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!role) return toast.error("Choose Rider or Driver");
    if (!firstName.trim()) return toast.error("Enter first name");
    if (!lastName.trim()) return toast.error("Enter last name");
    if (role === "driver") {
      if (!vMake.trim()) return toast.error("Enter vehicle make");
      if (!vModel.trim()) return toast.error("Enter vehicle model");
      if (!vPlate.trim()) return toast.error("Enter license plate");
    }
    setLoading(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role,
      };
      if (role === "driver") {
        payload.vehicle_make = vMake.trim();
        payload.vehicle_model = vModel.trim();
        payload.vehicle_plate = vPlate.trim().toUpperCase();
        payload.vehicle_class = vClass;
      }
      const { data } = await api.post("/auth/complete-profile", payload);
      setUser(data.user);
      navigate(role === "driver" ? "/driver" : "/rider");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black px-6 py-10 max-w-md mx-auto">
      <span className="label-eyebrow text-[#002FA7]">Step 02 / Profile</span>
      <h1 className="font-display font-black tracking-tighter text-4xl sm:text-5xl mt-3 mb-8 leading-none">
        Create your account.
      </h1>

      {/* Role selector */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <button
          onClick={() => setRole("rider")}
          data-testid="role-rider-btn"
          className={`p-6 border-2 text-left transition-all ${
            role === "rider"
              ? "border-[#002FA7] bg-[#002FA7] text-white"
              : "border-black bg-white text-black hover:-translate-y-[2px] hover:shadow-[4px_4px_0_0_#0A0A0A]"
          }`}
        >
          <User className="w-7 h-7 mb-3" strokeWidth={2.5} />
          <div className="font-display font-bold text-xl tracking-tight">Rider</div>
          <div className="text-xs mt-1 opacity-80">Book taxis</div>
        </button>
        <button
          onClick={() => setRole("driver")}
          data-testid="role-driver-btn"
          className={`p-6 border-2 text-left transition-all ${
            role === "driver"
              ? "border-black bg-black text-[#DFFF00]"
              : "border-black bg-white text-black hover:-translate-y-[2px] hover:shadow-[4px_4px_0_0_#0A0A0A]"
          }`}
        >
          <Car className="w-7 h-7 mb-3" strokeWidth={2.5} />
          <div className="font-display font-bold text-xl tracking-tight">Driver</div>
          <div className="text-xs mt-1 opacity-80">Earn locally</div>
        </button>
      </div>

      {/* Name fields */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="label-eyebrow text-[#52525B] mb-2 block">First name</label>
          <input
            data-testid="onboarding-firstname-input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Alex"
            className="w-full px-4 py-4 text-lg font-medium border-2 border-black bg-white focus:outline-none focus:border-[#002FA7]"
          />
        </div>
        <div>
          <label className="label-eyebrow text-[#52525B] mb-2 block">Last name</label>
          <input
            data-testid="onboarding-lastname-input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Morgan"
            className="w-full px-4 py-4 text-lg font-medium border-2 border-black bg-white focus:outline-none focus:border-[#002FA7]"
          />
        </div>
      </div>

      {/* Driver vehicle fields */}
      {role === "driver" && (
        <div className="space-y-4 mt-2 border-t-2 border-black pt-6">
          <span className="label-eyebrow text-[#52525B]">Vehicle details</span>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-eyebrow text-[#52525B] mb-2 block">Make</label>
              <input
                data-testid="vehicle-make-input"
                placeholder="Toyota"
                value={vMake}
                onChange={(e) => setVMake(e.target.value)}
                className="w-full px-3 py-3 border-2 border-black bg-white focus:outline-none focus:border-[#002FA7]"
              />
            </div>
            <div>
              <label className="label-eyebrow text-[#52525B] mb-2 block">Model</label>
              <input
                data-testid="vehicle-model-input"
                placeholder="Camry"
                value={vModel}
                onChange={(e) => setVModel(e.target.value)}
                className="w-full px-3 py-3 border-2 border-black bg-white focus:outline-none focus:border-[#002FA7]"
              />
            </div>
          </div>
          <div>
            <label className="label-eyebrow text-[#52525B] mb-2 block">License plate</label>
            <input
              data-testid="vehicle-plate-input"
              placeholder="AB12 CDE"
              value={vPlate}
              onChange={(e) => setVPlate(e.target.value.toUpperCase())}
              className="w-full px-3 py-3 border-2 border-black bg-white focus:outline-none focus:border-[#002FA7] uppercase tracking-widest font-mono"
            />
          </div>
          <div>
            <span className="label-eyebrow text-[#52525B] mb-2 block">Vehicle class</span>
            <div className="grid grid-cols-3 gap-2">
              {["mini", "sedan", "suv"].map((c) => (
                <button
                  key={c}
                  onClick={() => setVClass(c)}
                  data-testid={`vehicle-class-${c}-btn`}
                  className={`py-3 border-2 font-display font-bold text-sm uppercase tracking-wide transition-all ${
                    vClass === c
                      ? "border-[#002FA7] bg-[#002FA7] text-white"
                      : "border-black bg-white hover:border-[#002FA7]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={submit}
        disabled={loading}
        data-testid="onboarding-submit-btn"
        className="mt-8 w-full py-5 bg-[#002FA7] text-white font-display font-bold text-lg tracking-tight inline-flex items-center justify-center gap-2 transition-transform hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_#0A0A0A] disabled:opacity-50"
      >
        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
        Create account
      </button>
    </div>
  );
}
