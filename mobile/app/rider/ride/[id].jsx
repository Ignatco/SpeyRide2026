import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Alert,
  ScrollView, ActivityIndicator, TextInput, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Map from '../../../components/Map';
import Button from '../../../components/Button';
import { api } from '../../../lib/api';
import { colors } from '../../../lib/theme';

const STATUS = {
  searching:  { label: 'Finding driver…',           color: colors.riderCta, pulse: true  },
  accepted:   { label: 'Driver on the way',          color: colors.riderCta, pulse: false },
  arrived:    { label: 'Driver has arrived',         color: colors.success,  pulse: false },
  in_transit: { label: 'On the way',                 color: colors.riderCta, pulse: false },
  completed:  { label: 'Trip completed',             color: colors.black,    pulse: false },
  cancelled:  { label: 'Cancelled',                  color: colors.danger,   pulse: false },
};

const CANCELLABLE = ['searching', 'accepted'];

export default function RiderRide() {
  const { id } = useLocalSearchParams();
  const router  = useRouter();
  const [ride,       setRide]       = useState(null);
  const [driverPos,  setDriverPos]  = useState(null);
  const [tripRoute,  setTripRoute]  = useState(null);
  const [rating,     setRating]     = useState(0);
  const [review,     setReview]     = useState('');
  const [paying,     setPaying]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchRide = useCallback(async () => {
    try { const { data } = await api.get(`/rides/${id}`); setRide(data.ride); } catch {}
  }, [id]);

  const fetchDriver = useCallback(async () => {
    try { const { data } = await api.get(`/rides/${id}/driver-location`); setDriverPos(data.location); } catch {}
  }, [id]);

  const fetchRoute = useCallback(async () => {
    try {
      const { data } = await api.get(`/rides/${id}/route?kind=trip`);
      if (data?.coordinates?.length) setTripRoute(data.coordinates);
    } catch {}
  }, [id]);

  useEffect(() => { fetchRide(); const t = setInterval(fetchRide, 4000); return () => clearInterval(t); }, [fetchRide]);
  useEffect(() => { if (ride?.id) fetchRoute(); }, [ride?.id, fetchRoute]);
  useEffect(() => {
    if (!ride?.driver_id || ['completed','cancelled','searching'].includes(ride.status)) { setDriverPos(null); return; }
    const t = setInterval(fetchDriver, 4000); fetchDriver(); return () => clearInterval(t);
  }, [ride?.driver_id, ride?.status, fetchDriver]);

  if (!ride) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }}>
      <ActivityIndicator color={colors.riderCta} size="large" />
    </View>
  );

  const cancel = () => {
    Alert.alert('Cancel ride?', 'This cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel ride', style: 'destructive', onPress: async () => {
        try { await api.post(`/rides/${ride.id}/status`, { status: 'cancelled' }); router.replace('/rider'); }
        catch (e) { Alert.alert('Error', e?.response?.data?.detail || 'Could not cancel'); }
      }},
    ]);
  };

  const submitRating = async () => {
    if (rating < 1) return Alert.alert('Rate your trip', 'Tap a star to rate');
    setSubmitting(true);
    try {
      await api.post(`/rides/${ride.id}/rate`, { rating, review });
      router.replace('/rider');
    } catch (e) { Alert.alert('Error', e?.response?.data?.detail || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const payStripe = async () => {
    setPaying(true);
    try {
      const base = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
      const { data } = await api.post(`/payments/checkout/${ride.id}`, { origin_url: base });
      await WebBrowser.openBrowserAsync(data.url);
      let attempts = 0;
      const poll = async () => {
        attempts++;
        try {
          const { data: s } = await api.get(`/payments/status/${data.session_id}`);
          if (s.payment_status === 'paid') { fetchRide(); return; }
          if (attempts < 6) setTimeout(poll, 2000);
        } catch { if (attempts < 6) setTimeout(poll, 2000); }
      };
      poll();
    } catch (e) { Alert.alert('Payment failed', e?.response?.data?.detail || 'Try again'); }
    finally { setPaying(false); }
  };

  const st      = STATUS[ride.status] || STATUS.searching;
  const done    = ride.status === 'completed';
  const needsPay = done && ride.payment_status !== 'paid';
  const canRate  = done && ride.payment_status === 'paid' && !ride.rating;
  const rated    = done && !!ride.rating;

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={{ height: 300 }}>
        <Map
          pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
          drop={{ lat: ride.drop_lat,    lng: ride.drop_lng    }}
          driverPos={driverPos}
          tripRoute={tripRoute}
          height={300}
        />
        {/* ETA badge */}
        {driverPos?.eta_minutes != null && (
          <SafeAreaView edges={['top']} style={styles.etaWrap} pointerEvents="none">
            <View style={styles.etaBadge}>
              <View style={styles.etaDot} />
              <Text style={styles.etaText}>
                {driverPos.target === 'pickup' ? 'Driver ' : 'Arriving in '}
                <Text style={{ fontWeight: '900' }}>{driverPos.eta_minutes} min</Text>
                {'  '}
                <Text style={{ color: '#A1A1AA' }}>{driverPos.distance_km} km</Text>
              </Text>
            </View>
          </SafeAreaView>
        )}
        {/* Back button */}
        {CANCELLABLE.includes(ride.status) && (
          <SafeAreaView edges={['top']} style={styles.mapBackWrap}>
            <Pressable onPress={() => router.replace('/rider')} style={styles.mapBack}>
              <Ionicons name="chevron-back" size={22} color={colors.black} />
            </Pressable>
          </SafeAreaView>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Status */}
        <View style={[styles.statusCard, { borderColor: st.color }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusEye}>STATUS</Text>
            <Text style={[styles.statusLabel, { color: st.color }]}>{st.label}</Text>
          </View>
          {st.pulse && <ActivityIndicator color={st.color} />}
        </View>

        {/* Driver card */}
        {ride.driver_name && (
          <View style={styles.card}>
            <Text style={styles.cardEye}>YOUR DRIVER</Text>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} testID="driver-name">{ride.driver_name}</Text>
                <Text style={styles.cardSub}>{ride.driver_vehicle} · {ride.driver_plate}</Text>
              </View>
              <Pressable
                onPress={() => Linking.openURL(`tel:${ride.driver_phone}`)}
                style={styles.callBtn}
                testID="call-driver-btn"
              >
                <Ionicons name="call" size={20} color={colors.white} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Trip details */}
        <View style={styles.card}>
          <View style={styles.tripRow}>
            <View style={[styles.dot, { backgroundColor: colors.riderCta }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardEye}>PICKUP</Text>
              <Text style={styles.tripAddr} numberOfLines={2}>{ride.pickup_address}</Text>
            </View>
          </View>
          <View style={styles.tripRow}>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardEye}>DROP</Text>
              <Text style={styles.tripAddr} numberOfLines={2}>{ride.drop_address}</Text>
            </View>
          </View>
          <View style={styles.metricsRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardEye}>DISTANCE</Text>
              <Text style={styles.metricVal}>{ride.distance_km} km</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardEye}>TIME</Text>
              <Text style={styles.metricVal}>~{ride.duration_min} min</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardEye}>FARE</Text>
              <Text style={[styles.metricVal, { color: colors.riderCta }]} testID="ride-fare">
                £{ride.fare.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Cancel */}
        {CANCELLABLE.includes(ride.status) && (
          <Pressable onPress={cancel} style={styles.cancelBtn} testID="cancel-ride-btn">
            <Ionicons name="close" size={18} color={colors.danger} />
            <Text style={styles.cancelText}>
              {ride.status === 'accepted' ? 'Cancel (driver not arrived)' : 'Cancel ride'}
            </Text>
          </Pressable>
        )}

        {/* Payment */}
        {needsPay && (
          <View style={styles.card} testID="payment-section">
            <Text style={styles.cardEye}>SETTLE UP</Text>
            <Text style={styles.fareHero}>£{ride.fare.toFixed(2)}</Text>
            <Text style={styles.cardSub}>Method: {ride.payment_method.replace('_', ' ')}</Text>
            <View style={{ height: 12 }} />
            {ride.payment_method === 'stripe' || ride.payment_method === 'apple_pay' || ride.payment_method === 'google_pay' ? (
              <Button
                title={paying ? 'Opening…' : 'Pay now'}
                onPress={payStripe}
                loading={paying}
                testID="pay-stripe-btn"
              />
            ) : (
              <Button
                title="Confirm cash paid"
                onPress={() => setRide({ ...ride, payment_status: 'paid' })}
                testID="pay-cash-btn"
              />
            )}
          </View>
        )}

        {/* Rating */}
        {canRate && (
          <View style={styles.card} testID="rating-section">
            <Text style={styles.cardEye}>RATE YOUR TRIP</Text>
            <Text style={styles.cardTitle}>How was it?</Text>
            <View style={styles.stars}>
              {[1,2,3,4,5].map(n => (
                <Pressable key={n} onPress={() => setRating(n)} testID={`star-${n}-btn`}>
                  <Ionicons
                    name={n <= rating ? 'star' : 'star-outline'}
                    size={38}
                    color={n <= rating ? colors.riderCta : '#E4E4E7'}
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              value={review}
              onChangeText={setReview}
              placeholder="Optional comment…"
              placeholderTextColor={colors.riderTextMuted}
              multiline
              numberOfLines={3}
              style={styles.reviewInput}
              testID="rating-review-input"
            />
            <View style={{ height: 12 }} />
            <Button
              title="Submit rating"
              onPress={submitRating}
              loading={submitting}
              disabled={rating < 1}
              testID="submit-rating-btn"
            />
          </View>
        )}

        {/* Post-rating */}
        {rated && (
          <View style={[styles.card, { alignItems: 'center' }]} testID="rated-thanks">
            <Ionicons name="checkmark-circle" size={56} color={colors.success} />
            <Text style={[styles.cardTitle, { marginTop: 10 }]}>Thanks for riding!</Text>
            <Text style={[styles.cardSub, { marginBottom: 16 }]}>
              You rated this trip {ride.rating} ★
            </Text>
            <Button
              title="Back to home"
              onPress={() => router.replace('/rider')}
              testID="back-to-home-btn"
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  etaWrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingTop: 12 },
  etaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
  },
  etaDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  etaText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  mapBackWrap: { position: 'absolute', top: 0, left: 0 },
  mapBack: {
    margin: 16, width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },
  statusCard: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, padding: 16, marginBottom: 12, borderRadius: 12,
  },
  statusEye: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: '#52525B' },
  statusLabel: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  card: { borderWidth: 1, borderColor: '#E4E4E7', padding: 16, marginBottom: 12, borderRadius: 12 },
  cardEye: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: '#52525B', marginBottom: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  cardTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.4, color: colors.black },
  cardSub: { fontSize: 13, color: '#52525B', marginTop: 3 },
  callBtn: { backgroundColor: colors.riderCta, padding: 12, borderRadius: 24 },
  tripRow: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  tripAddr: { fontSize: 14, fontWeight: '500', color: colors.black, lineHeight: 20 },
  metricsRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F4F4F5' },
  metricVal: { fontSize: 16, fontWeight: '900', letterSpacing: -0.4, color: colors.black, marginTop: 2 },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderWidth: 1.5, borderColor: colors.danger, borderRadius: 12, marginBottom: 12,
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: colors.danger },
  fareHero: { fontSize: 48, fontWeight: '900', letterSpacing: -2, color: colors.black, marginVertical: 8 },
  stars: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginVertical: 16 },
  reviewInput: {
    borderWidth: 1.5, borderColor: '#E4E4E7', borderRadius: 8,
    padding: 12, fontSize: 14, color: colors.black,
    minHeight: 80, textAlignVertical: 'top',
  },
});
