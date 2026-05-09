import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Map from '../../../components/Map';
import Button from '../../../components/Button';
import { api } from '../../../lib/api';
import { colors } from '../../../lib/theme';
import { startDriverBackgroundStream, stopDriverBackgroundStream } from '../../../lib/locationTask';

const NEXT = {
  accepted: { next: 'arrived', label: "I've arrived" },
  arrived: { next: 'in_transit', label: 'Start trip' },
  in_transit: { next: 'completed', label: 'Complete trip' },
};

const TITLES = {
  accepted: 'Drive to pickup',
  arrived: 'Pickup the rider',
  in_transit: 'Drop off in progress',
  completed: 'Trip complete',
};

export default function DriverRide() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [ride, setRide] = useState(null);
  const [busy, setBusy] = useState(false);

  const fetchRide = useCallback(async () => {
    try {
      const { data } = await api.get(`/rides/${id}`);
      setRide(data.ride);
    } catch {}
  }, [id]);

  useEffect(() => {
    fetchRide();
    const t = setInterval(fetchRide, 5000);
    return () => clearInterval(t);
  }, [fetchRide]);

  // Stream driver location to backend while ride is active.
  // Try background mode first; fall back to foreground watcher if denied.
  useEffect(() => {
    if (!ride || ['completed', 'cancelled'].includes(ride.status)) return;
    let cancelled = false;
    let watcher;
    let bgActive = false;
    (async () => {
      bgActive = await startDriverBackgroundStream();
      if (cancelled) {
        if (bgActive) await stopDriverBackgroundStream();
        return;
      }
      if (bgActive) return; // background task is running, no foreground watcher needed
      // Fallback: foreground-only watcher
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 25 },
        async (pos) => {
          try {
            await api.post('/driver/location', {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              heading: typeof pos.coords.heading === 'number' && pos.coords.heading >= 0 ? pos.coords.heading : null,
            });
          } catch {}
        }
      );
    })();
    return () => {
      cancelled = true;
      if (watcher) watcher.remove();
      stopDriverBackgroundStream();
    };
  }, [ride?.status]);

  if (!ride) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.driverText} />
      </View>
    );
  }

  const action = NEXT[ride.status];
  const isCompleted = ride.status === 'completed';

  const advance = async () => {
    if (!action) return;
    setBusy(true);
    try {
      await api.post(`/rides/${ride.id}/status`, { status: action.next });
      fetchRide();
    } catch {
      Alert.alert('Failed', 'Try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapWrap}>
        <Map
          dark
          pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
          drop={{ lat: ride.drop_lat, lng: ride.drop_lng }}
          height={300}
          showsUserLocation
        />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={styles.eyebrow}>ACTIVE TRIP</Text>
        <Text style={styles.h2}>{TITLES[ride.status] || 'Active trip'}</Text>

        <View style={styles.card}>
          <Text style={styles.eyebrowMuted}>RIDER</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <View>
              <Text style={styles.cardTitle} testID="ride-rider-name">{ride.rider_name}</Text>
              <Text style={styles.cardSub}>{ride.vehicle_class.toUpperCase()}</Text>
            </View>
            <Pressable
              onPress={() => Linking.openURL(`tel:${ride.rider_phone}`)}
              style={styles.callBtn}
              testID="call-rider-btn"
            >
              <Ionicons name="call" size={20} color={colors.black} />
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.tripRow}>
            <View style={[styles.dot, { backgroundColor: colors.driverCta }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrowMuted}>PICKUP</Text>
              <Text style={styles.tripText} numberOfLines={2}>{ride.pickup_address}</Text>
            </View>
          </View>
          <View style={styles.tripRow}>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrowMuted}>DROP</Text>
              <Text style={styles.tripText} numberOfLines={2}>{ride.drop_address}</Text>
            </View>
          </View>
          <View style={styles.metricRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrowMuted}>DISTANCE</Text>
              <Text style={styles.metricValue}>{ride.distance_km} km</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrowMuted}>TIME</Text>
              <Text style={styles.metricValue}>~{ride.duration_min} min</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrowMuted}>EARN</Text>
              <Text style={[styles.metricValue, { color: colors.driverCta }]} testID="ride-earnings">£{ride.fare.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {action && (
          <Pressable
            onPress={advance}
            disabled={busy}
            style={[styles.bigBtn, busy && { opacity: 0.6 }]}
            testID="advance-status-btn"
          >
            {busy ? <ActivityIndicator color={colors.black} /> : (
              <>
                <Ionicons name="navigate" size={26} color={colors.black} />
                <Text style={styles.bigBtnText}>{action.label}</Text>
              </>
            )}
          </Pressable>
        )}

        {isCompleted && (
          <View style={{ alignItems: 'center', marginTop: 16 }} testID="trip-complete-section">
            <Ionicons name="checkmark-circle" size={56} color={colors.success} />
            <Text style={[styles.cardSub, { marginVertical: 16 }]}>+£{ride.fare.toFixed(2)} added to earnings</Text>
            <Pressable
              onPress={() => router.replace('/driver')}
              style={styles.bigBtn}
              testID="back-to-driver-btn"
            >
              <Text style={styles.bigBtnText}>Back to dashboard</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.driverBg },
  mapWrap: { height: 300, borderBottomWidth: 2, borderBottomColor: colors.driverBorder },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.driverCta },
  eyebrowMuted: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.driverTextMuted },
  h2: { fontSize: 28, fontWeight: '900', letterSpacing: -1, color: colors.driverText, marginTop: 4, marginBottom: 16 },
  card: { borderWidth: 2, borderColor: colors.driverBorder, backgroundColor: colors.driverSurface, padding: 14, marginBottom: 14 },
  cardTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5, color: colors.driverText },
  cardSub: { fontSize: 13, color: colors.driverTextMuted, marginTop: 2 },
  callBtn: { backgroundColor: colors.driverCta, padding: 12 },
  tripRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  tripText: { color: colors.driverText, fontSize: 13, fontWeight: '500', marginTop: 2 },
  metricRow: { flexDirection: 'row', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.driverBorder },
  metricValue: { fontSize: 16, fontWeight: '900', letterSpacing: -0.4, color: colors.driverText, marginTop: 2 },
  bigBtn: {
    backgroundColor: colors.driverCta,
    paddingVertical: 22, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 10,
  },
  bigBtnText: { fontSize: 22, fontWeight: '900', letterSpacing: -1, color: colors.black },
});
