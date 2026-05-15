import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
import RiderHome from "@/pages/RiderHome";
import RiderRide from "@/pages/RiderRide";
import RiderHistory from "@/pages/RiderHistory";
import DriverHome from "@/pages/DriverHome";
import DriverRide from "@/pages/DriverRide";
import DriverEarnings from "@/pages/DriverEarnings";
import AccountSettings from "@/pages/AccountSettings";
import { Loader2 } from "lucide-react";

function SplashLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Loader2 className="w-7 h-7 animate-spin text-white" />
    </div>
  );
}

// Requires login only — no role or name required (new users can skip onboarding)
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <SplashLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Requires login AND a specific role
function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <SplashLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role && user.role !== role)
    return <Navigate to={user.role === "driver" ? "/driver" : "/rider"} replace />;
  return children;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"           element={<Landing />} />
        <Route path="/login"      element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Rider — any logged-in user can be a rider (default role) */}
        <Route path="/rider"           element={<RequireAuth><RiderHome /></RequireAuth>} />
        <Route path="/rider/ride/:id"  element={<RequireAuth><RiderRide /></RequireAuth>} />
        <Route path="/rider/history"   element={<RequireAuth><RiderHistory /></RequireAuth>} />

        {/* Driver — must have driver role */}
        <Route path="/driver"           element={<RequireRole role="driver"><DriverHome /></RequireRole>} />
        <Route path="/driver/ride/:id"  element={<RequireRole role="driver"><DriverRide /></RequireRole>} />
        <Route path="/driver/earnings"  element={<RequireRole role="driver"><DriverEarnings /></RequireRole>} />
        <Route path="/driver/history"   element={<RequireRole role="driver"><DriverEarnings /></RequireRole>} />

        {/* Account — any logged-in user */}
        <Route path="/account" element={<RequireAuth><AccountSettings /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster position="top-center" richColors closeButton />
    </AuthProvider>
  );
}
