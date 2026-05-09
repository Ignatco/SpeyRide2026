import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [params] = useSearchParams();
  const intendedRole = params.get("role"); // 'rider' | 'driver' | null
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState(1); // 1: phone, 2: otp
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
        toast.success("OTP sent via SMS");
      }
      setStep(2);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (code.length < 4) return toast.error("Enter the OTP code");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { phone, code });
      login(data.token, data.user);
      if (data.needs_profile) {
        navigate(`/onboarding${intendedRole ? `?role=${intendedRole}` : ""}`);
      } else {
        navigate(data.user.role === "driver" ? "/driver" : "/rider");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <button
        onClick={() => (step === 2 ? setStep(1) : navigate("/"))}
        className="m-6 inline-flex items-center gap-2 label-eyebrow text-[#52525B] hover:text-black w-fit"
        data-testid="login-back-btn"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2.5} /> Back
      </button>

      <div className="flex-1 px-6 flex flex-col justify-center max-w-md mx-auto w-full pb-20">
        <span className="label-eyebrow text-[#002FA7] mb-4">
          {step === 1 ? "Step 01 / Phone" : "Step 02 / Verify"}
        </span>
        <h1 className="font-display font-black tracking-tighter text-4xl sm:text-5xl mb-3 leading-none">
          {step === 1 ? "What's your number?" : "Enter the code."}
        </h1>
        <p className="text-[#52525B] mb-10">
          {step === 1
            ? "We'll send a one-time SMS code to verify your line."
            : `Sent to ${phone}. ${devCode ? `Dev: ${devCode}` : "Check your messages."}`}
        </p>

        {step === 1 ? (
          <>
            <label className="label-eyebrow text-[#52525B] mb-2 block">Phone number</label>
            <input
              data-testid="phone-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+447424011420"
              className="w-full px-5 py-5 text-2xl font-display font-bold tracking-tight border-2 border-black bg-white focus:outline-none focus:border-[#002FA7]"
            />
            <button
              onClick={sendOTP}
              disabled={loading}
              data-testid="send-otp-btn"
              className="mt-6 w-full py-5 bg-[#002FA7] text-white font-display font-bold text-lg tracking-tight inline-flex items-center justify-center gap-2 transition-transform hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_#0A0A0A] disabled:opacity-50"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              Send code
            </button>
          </>
        ) : (
          <>
            <label className="label-eyebrow text-[#52525B] mb-2 block">6-digit code</label>
            <input
              data-testid="otp-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full px-5 py-5 text-3xl font-display font-black tracking-[0.4em] border-2 border-black bg-white focus:outline-none focus:border-[#002FA7] text-center"
            />
            <button
              onClick={verifyOTP}
              disabled={loading}
              data-testid="verify-otp-btn"
              className="mt-6 w-full py-5 bg-[#002FA7] text-white font-display font-bold text-lg tracking-tight inline-flex items-center justify-center gap-2 transition-transform hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_#0A0A0A] disabled:opacity-50"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              Verify & continue
            </button>
            <button
              onClick={sendOTP}
              disabled={loading}
              className="mt-3 text-sm text-[#52525B] hover:text-black underline underline-offset-4"
              data-testid="resend-otp-btn"
            >
              Resend code
            </button>
          </>
        )}
      </div>
    </div>
  );
}
