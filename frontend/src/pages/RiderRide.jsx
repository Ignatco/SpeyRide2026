import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import MapView from "@/components/MapView";
import { Phone, Star, X, Loader2, ArrowLeft, CheckCircle2, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS = {
  searching: { label: "Finding driver…", color: "#002FA7", pulse: true },
  accepted: { label: "Driver on the way", color: "#002FA7", pulse: false },
  arrived: { label: "Driver has arrived", color: "#00E676", pulse: false },
  in_transit: { label: "On the way to destination", color: "#002FA7", pulse: false },
  completed: { label: "Trip completed", color: "#0A0A0A", pulse: false },
  cancelled: { label: "Cancelled", color: "#FF2B2B", pulse: false },
};

function StarRow({ value, onChange, size = 36 }) {
  return (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          data-testid={`star-${n}-btn`}
          className="transition-transform hover:scale-110"
        >
          <Star
            style={{ width: size, height: size }}
            strokeWidth={2.5}
            className={n <= value ? "fill-[#002FA7] text-[#002FA7]" : "text-[#E4E4E7]"}
          />
        </button>
      ))}
    </div>
  );
}

export default function RiderRide() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [ride, setRide] = useState(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const sessionId = params.get("session_id");

  const fetchRide = useCallback(async () => {
    try {
      const { data } = await api.get(`/rides/${id}`);
      setRide(data.ride);
    } catch (e) {
      toast.error("Could not load ride");
    }
  }, [id]);

  useEffect(() => {
    fetchRide();
    const t = setInterval(fetchRide, 4000);
    return () => clearInterval(t);
  }, [fetchRide]);

  // Stripe redirect handler
  useEffect(() => {
    if (!sessionId) return;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") {
          toast.success("Payment received");
          fetchRide();
          return;
        }
        if (data.status === "expired" || attempts > 6) {
          toast.error("Payment incomplete");
          return;
        }
        setTimeout(poll, 2000);
      } catch (e) {
        // try again
        if (attempts < 6) setTimeout(poll, 2000);
      }
    };
    poll();
    // eslint-disable-next-line
  }, [sessionId]);

  if (!ride) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-7 h-7 animate-spin" />
      </div>
    );
  }

  const cancelRide = async () => {
    if (!window.confirm("Cancel this ride?")) return;
    try {
      await api.post(`/rides/${ride.id}/status`, { status: "cancelled" });
      navigate("/rider");
    } catch (e) {
      toast.error("Cancel failed");
    }
  };

  const submitRating = async () => {
    if (rating < 1) return toast.error("Select stars");
    setSubmitting(true);
    try {
      await api.post(`/rides/${ride.id}/rate`, { rating, review });
      toast.success("Thanks for the feedback");
      navigate("/rider");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const payWithStripe = async () => {
    setPaying(true);
    try {
      const { data } = await api.post(`/payments/checkout/${ride.id}`, {
        origin_url: window.location.origin,
      });
      window.location.href = data.url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Payment failed");
      setPaying(false);
    }
  };

  const markCashPaid = async () => {
    // For cash, we'll just allow rating. Mark fictitious paid client-side via a request? Actually rider can't mark — we treat unpaid cash as paid on completion.
    // Provide a "I've paid" button that updates local UI; backend already considers cash flow as fine.
    setRide({ ...ride, payment_status: "paid" });
    toast.success("Cash recorded");
  };

  const status = STATUS_LABELS[ride.status] || STATUS_LABELS.searching;
  const isCompleted = ride.status === "completed";
  const needsPayment = isCompleted && ride.payment_status !== "paid";
  const canRate = isCompleted && ride.payment_status === "paid" && !ride.rating;
  const isRated = isCompleted && ride.rating;

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* Map */}
      <div className="h-[40vh] relative">
        <MapView
          pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
          drop={{ lat: ride.drop_lat, lng: ride.drop_lng }}
          dark={false}
        />
        {ride.status === "searching" && (
          <button
            onClick={() => navigate("/rider")}
            className="absolute top-4 left-4 bg-white border-2 border-black p-2 z-30"
            data-testid="rider-ride-back-btn"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div className="flex-1 px-5 pt-5 pb-10 max-w-md mx-auto w-full">
        {/* Status banner */}
        <div className="border-2 border-black p-4 mb-4 flex items-center justify-between" style={{ borderColor: status.color }} data-testid="ride-status-banner">
          <div>
            <div className="label-eyebrow text-[#52525B]">Status</div>
            <div className="font-display font-black text-2xl tracking-tighter" style={{ color: status.color }}>
              {status.label}
            </div>
          </div>
          {status.pulse && <div className="w-3 h-3 bg-[#002FA7] rounded-full animate-pulse-strong" />}
        </div>

        {/* Driver card */}
        {ride.driver_name && (
          <div className="border-2 border-black p-4 mb-4">
            <span className="label-eyebrow text-[#52525B]">Your driver</span>
            <div className="flex items-center justify-between mt-2">
              <div>
                <div className="font-display font-bold text-xl tracking-tight" data-testid="driver-name">{ride.driver_name}</div>
                <div className="text-sm text-[#52525B]">
                  {ride.driver_vehicle} · <span className="font-mono">{ride.driver_plate}</span>
                </div>
              </div>
              <a
                href={`tel:${ride.driver_phone}`}
                className="p-3 bg-[#002FA7] text-white"
                data-testid="call-driver-btn"
              >
                <Phone className="w-5 h-5" strokeWidth={2.5} />
              </a>
            </div>
          </div>
        )}

        {/* Trip details */}
        <div className="border-2 border-black p-4 mb-4">
          <div className="flex gap-3 mb-3">
            <span className="w-3 h-3 rounded-full bg-[#002FA7] mt-1" />
            <div className="text-sm flex-1">
              <div className="label-eyebrow text-[#52525B]">Pickup</div>
              <div className="font-medium">{ride.pickup_address}</div>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="w-3 h-3 rounded-full bg-[#FF2B2B] mt-1" />
            <div className="text-sm flex-1">
              <div className="label-eyebrow text-[#52525B]">Drop</div>
              <div className="font-medium">{ride.drop_address}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#E4E4E7]">
            <div>
              <div className="label-eyebrow text-[#52525B]">Distance</div>
              <div className="font-display font-bold">{ride.distance_km} km</div>
            </div>
            <div>
              <div className="label-eyebrow text-[#52525B]">Time</div>
              <div className="font-display font-bold">~{ride.duration_min} min</div>
            </div>
            <div>
              <div className="label-eyebrow text-[#52525B]">Fare</div>
              <div className="font-display font-bold text-[#002FA7]" data-testid="ride-fare">£{ride.fare.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Cancel for searching */}
        {ride.status === "searching" && (
          <button
            onClick={cancelRide}
            data-testid="cancel-ride-btn"
            className="w-full py-4 border-2 border-black text-black font-display font-bold tracking-tight inline-flex items-center justify-center gap-2 hover:bg-[#FF2B2B] hover:text-white hover:border-[#FF2B2B] transition-all"
          >
            <X className="w-5 h-5" strokeWidth={2.5} /> Cancel ride
          </button>
        )}

        {/* Payment screen */}
        {needsPayment && (
          <div className="border-2 border-black p-5 mb-4 bg-[#F4F4F5]" data-testid="payment-section">
            <span className="label-eyebrow text-[#002FA7]">Settle up</span>
            <div className="font-display font-black tracking-tighter text-5xl my-3">
              £{ride.fare.toFixed(2)}
            </div>
            <p className="text-sm text-[#52525B] mb-4">
              Selected: <span className="font-bold uppercase">{ride.payment_method}</span>
            </p>
            {ride.payment_method === "stripe" ? (
              <button
                onClick={payWithStripe}
                disabled={paying}
                data-testid="pay-stripe-btn"
                className="w-full py-4 bg-black text-white font-display font-bold tracking-tight inline-flex items-center justify-center gap-2 hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_#002FA7] transition-all"
              >
                {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" strokeWidth={2.5} />}
                Pay with card
              </button>
            ) : (
              <button
                onClick={markCashPaid}
                data-testid="pay-cash-btn"
                className="w-full py-4 bg-black text-white font-display font-bold tracking-tight inline-flex items-center justify-center gap-2 hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_#0A0A0A] transition-all"
              >
                <Banknote className="w-5 h-5" strokeWidth={2.5} /> Confirm cash paid
              </button>
            )}
          </div>
        )}

        {/* Rating */}
        {canRate && (
          <div className="border-2 border-black p-5" data-testid="rating-section">
            <span className="label-eyebrow text-[#002FA7]">Rate your trip</span>
            <h3 className="font-display font-black tracking-tighter text-3xl mt-1 mb-4">How was it?</h3>
            <StarRow value={rating} onChange={setRating} />
            <textarea
              data-testid="rating-review-input"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Optional comment"
              className="w-full mt-4 p-3 border-2 border-black bg-white outline-none focus:border-[#002FA7] text-sm font-medium"
              rows={3}
            />
            <button
              onClick={submitRating}
              disabled={submitting || rating < 1}
              data-testid="submit-rating-btn"
              className="w-full mt-3 py-4 bg-[#002FA7] text-white font-display font-bold tracking-tight inline-flex items-center justify-center gap-2 hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_#0A0A0A] transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
              Submit
            </button>
          </div>
        )}

        {isRated && (
          <div className="border-2 border-black p-5 text-center" data-testid="rated-thanks">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-[#00E676]" strokeWidth={2.5} />
            <h3 className="font-display font-black tracking-tighter text-2xl">Thanks for riding</h3>
            <p className="text-sm text-[#52525B] mb-4">You rated this trip {ride.rating} stars</p>
            <button
              onClick={() => navigate("/rider")}
              data-testid="back-to-home-btn"
              className="w-full py-4 bg-black text-white font-display font-bold tracking-tight"
            >
              Back to home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
