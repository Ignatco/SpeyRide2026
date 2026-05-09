import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, ActivityIndicator, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Map from '../../../components/Map';
import Button from '../../../components/Button';
import { api } from '../../../lib/api';
import { colors } from '../../../lib/theme';

const STATUS = {
  searching: { label: 'Finding driver…', color: colors.riderCta, pulse: true },
  accepted: { label: 'Driver on the way', color: colors.riderCta, pulse: false },
  arrived: { label: 'Driver arrived', color: colors.success, pulse: false },
  in_transit: { label: 'En route to drop', color: colors.riderCta, pulse: false },
  completed: { label: 'Trip completed', color: colors.black, pulse: false },
  cancelled: { label: 'Cancelled', color: colors.danger, pulse: false },
};

export default function RiderRide() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [ride, setRide] = useState(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchRide = useCallback(async () => {
    try {
      const { data } = await api.get(`/rides/${id}`);
      setRide(data.ride);
    } catch {}
  }, [id]);

  useEffect(() => {
    fetchRide();
    const t = setInterval(fetchRide, 4000);
    return () => clearInterval(t);
  }, [fetchRide]);

  if (!ride) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator />
      </View>
    );
  }

  const cancel = async () => {
    Alert.alert('Cancel ride?', 'This cannot be undone.', [
      { text: 'Keep ride', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/rides/${ride.id}/status`, { status: 'cancelled' });
            router.replace('/rider');
          } catch (e) {
            Alert.alert('Failed', e.response?.data?.detail || 'Try again');
          }
        },
      },
    ]);
  };

  const submitRating = async () => {
    if (rating < 1) return Alert.alert('Pick stars', 'Tap stars to rate');
    setBusy(true);
    try {
      await api.post(`/rides/${ride.id}/rate`, { rating, review });
      router.replace('/rider');
    } catch (e) {
      Alert.alert('Failed', e.response?.data?.detail || 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const payStripe = async () => {
    setPaying(true);
    try {
      const origin = process.env.EXPO_PUBLIC_BACKEND_URL;
      const { data } = await api.post(`/payments/checkout/${ride.id}`, { origin_url: origin });
      const result = await WebBrowser.openBrowserAsync(data.url);
      // After browser closes, poll status
      let attempts = 0;
      const poll = async () => {
        attempts += 1;
        const { data: s } = await api.get(`/payments/status/${data.session_id}`);
        if (s.payment_status === 'paid') {
          await fetchRide();
          return;
        }
        if (attempts < 6) setTimeout(poll, 2000);
      };
      poll();
    } catch (e) {
      Alert.alert('Payment failed', e.response?.data?.detail || 'Try again');
    } finally {
      setPaying(false);
    }
  };

  const markCash = () => setRide({ ...ride, payment_status: 'paid' });

  const status = STATUS[ride.status] || STATUS.searching;
  const isCompleted = ride.status === 'completed';
  const needsPayment = isCompleted && ride.payment_status !== 'paid';
  const canRate = isCompleted && ride.payment_status === 'paid' && !ride.rating;
  const isRated = isCompleted && ride.rating;

  return (
    <View style={styles.container}>
      <View style={styles.mapWrap}>
        <Map
          pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
          drop={{ lat: ride.drop_lat, lng: ride.drop_lng }}
          height={300}
        />
        {ride.status === 'searching' && (
          <SafeAreaView edges={['top']} style={styles.mapOverlay}>
            <Pressable onPress={() => router.replace('/rider')} style={styles.backBtn} testID="rider-ride-back-btn">
              <Ionicons name="chevron-back" size={22} color={colors.black} />
            </Pressable>
          </SafeAreaView>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={[styles.statusBanner, { borderColor: status.color }]} testID="ride-status-banner">
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>STATUS</Text>
            <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
          </View>
          {status.pulse && <View style={[styles.pulseDot, { backgroundColor: status.color }]} />}
        </View>

        {ride.driver_name && (
          <View style={styles.card}>
            <Text style={styles.eyebrow}>YOUR DRIVER</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <View>
                <Text style={styles.cardTitle} testID="driver-name">{ride.driver_name}</Text>
                <Text style={styles.cardSub}>{ride.driver_vehicle} · <Text style={{ fontFamily: 'Menlo' }}>{ride.driver_plate}</Text></Text>
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

        <View style={styles.card}>
          <View style={styles.tripRow}>
            <View style={[styles.dot, { backgroundColor: colors.riderCta }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>PICKUP</Text>
              <Text style={styles.tripText} numberOfLines={2}>{ride.pickup_address}</Text>
            </View>
          </View>
          <View style={styles.tripRow}>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>DROP</Text>
              <Text style={styles.tripText} numberOfLines={2}>{ride.drop_address}</Text>
            </View>
          </View>
          <View style={styles.metricRow}>
            <Metric label="DISTANCE" value={`${ride.distance_km} km`} />
            <Metric label="TIME" value={`~${ride.duration_min} min`} />
            <Metric label="FARE" value={`£${ride.fare.toFixed(2)}`} color={colors.riderCta} testID="ride-fare" />
          </View>
        </View>

        {ride.status === 'searching' && (
          <Button title="Cancel ride" onPress={cancel} variant="outline" testID="cancel-ride-btn" icon={<Ionicons name="close" size={18} color={colors.black} />} />
        )}

        {needsPayment && (
          <View style={[styles.card, { backgroundColor: colors.riderSurface }]} testID="payment-section">
            <Text style={styles.eyebrow}>SETTLE UP</Text>
            <Text style={styles.bigPrice}>£{ride.fare.toFixed(2)}</Text>
            <Text style={[styles.cardSub, { textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }]}>
              Selected: {ride.payment_method}
            </Text>
            {ride.payment_method === 'stripe' ? (
              <Button title="Pay with card" onPress={payStripe} loading={paying} variant="dark" testID="pay-stripe-btn"
                icon={<Ionicons name="card" size={18} color={colors.white} />} />
            ) : (
              <Button title="Confirm cash paid" onPress={markCash} variant="dark" testID="pay-cash-btn"
                icon={<Ionicons name="cash" size={18} color={colors.white} />} />
            )}
          </View>
        )}

        {canRate && (
          <View style={styles.card} testID="rating-section">
            <Text style={styles.eyebrow}>RATE YOUR TRIP</Text>
            <Text style={styles.cardTitle}>How was it?</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRating(n)} testID={`star-${n}-btn`}>
                  <Ionicons
                    name={n <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color={n <= rating ? colors.riderCta : colors.riderBorder}
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              value={review}
              onChangeText={setReview}
              placeholder="Optional comment"
              placeholderTextColor={colors.riderTextMuted}
              multiline
              numberOfLines={3}
              style={styles.review}
              testID="rating-review-input"
            />
            <Button title="Submit" onPress={submitRating} loading={busy} testID="submit-rating-btn" />
          </View>
        )}

        {isRated && (
          <View style={[styles.card, { alignItems: 'center' }]} testID="rated-thanks">
            <Ionicons name="checkmark-circle" size={56} color={colors.success} />
            <Text style={[styles.cardTitle, { marginTop: 8 }]}>Thanks for riding</Text>
            <Text style={styles.cardSub}>You rated this trip {ride.rating} stars</Text>
            <View style={{ height: 16 }} />
            <Button title="Back to home" onPress={() => router.replace('/rider')} variant="dark" testID="back-to-home-btn" />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Metric({ label, value, color, testID }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.eyebrow}>{label}</Text>
      <Text style={[styles.metricValue, color && { color }]} testID={testID}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  mapWrap: { height: 300 },
  mapOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  backBtn: { width: 40, height: 40, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.black, alignItems: 'center', justifyContent: 'center', margin: 16 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.riderTextMuted },
  statusBanner: {
    borderWidth: 2, padding: 16, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  statusLabel: { fontSize: 24, fontWeight: '900', letterSpacing: -0.8, marginTop: 4 },
  pulseDot: { width: 12, height: 12, borderRadius: 6 },
  card: { borderWidth: 2, borderColor: colors.black, padding: 16, marginBottom: 16, backgroundColor: colors.white },
  cardTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.6, color: colors.black },
  cardSub: { fontSize: 14, color: colors.riderTextMuted, marginTop: 2 },
  callBtn: { backgroundColor: colors.riderCta, padding: 12 },
  tripRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  tripText: { color: colors.black, fontSize: 13, fontWeight: '500', marginTop: 2 },
  metricRow: { flexDirection: 'row', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.riderBorder },
  metricValue: { fontSize: 16, fontWeight: '900', letterSpacing: -0.4, color: colors.black, marginTop: 2 },
  bigPrice: { fontSize: 56, fontWeight: '900', letterSpacing: -2, color: colors.black, marginVertical: 12 },
  starRow: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginVertical: 16 },
  review: { borderWidth: 2, borderColor: colors.black, padding: 12, fontSize: 14, color: colors.black, marginBottom: 12, minHeight: 80, textAlignVertical: 'top' },
});
