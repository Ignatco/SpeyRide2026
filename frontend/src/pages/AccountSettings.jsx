import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft, User, Phone, Car, Star, MapPin,
  ChevronRight, LogOut, Loader2, Check, Shield,
  Bell, CreditCard, HelpCircle, FileText,
} from "lucide-react";
import { toast } from "sonner";

// ── small reusable row ────────────────────────────────────────────────────────
function SettingRow({ icon: Icon, label, value, onClick, danger = false, testId }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`w-full flex items-center gap-4 px-0 py-4 border-b border-[#F4F4F5]
                  text-left group transition-colors
                  ${danger ? "hover:bg-red-50" : "hover:bg-[#FAFAFA]"}`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                       ${danger ? "bg-red-50" : "bg-[#F4F4F5]"}`}>
        <Icon className={`w-5 h-5 ${danger ? "text-[#FF2B2B]" : "text-[#52525B]"}`} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${danger ? "text-[#FF2B2B]" : "text-black"}`}>{label}</div>
        {value && <div className="text-xs text-[#52525B] mt-0.5 truncate">{value}</div>}
      </div>
      {!danger && <ChevronRight className="w-4 h-4 text-[#D4D4D8] group-hover:text-[#52525B] transition-colors flex-shrink-0" />}
    </button>
  );
}

