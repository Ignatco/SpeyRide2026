import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Auto-redirect logged-in users straight to their dashboard
  useEffect(() => {
    if (loading) return;
    if (user?.role && user?.first_name) {
      navigate(user.role === "driver" ? "/driver" : "/rider", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-black text-white overflow-hidden relative">

      {/* Full-bleed background map image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1590727251300-2369ab8142f1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwyfHxjaXR5JTIwdGF4aSUyMHN0cmVldHxlbnwwfHx8fDE3NzgwMDY1Njl8MA&ixlib=rb-4.1.0&q=85)`,
        }}
      />

      {/* Gradient overlay — darkens bottom so text pops */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/95" />

      {/* Top bar */}
      <div className="relative z-10 px-6 pt-12 flex items-center justify-between">
        <div className="flex items-center gap-2" data-testid="brand-logo">
          {/* Uber-style wordmark */}
          <span className="text-white font-black text-2xl tracking-tighter">Spey Ride</span>
        </div>
        <button
          onClick={() => navigate("/login")}
          data-testid="header-signin-link"
          className="text-sm font-semibold text-white/80 hover:text-white underline underline-offset-4 transition-colors"
        >
          Sign in
        </button>
      </div>

      {/* Main content — pinned to bottom like Uber */}
      <div className="relative z-10 mt-auto px-6 pb-12">

        {/* Location badge */}
        <div className="flex items-center gap-2 mb-5">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-xs font-semibold text-white/60 tracking-widest uppercase">
            Aviemore · Cairngorms · Highlands
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-[2.8rem] font-black leading-[1.0] tracking-tight text-white mb-3">
          Go anywhere,<br />
          <span className="text-white/70">anytime.</span>
        </h1>

        <p className="text-base text-white/55 mb-8 leading-relaxed max-w-xs">
          Tap to ride across the Highlands. Local drivers, transparent fares, no surprises.
        </p>

        {/* Single primary CTA — Uber style */}
        <button
          onClick={() => navigate("/login?role=rider")}
          data-testid="cta-book-ride"
          className="w-full py-4 bg-white text-black font-bold text-lg rounded-none tracking-tight
                     active:scale-[0.98] transition-transform"
        >
          Get started
        </button>

        {/* Subtle driver link — not a prominent button */}
        <p className="mt-5 text-center text-sm text-white/40">
          Want to earn money driving?{" "}
          <button
            onClick={() => navigate("/login?role=driver")}
            data-testid="cta-drive"
            className="text-white/70 underline underline-offset-2 hover:text-white transition-colors"
          >
            Sign up to drive
          </button>
        </p>

      </div>
    </div>
  );
}
