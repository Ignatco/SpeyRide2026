import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Alert,
  ScrollView, ActivityIndicator, Modal, FlatList, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Map from '../../components/Map';
import Button from '../../components/Button';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../lib/theme';

const VEHICLES = [
  { id: 'mini',  label: 'Mini',  icon: 'car-outline',  desc: '2 seats', eta: '3 min' },
  { id: 'sedan', label: 'Sedan', icon: 'car',           desc: '4 seats', eta: '5 min' },
  { id: 'suv',   label: 'SUV',   icon: 'car-sport',     desc: '6 seats', eta: '7 min' },
];

const PAYMENT_METHODS = [
  { id: 'cash',       label: 'Cash',       icon: 'cash-outline' },
  { id: 'apple_pay',  label: 'Apple Pay',  icon: 'logo-apple' },
  { id: 'google_pay', label: 'Google Pay', icon: 'logo-google' },
  { id: 'stripe',     label: 'Card',       icon: 'card-outline' },
];

async function geocode(q) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=8&countrycodes=gb`,
    { headers: { 'Accept-Language': 'en-GB' } }
  );
  return res.json();
}

async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
    { headers: { 'Accept-Language': 'en-GB' } }
  );
  const d = await res.json();
  if (d?.address?.country_code && d.address.country_code !== 'gb') return null;
  return d;
}

export default function RiderHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [pickup, setPickup]               = useState(null);
  const [drop,   setDrop]                 = useState(null);
  const [estimates, setEstimates]         = useState(null);
  const [vehicle, setVehicle]             = useState('sedan');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading]             = useState(false);
  const [picker, setPicker]               = useState(null); // 'pickup' | 'drop'
  const [tripRoute, setTripRoute]         = useState(null);

  // Geolocation on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPickup({ lat: 57.1959, lng: -3.829, address: 'Aviemore, Highland' });
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({});
        const r = await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
        setPickup(r
          ? { lat: loc.coords.latitude, lng: loc.coords.longitude, address: r.display_name }
          : { lat: 57.1959, lng: -3.829, address: 'Aviemore, Highland' }
        );
      } catch {
        setPickup({ lat: 57.1959, lng: -3.829, address: 'Aviemore, Highland' });
      }
    })();
  }, []);

  // Redirect if active ride exists
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/rides/active');
        if (data.ride) router.replace(`/rider/ride/${data.ride.id}`);
      } catch {}
    })();
  }, [router]);

  // Fetch estimates + route when both points set
  useEffect(() => {
    if (!pickup || !drop) { setEstimates(null); setTripRoute(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const [estRes, routeRes] = await Promise.allSettled([
          api.post('/rides/estimate', {
            pickup_lat: pickup.lat, pickup_lng: pickup.lng,
            drop_lat: drop.lat,    drop_lng: drop.lng,
          }),
          fetch(
            `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=full&geometries=geojson`
          ).then(r => r.json()),
        ]);
        if (cancelled) return;
        if (estRes.status === 'fulfilled') setEstimates(estRes.value.data);
        if (routeRes.status === 'fulfilled' && routeRes.value?.code === 'Ok') {
          setTripRoute(routeRes.value.routes[0].geometry.coordinates);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [pickup, drop]);

  const book = async () => {
    if (!pickup || !drop) return Alert.alert('Missing', 'Set pickup and destination');
    setLoading(true);
    try {
      const { data } = await api.post('/rides', {
        pickup_lat: pickup.lat, pickup_lng: pickup.lng, pickup_address: pickup.address,
        drop_lat: drop.lat,    drop_lng: drop.lng,    drop_address: drop.address,
        vehicle_class: vehicle,
        payment_method: paymentMethod,
      });
      router.push(`/rider/ride/${data.ride.id}`);
    } catch (e) {
      Alert.alert('Booking failed', e?.response?.data?.detail || 'Try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Map pickup={pickup} drop={drop} tripRoute={tripRoute} />

      {/* Top overlay */}
      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          <View style={styles.greetCard}>
            <Text style={styles.greetName} numberOfLines={1}>
              {user?.name || user?.phone || 'Hello'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => router.push('/rider/history')}
              style={styles.iconBtn}
              testID="rider-history-btn"
            >
              <Ionicons name="time-outline" size={20} color={colors.black} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/account')}
              style={styles.iconBtn}
              testID="rider-account-btn"
            >
              <Ionicons name="person-circle-outline" size={20} color={colors.black} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* Bottom sheet */}
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.handle} />

          {/* Where to? */}
          <Text style={styles.whereLabel}>Where to?</Text>

          <Pressable onPress={() => setPicker('pickup')} style={styles.locRow} testID="pickup-input">
            <View style={[styles.dot, { backgroundColor: colors.riderCta }]} />
            <Text style={[styles.locText, !pickup && styles.locPlaceholder]} numberOfLines={1}>
              {pickup?.address || 'Pickup location'}
            </Text>
          </Pressable>
          <Pressable onPress={() => setPicker('drop')} style={[styles.locRow, { borderTopWidth: 0 }]} testID="drop-input">
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <Text style={[styles.locText, !drop && styles.locPlaceholder]} numberOfLines={1}>
              {drop?.address || 'Destination'}
            </Text>
          </Pressable>

          {/* Estimates */}
          {estimates && (
            <>
              {/* Vehicle selector */}
              <View style={styles.vehicleRow}>
                {VEHICLES.map((v) => {
                  const est = estimates.estimates[v.id];
                  const active = vehicle === v.id;
                  return (
                    <Pressable
                      key={v.id}
                      onPress={() => setVehicle(v.id)}
                      style={[styles.vehicleCard, active && styles.vehicleCardActive]}
                      testID={`vehicle-${v.id}-btn`}
                    >
                      <Ionicons
                        name={v.icon} size={24}
                        color={active ? colors.white : colors.black}
                      />
                      <Text style={[styles.vehicleLabel, active && { color: colors.white }]}>
                        {v.label}
                      </Text>
                      <Text style={[styles.vehicleEta, active && { color: 'rgba(255,255,255,0.75)' }]}>
                        {v.eta}
                      </Text>
                      <Text style={[styles.vehicleFare, active && { color: colors.white }]}>
                        £{est.fare.toFixed(2)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Payment method */}
              <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
                contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
              >
                {PAYMENT_METHODS.map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() => setPaymentMethod(m.id)}
                    testID={`payment-${m.id}-btn`}
                    style={[styles.payBtn, paymentMethod === m.id && styles.payBtnActive]}
                  >
                    <Ionicons
                      name={m.icon} size={15}
                      color={paymentMethod === m.id ? colors.white : colors.black}
                    />
                    <Text style={[styles.payText, paymentMethod === m.id && { color: colors.white }]}>
                      {m.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Trip info */}
              <View style={styles.infoRow}>
                <Text style={styles.infoMuted}>{estimates.distance_km} km</Text>
                <Text style={styles.infoMuted}>
                  ~{estimates.estimates[vehicle].duration_min} min
                </Text>
              </View>

              <Button
                title={`Confirm · £${estimates.estimates[vehicle].fare.toFixed(2)}`}
                onPress={book}
                loading={loading}
                testID="book-ride-btn"
              />
            </>
          )}

          {pickup && !drop && !estimates && (
            <View style={styles.hint}>
              <Ionicons name="search-outline" size={18} color={colors.riderTextMuted} />
              <Text style={styles.hintText}>Tap destination to see fares</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Address picker modal */}
      {picker && (
        <AddressPicker
          which={picker}
          onClose={() => setPicker(null)}
          onPick={(loc) => {
            if (picker === 'pickup') { setPickup(loc); setTripRoute(null); }
            else { setDrop(loc); setTripRoute(null); }
            setPicker(null);
          }}
        />
      )}
    </View>
  );
}

function AddressPicker({ which, onClose, onPick }) {
  const [q, setQ]           = useState('');
  const [items, setItems]   = useState([]);
  const [busy, setBusy]     = useState(false);
  const timer               = useRef(null);

  const onChange = (v) => {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    if (!v || v.length < 3) { setItems([]); return; }
    timer.current = setTimeout(async () => {
      setBusy(true);
      try { setItems(await geocode(v)); }
      finally { setBusy(false); }
    }, 350);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={pickerStyles.safe}>
        <View style={pickerStyles.header}>
          <Pressable onPress={onClose} style={pickerStyles.closeBtn}>
            <Ionicons name="chevron-down" size={24} color={colors.black} />
          </Pressable>
          <Text style={pickerStyles.title}>
            {which === 'pickup' ? 'Set pickup' : 'Set destination'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={pickerStyles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.riderTextMuted} />
          <TextInput
            value={q}
            onChangeText={onChange}
            placeholder="Search address, postcode, place…"
            placeholderTextColor={colors.riderTextMuted}
            autoFocus
            style={pickerStyles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {q.length > 0 && (
            <Pressable onPress={() => { setQ(''); setItems([]); }}>
              <Ionicons name="close-circle" size={18} color={colors.riderTextMuted} />
            </Pressable>
          )}
        </View>

        {busy && <ActivityIndicator style={{ marginTop: 20 }} color={colors.riderCta} />}

        <FlatList
          data={items}
          keyExtractor={(it) => `${it.lat}-${it.lon}`}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !busy && q.length >= 3 ? (
              <Text style={pickerStyles.empty}>No results. Try a postcode or town name.</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPick({
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                address: item.display_name,
              })}
              style={pickerStyles.item}
            >
              <Ionicons name="location-outline" size={18} color={colors.riderTextMuted} />
              <Text style={pickerStyles.itemText} numberOfLines={2}>
                {item.display_name}
              </Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  greetCard: {
    backgroundColor: colors.white, borderRadius: 24,
    paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  greetName: { fontSize: 15, fontWeight: '700', color: colors.black },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 16,
    maxHeight: '68%',
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4,
    backgroundColor: '#E4E4E7', borderRadius: 2, marginBottom: 16,
  },
  whereLabel: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginBottom: 14 },
  locRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#E4E4E7',
    paddingHorizontal: 14, paddingVertical: 16,
    backgroundColor: '#FAFAFA',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  locText: { flex: 1, fontSize: 15, color: colors.black, fontWeight: '500' },
  locPlaceholder: { color: colors.riderTextMuted, fontWeight: '400' },
  vehicleRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 12 },
  vehicleCard: {
    flex: 1, padding: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E4E4E7',
    backgroundColor: colors.white, alignItems: 'center',
  },
  vehicleCardActive: { backgroundColor: colors.riderCta, borderColor: colors.riderCta },
  vehicleLabel: { fontSize: 13, fontWeight: '800', marginTop: 6, color: colors.black },
  vehicleEta: { fontSize: 10, color: colors.riderTextMuted, marginTop: 2 },
  vehicleFare: { fontSize: 16, fontWeight: '900', marginTop: 4, color: colors.black },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E4E4E7',
    backgroundColor: colors.white,
  },
  payBtnActive: { backgroundColor: colors.black, borderColor: colors.black },
  payText: { fontSize: 13, fontWeight: '700', color: colors.black },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 14,
  },
  infoMuted: { fontSize: 13, color: colors.riderTextMuted, fontWeight: '500' },
  hint: {
    marginTop: 16, padding: 20, borderRadius: 12,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#E4E4E7',
    flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center',
  },
  hintText: { color: colors.riderTextMuted, fontSize: 14 },
});

const pickerStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F4F4F5',
  },
  closeBtn: { width: 40, alignItems: 'flex-start' },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#F4F4F5', borderRadius: 12,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.black, padding: 0 },
  empty: { textAlign: 'center', marginTop: 24, color: colors.riderTextMuted, fontSize: 14 },
  item: {
    flexDirection: 'row', gap: 12, padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#F9F9F9',
    alignItems: 'flex-start',
  },
  itemText: { flex: 1, fontSize: 15, color: colors.black, lineHeight: 20 },
});
