import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [params] = useSearchParams();
  const intendedRole = params.get("role");
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("+44");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState(null);
  const [loading, setLoading] = useState(false);

  const sendOTP = async () => {
    if (!phone.startsWith("+") || phone.length < 8) {
      toast.error("Enter phone in E.164 format (e.g. +447424011420)");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/send-otp", { phone });
      if (data.dev_code) {
        setDevCode(data.dev_code);
        toast.success(`Dev OTP: ${data.dev_code}`);
      } else {
        setDevCode(null);
        toast.success("Code sent via SMS");
      }
      setStep(2);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (code.length < 4) return toast.error("Enter the 6-digit code");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { phone, code });
      await login(data.token, data.user);
      if (data.needs_onboarding) {
        // New user — go to optional profile screen
        navigate(`/onboarding${intendedRole ? `?role=${intendedRole}` : ""}`);
      } else {
        navigate(data.user.role === "driver" ? "/driver" : "/rider");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <button
        onClick={() => (step === 2 ? setStep(1) : navigate("/"))}
        className="m-5 inline-flex items-center gap-1 text-sm text-[#52525B] hover:text-black w-fit"
        data-testid="login-back-btn"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
      </button>

      <div className="flex-1 px-6 flex flex-col justify-center max-w-sm mx-auto w-full pb-16">
        <h1 className="text-3xl font-black tracking-tight mb-1">
          {step === 1 ? "What's your number?" : "Enter the code"}
        </h1>
        <p className="text-sm text-[#52525B] mb-8">
          {step === 1
            ? "We'll send a one-time code to verify."
            : devCode
              ? `Sent to ${phone}. Dev code: `
              : `Sent to ${phone}. Check your messages.`}
          {step === 2 && devCode && (
            <span className="font-black text-black">{devCode}</span>
          )}
        </p>

        {step === 1 ? (
          <>
            <label className="text-xs font-bold text-[#52525B] uppercase tracking-widest mb-2 block">
              Phone number
            </label>
            <input
              data-testid="phone-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+447424011420"
              className="w-full px-4 py-4 text-xl font-bold border-2 border-black bg-white
                         focus:outline-none focus:border-black mb-5"
            />
            <button
              onClick={sendOTP}
              disabled={loading}
              data-testid="send-otp-btn"
              className="w-full py-4 bg-black text-white font-bold text-base
                         flex items-center justify-center gap-2 disabled:opacity-50
                         active:scale-[0.98] transition-transform"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Continue
            </button>
          </>
        ) : (
          <>
            <label className="text-xs font-bold text-[#52525B] uppercase tracking-widest mb-2 block">
              6-digit code
            </label>
            <input
              data-testid="otp-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full px-4 py-4 text-3xl font-black tracking-[0.5em] text-center
                         border-2 border-black bg-white focus:outline-none mb-5"
            />
            <button
              onClick={verifyOTP}
              disabled={loading}
              data-testid="verify-otp-btn"
              className="w-full py-4 bg-black text-white font-bold text-base
                         flex items-center justify-center gap-2 disabled:opacity-50
                         active:scale-[0.98] transition-transform"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Verify
            </button>
            <button
              onClick={sendOTP}
              disabled={loading}
              data-testid="resend-otp-btn"
              className="mt-4 text-sm text-[#52525B] hover:text-black underline underline-offset-4 w-full text-center"
            >
              Resend code
            </button>
          </>
        )}
      </div>
    </div>
  );
}
