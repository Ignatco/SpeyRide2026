import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft, User, Phone, Mail, Car, Star, MapPin,
  ChevronRight, LogOut, Loader2, Check, Shield,
  Bell, CreditCard, HelpCircle, FileText, Trash2,
  Plus, Smartphone,
} from "lucide-react";
import { toast } from "sonner";

function SettingRow({ icon: Icon, label, value, onClick, danger = false, testId, right }) {
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
      {right || (!danger && <ChevronRight className="w-4 h-4 text-[#D4D4D8] group-hover:text-[#52525B] transition-colors flex-shrink-0" />)}
    </button>
  );
}

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
        className={`w-full px-4 py-3.5 text-sm font-medium border focus:outline-none transition-colors
                    ${readOnly
                      ? "bg-[#F4F4F5] text-[#52525B] border-[#E4E4E7] cursor-not-allowed"
                      : "bg-white text-black border-[#E4E4E7] focus:border-black"}`}
      />
    </div>
  );
}

// Brand logos for card networks
const BRAND_ICONS = {
  visa:       "💳",
  mastercard: "💳",
  amex:       "💳",
  apple_pay:  "🍎",
  google_pay: "G",
};

function CardRow({ method, isDefault, onDelete, onSetDefault }) {
  const walletLabel = method.wallet === "apple_pay"
    ? "Apple Pay" : method.wallet === "google_pay"
    ? "Google Pay" : null;

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-[#F4F4F5]">
      <div className="w-10 h-10 rounded-full bg-[#F4F4F5] flex items-center justify-center flex-shrink-0 text-lg">
        {walletLabel === "Apple Pay" ? "🍎" : walletLabel === "Google Pay" ? "G" : "💳"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold capitalize">
          {walletLabel || method.brand} •••• {method.last4}
        </div>
        <div className="text-xs text-[#52525B]">
          {walletLabel ? walletLabel : `Expires ${method.exp_month}/${method.exp_year}`}
          {isDefault && <span className="ml-2 text-[#002FA7] font-bold">Default</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isDefault && (
          <button
            onClick={onSetDefault}
            className="text-xs text-[#52525B] hover:text-black underline underline-offset-2"
          >
            Set default
          </button>
        )}
        <button
          onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center text-[#D4D4D8] hover:text-[#FF2B2B] transition-colors"
        >
          <Trash2 className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

export default function AccountSettings() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();

  const [view, setView] = useState("main");
  const [saving, setSaving] = useState(false);

  // profile fields
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName,  setLastName]  = useState(user?.last_name  || "");
  const [email,     setEmail]     = useState(user?.email      || "");

  // vehicle fields
  const [vMake,  setVMake]  = useState(user?.vehicle_make  || "");
  const [vModel, setVModel] = useState(user?.vehicle_model || "");
  const [vPlate, setVPlate] = useState(user?.vehicle_plate || "");
  const [vClass, setVClass] = useState(user?.vehicle_class || "sedan");

  // payment methods
  const [methods, setMethods]   = useState([]);
  const [defaultPm, setDefaultPm] = useState(user?.default_payment_method_id || null);
  const [pmLoading, setPmLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name   || "");
      setEmail(user.email          || "");
      setVMake(user.vehicle_make   || "");
      setVModel(user.vehicle_model || "");
      setVPlate(user.vehicle_plate || "");
      setVClass(user.vehicle_class || "sedan");
      setDefaultPm(user.default_payment_method_id || null);
    }
  }, [user]);

  const loadMethods = useCallback(async () => {
    setPmLoading(true);
    try {
      const { data } = await api.get("/payments/methods");
      setMethods(data.methods || []);
      setDefaultPm(data.default_payment_method_id || null);
    } catch {
      // silent — Stripe may not be configured
    } finally {
      setPmLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "payments") loadMethods();
  }, [view, loadMethods]);

  const saveProfile = async () => {
    if (!firstName.trim()) return toast.error("First name required");
    setSaving(true);
    try {
      const { data } = await api.patch("/auth/profile", {
        first_name: firstName.trim(),
        last_name:  lastName.trim()  || null,
        email:      email.trim()     || null,
      });
      setUser(data.user);
      toast.success("Profile updated");
      setView("main");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveVehicle = async () => {
    if (!vMake.trim() || !vModel.trim() || !vPlate.trim())
      return toast.error("All vehicle fields required");
    setSaving(true);
    try {
      const { data } = await api.post("/auth/complete-profile", {
        first_name: user.first_name || "Driver",
        last_name:  user.last_name  || "",
        role: "driver",
        vehicle_make:  vMake.trim(),
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

  const deleteMethod = async (pmId) => {
    try {
      await api.delete(`/payments/methods/${pmId}`);
      setMethods((prev) => prev.filter((m) => m.id !== pmId));
      if (defaultPm === pmId) setDefaultPm(null);
      toast.success("Card removed");
    } catch {
      toast.error("Could not remove card");
    }
  };

  const setDefault = async (pmId) => {
    try {
      await api.post(`/payments/methods/${pmId}/default`);
      setDefaultPm(pmId);
      toast.success("Default payment updated");
    } catch {
      toast.error("Could not update default");
    }
  };

  const handleLogout = () => { logout(); navigate("/"); };
  const backRoute = user?.role === "driver" ? "/driver" : "/rider";

  // ── Edit profile ──────────────────────────────────────────────────────────
  if (view === "edit-profile") {
    return (
      <div className="min-h-screen bg-white">
        <div className="px-5 pt-12 pb-5 flex items-center gap-4 border-b border-[#F4F4F5]">
          <button onClick={() => setView("main")} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <h2 className="text-lg font-black tracking-tight">Edit profile</h2>
        </div>
        <div className="px-5 pt-6 max-w-md">
          <EditField label="First name" value={firstName} onChange={setFirstName} placeholder="Alex" />
          <EditField label="Last name (optional)"  value={lastName}  onChange={setLastName}  placeholder="Morgan" />
          <EditField label="Email (optional)"      value={email}     onChange={setEmail}     placeholder="alex@example.com" type="email" />
          <button
            onClick={saveProfile} disabled={saving}
            data-testid="save-name-btn"
            className="w-full mt-2 py-4 bg-black text-white font-bold text-sm
                       flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    );
  }

  // ── Edit vehicle ──────────────────────────────────────────────────────────
  if (view === "edit-vehicle") {
    return (
      <div className="min-h-screen bg-white">
        <div className="px-5 pt-12 pb-5 flex items-center gap-4 border-b border-[#F4F4F5]">
          <button onClick={() => setView("main")} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <h2 className="text-lg font-black tracking-tight">Edit vehicle</h2>
        </div>
        <div className="px-5 pt-6 max-w-md">
          <EditField label="Make"  value={vMake}  onChange={setVMake}  placeholder="Toyota" />
          <EditField label="Model" value={vModel} onChange={setVModel} placeholder="Camry" />
          <EditField label="Plate" value={vPlate} onChange={(v) => setVPlate(v.toUpperCase())} placeholder="AB12 CDE" />
          <div className="mb-4">
            <label className="block text-xs font-bold text-[#52525B] uppercase tracking-widest mb-2">Class</label>
            <div className="grid grid-cols-3 gap-2">
              {["mini","sedan","suv"].map((c) => (
                <button key={c} onClick={() => setVClass(c)}
                  className={`py-3 text-sm font-bold uppercase tracking-wide border transition-colors
                    ${vClass===c ? "bg-black text-white border-black" : "bg-white text-black border-[#E4E4E7] hover:border-black"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={saveVehicle} disabled={saving}
            data-testid="save-vehicle-btn"
            className="w-full mt-2 py-4 bg-black text-white font-bold text-sm
                       flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    );
  }

  // ── Payment methods ───────────────────────────────────────────────────────
  if (view === "payments") {
    return (
      <div className="min-h-screen bg-white">
        <div className="px-5 pt-12 pb-5 flex items-center gap-4 border-b border-[#F4F4F5]">
          <button onClick={() => setView("main")} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <h2 className="text-lg font-black tracking-tight">Payment methods</h2>
        </div>

        <div className="px-5 pt-4">

          {/* Apple Pay / Google Pay info banner */}
          <div className="bg-[#F4F4F5] p-4 mb-6 flex gap-3 items-start">
            <Smartphone className="w-5 h-5 text-[#52525B] mt-0.5 flex-shrink-0" strokeWidth={2} />
            <div>
              <p className="text-sm font-bold text-black">Apple Pay & Google Pay</p>
              <p className="text-xs text-[#52525B] mt-0.5 leading-relaxed">
                When you pay for a ride, you'll be able to choose Apple Pay or Google Pay
                at checkout if your device supports it. No setup needed.
              </p>
            </div>
          </div>

          {/* Saved cards */}
          <p className="text-xs font-bold text-[#52525B] uppercase tracking-widest mb-1">
            Saved cards
          </p>

          {pmLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-[#52525B]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : methods.length === 0 ? (
            <p className="text-sm text-[#52525B] py-4 border-b border-[#F4F4F5]">
              No saved cards yet.
            </p>
          ) : (
            methods.map((m) => (
              <CardRow
                key={m.id}
                method={m}
                isDefault={m.id === defaultPm}
                onDelete={() => deleteMethod(m.id)}
                onSetDefault={() => setDefault(m.id)}
              />
            ))
          )}

          {/* Add card button — opens Stripe Checkout to capture card details */}
          <button
            onClick={async () => {
              try {
                // We use a minimal Stripe Checkout session (£0 setup) to capture card details
                const { data } = await api.post("/payments/setup-intent");
                // Redirect to Stripe's hosted page — simplest integration
                toast("Card setup via Stripe — coming soon in next release");
              } catch {
                toast.error("Could not start card setup. Check Stripe config.");
              }
            }}
            data-testid="add-card-btn"
            className="mt-4 w-full py-4 border-2 border-dashed border-[#E4E4E7]
                       flex items-center justify-center gap-2 text-sm font-bold text-[#52525B]
                       hover:border-black hover:text-black transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Add card
          </button>

          <p className="text-xs text-[#A1A1AA] mt-4 leading-relaxed">
            Card details are stored securely by Stripe and never touch our servers.
          </p>
        </div>
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-5 pt-12 pb-6 border-b border-[#F4F4F5]">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(backRoute)} data-testid="settings-back-btn" className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <h1 className="text-xl font-black tracking-tight">Account</h1>
        </div>

        {/* Profile hero */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-black">
              {(user?.first_name?.[0] || user?.phone?.[3] || "?").toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black tracking-tight truncate">
              {user?.name || user?.phone || "—"}
            </div>
            <div className="text-sm text-[#52525B] mt-0.5">{user?.phone}</div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-black text-black" />
                <span className="text-xs font-bold">{(user?.rating || 5).toFixed(1)}</span>
              </div>
              <span className="text-[#D4D4D8]">·</span>
              <span className="text-xs text-[#52525B]">{user?.rides_count || 0} trips</span>
              <span className="text-[#D4D4D8]">·</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                ${user?.role === "driver" ? "bg-[#0A0A0A] text-[#DFFF00]" : "bg-[#EEF2FF] text-[#002FA7]"}`}>
                {user?.role || "rider"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5">
        {/* Account */}
        <p className="text-xs font-bold text-[#52525B] uppercase tracking-widest pt-5 pb-1">Account</p>
        <SettingRow icon={User}  label="Name"  value={user?.name || "Not set"} onClick={() => setView("edit-profile")} testId="edit-name-btn" />
        <SettingRow icon={Mail}  label="Email" value={user?.email || "Not set"} onClick={() => setView("edit-profile")} />
        <SettingRow icon={Phone} label="Phone" value={user?.phone} onClick={() => toast("Phone number cannot be changed")} testId="phone-row" />

        {/* Payment */}
        <p className="text-xs font-bold text-[#52525B] uppercase tracking-widest pt-5 pb-1">Payment</p>
        <SettingRow
          icon={CreditCard}
          label="Payment methods"
          value={
            methods.length > 0
              ? `${methods.length} card${methods.length > 1 ? "s" : ""} saved`
              : "Apple Pay, Google Pay, card"
          }
          onClick={() => setView("payments")}
          testId="payment-methods-btn"
        />

        {/* Vehicle (drivers only) */}
        {user?.role === "driver" && (
          <>
            <p className="text-xs font-bold text-[#52525B] uppercase tracking-widest pt-5 pb-1">Vehicle</p>
            <SettingRow
              icon={Car}
              label="Your vehicle"
              value={`${user.vehicle_make || ""} ${user.vehicle_model || ""} · ${(user.vehicle_plate || "").toUpperCase()}`}
              onClick={() => setView("edit-vehicle")}
              testId="edit-vehicle-btn"
            />
            <p className="text-xs font-bold text-[#52525B] uppercase tracking-widest pt-5 pb-1">Earnings</p>
            <SettingRow
              icon={CreditCard}
              label="Total earnings"
              value={`£${(user?.earnings_total || 0).toFixed(2)} across ${user?.rides_count || 0} trips`}
              onClick={() => navigate("/driver/earnings")}
              testId="earnings-row"
            />
          </>
        )}

        {/* Activity */}
        {user?.role === "rider" && (
          <>
            <p className="text-xs font-bold text-[#52525B] uppercase tracking-widest pt-5 pb-1">Activity</p>
            <SettingRow icon={MapPin} label="Ride history" value={`${user?.rides_count || 0} trips`} onClick={() => navigate("/rider/history")} testId="history-row" />
          </>
        )}

        {/* App */}
        <p className="text-xs font-bold text-[#52525B] uppercase tracking-widest pt-5 pb-1">App</p>
        <SettingRow icon={Bell}        label="Notifications" value="Ride updates" onClick={() => toast("Coming soon")} />
        <SettingRow icon={Shield}      label="Privacy"       onClick={() => toast("Coming soon")} />
        <SettingRow icon={HelpCircle}  label="Help & support" onClick={() => toast("Coming soon")} />
        <SettingRow icon={FileText}    label="Legal"          onClick={() => toast("Coming soon")} />

        {/* Session */}
        <p className="text-xs font-bold text-[#52525B] uppercase tracking-widest pt-5 pb-1">Session</p>
        <SettingRow icon={LogOut} label="Log out" onClick={handleLogout} danger testId="settings-logout-btn" />

        <div className="pt-8 pb-12 text-center">
          <p className="text-xs text-[#D4D4D8]">Spey Ride · v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
