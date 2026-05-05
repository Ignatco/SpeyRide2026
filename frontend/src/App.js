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
import { Loader2 } from "lucide-react";

function Protected({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <SplashLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.role || !user.name) return <Navigate to="/onboarding" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "driver" ? "/driver" : "/rider"} replace />;
  }
  return children;
}

function SplashLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-7 h-7 animate-spin text-[#002FA7]" />
    </div>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/rider" element={<Protected role="rider"><RiderHome /></Protected>} />
        <Route path="/rider/ride/:id" element={<Protected role="rider"><RiderRide /></Protected>} />
        <Route path="/rider/history" element={<Protected role="rider"><RiderHistory /></Protected>} />
        <Route path="/driver" element={<Protected role="driver"><DriverHome /></Protected>} />
        <Route path="/driver/ride/:id" element={<Protected role="driver"><DriverRide /></Protected>} />
        <Route path="/driver/earnings" element={<Protected role="driver"><DriverEarnings /></Protected>} />
        <Route path="/driver/history" element={<Protected role="driver"><DriverEarnings /></Protected>} />
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
