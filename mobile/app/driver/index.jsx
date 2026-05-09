import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Map from '../../components/Map';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../lib/theme';

export default function DriverHome() {
  const router = useRouter();
  const { user, logout, refresh } = useAuth();
  const [online, setOnline] = useState(user?.is_online || false);
  const [loc, setLoc] = useState({ lat: 57.1959, lng: -3.829 });
  const [requests, setRequests] = useState([]);
  const [accepting, setAccepting] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const p = await Location.getCurrentPositionAsync({});
      setLoc({ lat: p.coords.latitude, lng: p.coords.longitude });
    })();
  }, []);

  // Active ride redirect
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/rides/active');
        if (data.ride && data.ride.driver_id === user?.id) {
          router.replace(`/driver/ride/${data.ride.id}`);
        }
      } catch {}
    })();
  }, [router, user]);

  const toggle = async () => {
    const next = !online;
    try {
      await api.post('/driver/online', { is_online: next, lat: loc.lat, lng: loc.lng });
      setOnline(next);
      refresh();
    } catch {
      Alert.alert('Failed', 'Try again');
    }
  };

  const fetchReqs = useCallback(async () => {
    if (!online) return;
    try {
      const { data } = await api.get('/driver/requests');
      setRequests(data.rides);
    } catch {}
  }, [online]);

  useEffect(() => {
    fetchReqs();
    const t = setInterval(fetchReqs, 4000);
    return () => clearInterval(t);
  }, [fetchReqs]);

  const accept = async (id) => {
    setAccepting(id);
    try {
      await api.post(`/rides/${id}/accept`);
      router.push(`/driver/ride/${id}`);
    } catch (e) {
      Alert.alert('Failed', e.response?.data?.detail || 'Could not accept');
      fetchReqs();
    } finally {
      setAccepting(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.driverBg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.eyebrowMuted}>DRIVER</Text>
            <Text style={styles.driverName} testID="driver-name-display">{user?.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <DarkIconBtn icon="cash-outline" onPress={() => router.push('/driver/earnings')} testID="driver-earnings-btn" />
            <DarkIconBtn icon="time-outline" onPress={() => router.push('/driver/earnings')} testID="driver-history-btn" />
            <DarkIconBtn icon="log-out-outline" onPress={async () => { await logout(); router.replace('/'); }} danger testID="driver-logout-btn" />
          </View>
        </View>

        <View style={styles.mapBox}>
          <Map dark height={240} pickup={{ lat: loc.lat, lng: loc.lng }} />
        </View>

        <View style={styles.statsRow}>
          <Stat label="EARNINGS" value={`£${(user?.earnings_total || 0).toFixed(2)}`} accent testID="stat-earnings" />
          <Stat label="TRIPS" value={`${user?.rides_count || 0}`} />
          <Stat label="RATING" value={`★ ${(user?.rating || 5).toFixed(1)}`} />
        </View>

        <Pressable
          onPress={toggle}
          testID="online-toggle-btn"
          style={[styles.onlineBtn, online ? styles.onlineActive : styles.onlineInactive]}
        >
          <Ionicons name="power" size={28} color={online ? colors.black : colors.white} />
          <Text style={[styles.onlineText, online ? { color: colors.black } : { color: colors.white }]}>
            {online ? 'ONLINE' : 'GO ONLINE'}
          </Text>
        </Pressable>

        <View style={styles.requestsHeader}>
          <Text style={styles.eyebrowAccent}>INCOMING REQUESTS</Text>
          <Text style={styles.eyebrowMuted}>{requests.length} active</Text>
        </View>

        {!online ? (
          <View style={styles.dashedBox}>
            <Text style={styles.dashedText}>Go online to receive ride requests</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.dashedBox} testID="no-requests">
            <ActivityIndicator color={colors.driverTextMuted} />
            <Text style={[styles.dashedText, { marginTop: 8 }]}>Searching for riders…</Text>
          </View>
        ) : (
          <View testID="requests-list" style={{ gap: 12 }}>
            {requests.map((r) => (
              <View key={r.id} style={styles.reqCard} testID={`request-${r.id}`}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View>
                    <Text style={styles.eyebrowMuted}>{r.rider_name}</Text>
                    <Text style={styles.reqFare}>£{r.fare.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.classChip}>{r.vehicle_class.toUpperCase()}</Text>
                </View>
                <View style={{ marginTop: 12, gap: 4 }}>
                  <View style={styles.reqRow}>
                    <Ionicons name="ellipse" size={8} color={colors.driverCta} />
                    <Text style={styles.reqText} numberOfLines={1}>{r.pickup_address}</Text>
                  </View>
                  <View style={styles.reqRow}>
                    <Ionicons name="ellipse" size={8} color={colors.danger} />
                    <Text style={styles.reqText} numberOfLines={1}>{r.drop_address}</Text>
                  </View>
                </View>
                <View style={styles.reqFoot}>
                  <Text style={styles.reqMeta}>{r.distance_km} km · ~{r.duration_min} min</Text>
                  <Pressable
                    onPress={() => accept(r.id)}
                    disabled={accepting === r.id}
                    style={styles.acceptBtn}
                    testID={`accept-${r.id}-btn`}
                  >
                    {accepting === r.id ? (
                      <ActivityIndicator color={colors.black} size="small" />
                    ) : (
                      <>
                        <Text style={styles.acceptText}>Accept</Text>
                        <Ionicons name="arrow-forward" size={16} color={colors.black} />
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DarkIconBtn({ icon, onPress, testID, danger }) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={[styles.darkBtn, danger && { borderColor: colors.danger }]}
    >
      <Ionicons name={icon} size={18} color={colors.white} />
    </Pressable>
  );
}

function Stat({ label, value, accent, testID }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.eyebrowMuted}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: colors.driverCta }]} testID={testID}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  eyebrowMuted: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.driverTextMuted },
  eyebrowAccent: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.driverCta },
  driverName: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5, color: colors.driverText, marginTop: 2 },
  darkBtn: { width: 40, height: 40, borderWidth: 2, borderColor: colors.driverBorder, backgroundColor: colors.driverSurface, alignItems: 'center', justifyContent: 'center' },

  mapBox: { borderWidth: 2, borderColor: colors.driverBorder, height: 240, marginBottom: 16, overflow: 'hidden' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, borderWidth: 2, borderColor: colors.driverBorder, backgroundColor: colors.driverSurface, padding: 12 },
  statValue: { fontSize: 18, fontWeight: '900', letterSpacing: -0.6, color: colors.driverText, marginTop: 4 },

  onlineBtn: {
    paddingVertical: 28, borderWidth: 2,
    flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  onlineActive: { backgroundColor: colors.driverCta, borderColor: colors.driverCta },
  onlineInactive: { backgroundColor: colors.driverBg, borderColor: colors.driverBorder },
  onlineText: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },

  requestsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dashedBox: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: colors.driverBorder,
    padding: 32, alignItems: 'center',
  },
  dashedText: { color: colors.driverTextMuted, fontSize: 13 },

  reqCard: { borderWidth: 2, borderColor: colors.driverBorder, backgroundColor: colors.driverSurface, padding: 14 },
  reqFare: { fontSize: 28, fontWeight: '900', letterSpacing: -1, color: colors.driverCta, marginTop: 4 },
  classChip: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: colors.black, backgroundColor: colors.driverCta, paddingHorizontal: 8, paddingVertical: 4 },
  reqRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  reqText: { color: colors.driverText, fontSize: 12, flex: 1 },
  reqFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  reqMeta: { color: colors.driverTextMuted, fontSize: 12 },
  acceptBtn: {
    backgroundColor: colors.driverCta, paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', gap: 6, alignItems: 'center',
  },
  acceptText: { fontWeight: '900', fontSize: 14, color: colors.black, letterSpacing: -0.4 },
});
