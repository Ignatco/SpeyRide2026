# Vector Taxi App — PRD

## Original problem statement
> Create a fully functional production-ready taxi app.

## User choices
- Roles: Riders + Drivers (separate dashboards)
- Maps: Leaflet + OpenStreetMap (CartoDB Positron tiles for rider, Dark Matter for driver)
- Payments: Stripe (test key) + Cash
- Auth: OTP via phone using Twilio (with dev-OTP fallback when Verify Service SID missing)

## Architecture
- Backend: FastAPI on port 8001, prefix `/api`, MongoDB (collections: `users`, `rides`, `payment_transactions`)
- Frontend: React 19 + react-router-dom v7, Tailwind, Leaflet, Sonner toasts
- Auth: JWT (HS256), 14-day expiry, stored in `localStorage` as `taxi_token`
- Geocoding: Nominatim (OpenStreetMap) for address autocomplete

## User personas
- **Rider**: needs quick booking, transparent fares, ride tracking, multiple payment options.
- **Driver**: needs to control online/offline state, see ride requests with earnings, follow trip stages, view earnings.

## Implemented features (Feb 2026 — v1)
- OTP authentication (Twilio Verify + dev fallback)
- Profile completion (rider or driver) with vehicle details
- Rider home with Leaflet map, address autocomplete (Nominatim), live fare estimates for Mini/Sedan/SUV, payment method selection (Cash / Stripe)
- Ride lifecycle: searching → accepted → arrived → in_transit → completed (+ cancelled)
- Driver home with online toggle, request feed (filtered by vehicle class), accept flow
- Driver active ride page with trip stage advance buttons
- Driver earnings dashboard (today + total + recent trips)
- Rider ride status page with driver info, fare, cancel, payment, rating
- Stripe Checkout integration with payment_transactions collection + status polling
- 5-star rating with optional review (updates driver avg rating)
- Rider history page

## Tested
- 9/9 backend tests passing (auth, profile, ride lifecycle, accept, earnings, rate, Stripe checkout creation)
- Stripe `/payments/status` 500 fixed with try/except graceful fallback to "pending"

## Backlog (P1 / P2)
- **P1** Live driver location updates on rider's map during ride
- **P1** Push/realtime notifications for ride status (currently polled every 4-5s)
- **P1** Idempotent rating + state-transition validation
- **P1** Twilio Verify Service SID + Account SID configuration UI
- **P2** Surge pricing and time-of-day modifiers
- **P2** Multi-stop rides
- **P2** Driver document onboarding (license/insurance)
- **P2** Admin panel for support/disputes
- **P2** WebSockets for live position
- **P2** Tipping flow

## Next tasks
- Configure full Twilio credentials (Account SID + Verify Service SID)
- Add driver location streaming + show driver pin moving on rider's map
- Switch from polling to SSE/WebSocket for ride status
