import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

export default function Onboarding() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Skip: go straight to rider home without saving anything
  const skip = () => navigate("/rider");

  const save = async () => {
    if (!firstName.trim()) return toast.error("Enter your first name");
    setLoading(true);
    try {
      const { data } = await api.patch("/auth/profile", {
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        email: email.trim() || null,
      });
      setUser(data.user);
      navigate("/rider");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Skip button — top right */}
      <div className="px-5 pt-5 flex justify-end">
        <button
          onClick={skip}
          data-testid="onboarding-skip-btn"
          className="flex items-center gap-1 text-sm text-[#52525B] hover:text-black font-medium"
        >
          Skip <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 px-6 flex flex-col justify-center max-w-sm mx-auto w-full pb-16">
        <h1 className="text-3xl font-black tracking-tight mb-1">
          What's your name?
        </h1>
        <p className="text-sm text-[#52525B] mb-8">
          You can always update this later in settings.
        </p>

        {/* First name */}
        <label className="text-xs font-bold text-[#52525B] uppercase tracking-widest mb-2 block">
          First name
        </label>
        <input
          data-testid="onboarding-firstname-input"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Alex"
          className="w-full px-4 py-4 text-lg font-medium border-2 border-black bg-white
                     focus:outline-none mb-4"
        />

        {/* Last name */}
        <label className="text-xs font-bold text-[#52525B] uppercase tracking-widest mb-2 block">
          Last name <span className="text-[#A1A1AA] normal-case font-normal">(optional)</span>
        </label>
        <input
          data-testid="onboarding-lastname-input"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Morgan"
          className="w-full px-4 py-4 text-lg font-medium border-2 border-[#E4E4E7] bg-white
                     focus:outline-none focus:border-black mb-4"
        />

        {/* Email */}
        <label className="text-xs font-bold text-[#52525B] uppercase tracking-widest mb-2 block">
          Email <span className="text-[#A1A1AA] normal-case font-normal">(optional)</span>
        </label>
        <input
          data-testid="onboarding-email-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="alex@example.com"
          className="w-full px-4 py-4 text-lg font-medium border-2 border-[#E4E4E7] bg-white
                     focus:outline-none focus:border-black mb-6"
        />

        <button
          onClick={save}
          disabled={loading}
          data-testid="onboarding-submit-btn"
          className="w-full py-4 bg-black text-white font-bold text-base
                     flex items-center justify-center gap-2 disabled:opacity-50
                     active:scale-[0.98] transition-transform"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Continue
        </button>

        <button
          onClick={skip}
          className="mt-3 text-sm text-[#52525B] hover:text-black underline underline-offset-4 text-center"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