// ── editable field ────────────────────────────────────────────────────────────
function EditField({ label, value, onChange, placeholder, type = "text", readOnly = false }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-[#52525B] uppercase tracking-widest mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full px-4 py-3.5 text-sm font-medium border rounded-none
                    focus:outline-none transition-colors
                    ${readOnly
                      ? "bg-[#F4F4F5] text-[#52525B] border-[#E4E4E7] cursor-not-allowed"
                      : "bg-white text-black border-[#E4E4E7] focus:border-black"}`}
      />
    </div>
  );
}

export default function AccountSettings() {
  const navigate = useNavigate();
  const { user, setUser, logout, refresh } = useAuth();

  const [view, setView] = useState("main"); // main | edit-name | edit-vehicle
  const [saving, setSaving] = useState(false);

  // edit-name state
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");

  // edit-vehicle state (drivers only)
  const [vMake, setVMake] = useState(user?.vehicle_make || "");
  const [vModel, setVModel] = useState(user?.vehicle_model || "");
  const [vPlate, setVPlate] = useState(user?.vehicle_plate || "");
  const [vClass, setVClass] = useState(user?.vehicle_class || "sedan");

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setVMake(user.vehicle_make || "");
      setVModel(user.vehicle_model || "");
      setVPlate(user.vehicle_plate || "");
      setVClass(user.vehicle_class || "sedan");
    }
  }, [user]);

  const saveName = async () => {
    if (!firstName.trim()) return toast.error("First name required");
    if (!lastName.trim()) return toast.error("Last name required");
    setSaving(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: user.role,
      };
      // Include vehicle fields for drivers so role-lock backend validation passes
      if (user.role === "driver") {
        payload.vehicle_make = user.vehicle_make;
        payload.vehicle_model = user.vehicle_model;
        payload.vehicle_plate = user.vehicle_plate;
        payload.vehicle_class = user.vehicle_class;
      }
      const { data } = await api.post("/auth/complete-profile", payload);
      setUser(data.user);
      toast.success("Name updated");
      setView("main");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveVehicle = async () => {
    if (!vMake.trim()) return toast.error("Vehicle make required");
    if (!vModel.trim()) return toast.error("Vehicle model required");
    if (!vPlate.trim()) return toast.error("License plate required");
    setSaving(true);
    try {
      const { data } = await api.post("/auth/complete-profile", {
        first_name: user.first_name,
        last_name: user.last_name,
        role: "driver",
        vehicle_make: vMake.trim(),
        vehicle_model: vModel.trim(),
        vehicle_plate: vPlate.trim().toUpperCase(),
        vehicle_class: vClass,
      });
      setUser(data.user);
      toast.success("Vehicle updated");
      setView("main");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const backRoute = user?.role === "driver" ? "/driver" : "/rider";

  // ── sub-view: edit name ───────────────────────────────────────────────────
  if (view === "edit-name") {
    return (
      <div className="min-h-screen bg-white">
        <div className="px-5 pt-12 pb-6 flex items-center gap-4 border-b border-[#F4F4F5]">
          <button onClick={() => setView("main")} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <h2 className="text-lg font-bold tracking-tight">Edit name</h2>
        </div>
        <div className="px-5 pt-6">
          <EditField label="First name" value={firstName} onChange={setFirstName} placeholder="Alex" />
          <EditField label="Last name"  value={lastName}  onChange={setLastName}  placeholder="Morgan" />
          <button
            onClick={saveName}
            disabled={saving}
            data-testid="save-name-btn"
            className="w-full mt-4 py-4 bg-black text-white font-bold text-sm tracking-tight
                       flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save changes
          </button>
        </div>
      </div>
    );
  }

  // ── sub-view: edit vehicle ────────────────────────────────────────────────
  if (view === "edit-vehicle") {
    return (
      <div className="min-h-screen bg-white">
        <div className="px-5 pt-12 pb-6 flex items-center gap-4 border-b border-[#F4F4F5]">
          <button onClick={() => setView("main")} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <h2 className="text-lg font-bold tracking-tight">Edit vehicle</h2>
        </div>
        <div className="px-5 pt-6">
          <EditField label="Make"  value={vMake}  onChange={setVMake}  placeholder="Toyota" />
          <EditField label="Model" value={vModel} onChange={setVModel} placeholder="Camry" />
          <EditField
            label="License plate"
            value={vPlate}
            onChange={(v) => setVPlate(v.toUpperCase())}
            placeholder="AB12 CDE"
          />
          <div className="mb-4">
            <label className="block text-xs font-bold text-[#52525B] uppercase tracking-widest mb-2">
              Vehicle class
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["mini", "sedan", "suv"].map((c) => (
                <button
                  key={c}
                  onClick={() => setVClass(c)}
                  className={`py-3 text-sm font-bold uppercase tracking-wide transition-colors border
                              ${vClass === c ? "bg-black text-white border-black" : "bg-white text-black border-[#E4E4E7] hover:border-black"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={saveVehicle}
            disabled={saving}
            data-testid="save-vehicle-btn"
            className="w-full mt-4 py-4 bg-black text-white font-bold text-sm tracking-tight
                       flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save changes
          </button>
        </div>
      </div>
    );
  }

  // ── main settings view ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="px-5 pt-12 pb-6 border-b border-[#F4F4F5]">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(backRoute)}
            data-testid="settings-back-btn"
            className="p-1 -ml-1"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <h1 className="text-xl font-black tracking-tight">Account</h1>
        </div>

        {/* Profile hero */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-black">
              {(user?.first_name?.[0] || "?").toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black tracking-tight truncate">
              {user?.name || "—"}
            </div>
            <div className="text-sm text-[#52525B] mt-0.5">{user?.phone}</div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-black text-black" />
                <span className="text-xs font-bold">{(user?.rating || 5).toFixed(1)}</span>
              </div>
              <span className="text-[#D4D4D8]">·</span>
              <span className="text-xs text-[#52525B]">{user?.rides_count || 0} trips</span>
              <span className="text-[#D4D4D8]">·</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                               ${user?.role === "driver" ? "bg-[#0A0A0A] text-[#DFFF00]" : "bg-[#EEF2FF] text-[#002FA7]"}`}>
                {user?.role || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings sections */}
      <div className="px-5">

        {/* Account section */}
        <div className="pt-5 pb-1">
          <p className="text-xs font-bold text-[#52525B] uppercase tracking-widest mb-1">Account</p>
        </div>
        <SettingRow
          icon={User}
          label="Edit name"
          value={`${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Not set"}
          onClick={() => setView("edit-name")}
          testId="edit-name-btn"
        />
        <SettingRow
          icon={Phone}
          label="Phone number"
          value={user?.phone}
          onClick={() => toast("Phone number cannot be changed")}
          testId="phone-row"
        />

        {/* Driver vehicle section */}
        {user?.role === "driver" && (
          <>
            <div className="pt-5 pb-1">
              <p className="text-xs font-bold text-[#52525B] uppercase tracking-widest mb-1">Vehicle</p>
            </div>
            <SettingRow
              icon={Car}
              label="Your vehicle"
              value={`${user.vehicle_make || ""} ${user.vehicle_model || ""} · ${(user.vehicle_plate || "").toUpperCase()}`}
              onClick={() => setView("edit-vehicle")}
              testId="edit-vehicle-btn"
            />
          </>
        )}

        {/* Stats section — read-only */}
        {user?.role === "driver" && (
          <>
            <div className="pt-5 pb-1">
              <p className="text-xs font-bold text-[#52525B] uppercase tracking-widest mb-1">Earnings</p>
            </div>
            <SettingRow
              icon={CreditCard}
              label="Total earnings"
              value={`£${(user?.earnings_total || 0).toFixed(2)} across ${user?.rides_count || 0} trips`}
              onClick={() => navigate("/driver/earnings")}
              testId="earnings-row"
            />
          </>
        )}

        {/* Ride history for riders */}
        {user?.role === "rider" && (
          <>
            <div className="pt-5 pb-1">
              <p className="text-xs font-bold text-[#52525B] uppercase tracking-widest mb-1">Activity</p>
            </div>
            <SettingRow
              icon={MapPin}
              label="Ride history"
              value={`${user?.rides_count || 0} trips`}
              onClick={() => navigate("/rider/history")}
              testId="history-row"
            />
          </>
        )}

        {/* App section */}
        <div className="pt-5 pb-1">
          <p className="text-xs font-bold text-[#52525B] uppercase tracking-widest mb-1">App</p>
        </div>
        <SettingRow
          icon={Bell}
          label="Notifications"
          value="Ride updates, promotions"
          onClick={() => toast("Notification settings coming soon")}
        />
        <SettingRow
          icon={Shield}
          label="Privacy"
          onClick={() => toast("Privacy settings coming soon")}
        />
        <SettingRow
          icon={HelpCircle}
          label="Help & support"
          onClick={() => toast("Support coming soon")}
        />
        <SettingRow
          icon={FileText}
          label="Legal"
          onClick={() => toast("Legal documents coming soon")}
        />

        {/* Logout */}
        <div className="pt-5 pb-1">
          <p className="text-xs font-bold text-[#52525B] uppercase tracking-widest mb-1">Session</p>
        </div>
        <SettingRow
          icon={LogOut}
          label="Log out"
          onClick={handleLogout}
          danger
          testId="settings-logout-btn"
        />

        {/* App version footer */}
        <div className="pt-8 pb-12 text-center">
          <p className="text-xs text-[#D4D4D8]">Spey Ride · v1.0.0</p>
        </div>

      </div>
    </div>
  );
}
