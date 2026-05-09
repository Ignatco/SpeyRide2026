import { Link } from "react-router-dom";
import { ArrowRight, Car } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <header className="px-6 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-2" data-testid="brand-logo">
          <div className="w-8 h-8 bg-[#002FA7] flex items-center justify-center">
            <Car className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display font-black text-xl tracking-tighter">HIGHLAND CABS</span>
        </div>
        <Link
          to="/login"
          className="label-eyebrow underline underline-offset-4 hover:text-[#002FA7]"
          data-testid="header-signin-link"
        >
          Sign in
        </Link>
      </header>

      <main className="flex-1 px-6 flex flex-col justify-center max-w-3xl mx-auto w-full py-16">
        <span className="label-eyebrow text-[#52525B] mb-6 animate-slide-up">Aviemore · Cairngorms · The Highlands</span>
        <h1
          className="font-display font-black tracking-tighter leading-[0.9] text-5xl sm:text-7xl lg:text-8xl mb-8 animate-slide-up"
          style={{ animationDelay: "0.05s" }}
        >
          The Highlands,<br />
          <span className="text-[#002FA7]">on demand.</span>
        </h1>
        <p
          className="text-lg sm:text-xl text-[#52525B] max-w-xl mb-12 leading-relaxed animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          Local taxis from Aviemore to Inverness, Cairngorm Mountain, Loch Morlich and beyond. Tap, ride, pay — no fluff, just transit.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: "0.15s" }}>
          <Link
            to="/login?role=rider"
            data-testid="cta-book-ride"
            className="group inline-flex items-center justify-between gap-3 px-7 py-5 bg-[#002FA7] text-white font-display font-bold text-lg tracking-tight transition-all hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_#0A0A0A]"
          >
            Book a taxi
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
          </Link>
          <Link
            to="/login?role=driver"
            data-testid="cta-drive"
            className="group inline-flex items-center justify-between gap-3 px-7 py-5 bg-black text-[#DFFF00] font-display font-bold text-lg tracking-tight transition-all hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_#DFFF00]"
          >
            Drive & earn
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
          </Link>
        </div>
      </main>

      <footer className="border-t border-[#E4E4E7] px-6 py-6 grid grid-cols-3 gap-6 text-sm">
        <div>
          <div className="label-eyebrow text-[#52525B] mb-2">Coverage</div>
          <div className="font-display font-bold text-2xl tracking-tighter">Aviemore + 30mi</div>
        </div>
        <div>
          <div className="label-eyebrow text-[#52525B] mb-2">Avg pickup</div>
          <div className="font-display font-bold text-2xl tracking-tighter">6 min</div>
        </div>
        <div>
          <div className="label-eyebrow text-[#52525B] mb-2">Driver split</div>
          <div className="font-display font-bold text-2xl tracking-tighter">85%</div>
        </div>
      </footer>
    </div>
  );
}
