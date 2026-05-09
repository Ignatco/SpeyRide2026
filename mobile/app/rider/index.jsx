import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, ActivityIndicator, Modal, FlatList } from 'react-native';
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
  { id: 'mini', label: 'Mini', icon: 'car-outline', desc: 'Compact · 2', eta: '4 min' },
  { id: 'sedan', label: 'Sedan', icon: 'car', desc: 'Comfort · 4', eta: '6 min' },
  { id: 'suv', label: 'SUV', icon: 'car-sport', desc: 'Spacious · 6', eta: '8 min' },
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
  const data = await res.json();
  // Reject if not in UK
  if (data?.address?.country_code && data.address.country_code !== 'gb') return null;
  return data;
}

export default function RiderHome() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [estimates, setEstimates] = useState(null);
  const [previewRoute, setPreviewRoute] = useState(null);
  const [vehicle, setVehicle] = useState('sedan');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [picker, setPicker] = useState(null); // 'pickup' | 'drop' | null

  // Initial location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPickup({ lat: 57.1959, lng: -3.829, address: 'Aviemore, Highland (default)' });
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({});
        const r = await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
        if (r) {
          setPickup({ lat: loc.coords.latitude, lng: loc.coords.longitude, address: r.display_name || 'Current location' });
        } else {
          // Outside UK — fall back to Aviemore default
          setPickup({ lat: 57.1959, lng: -3.829, address: 'Aviemore, Highland (default)' });
        }
      } catch {
        setPickup({ lat: 57.1959, lng: -3.829, address: 'Aviemore, Highland (default)' });
      }
    })();
  }, []);

  // Active ride redirect
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/rides/active');
        if (data.ride) router.replace(`/rider/ride/${data.ride.id}`);
      } catch {}
    })();
  }, [router]);

  // Fare estimate
  useEffect(() => {
    if (!pickup || !drop) return setEstimates(null);
    (async () => {
      try {
        const { data } = await api.post('/rides/estimate', {
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          drop_lat: drop.lat,
          drop_lng: drop.lng,
        });
        setEstimates(data);
      } catch {}
    })();
  }, [pickup, drop]);

  const book = async () => {
    if (!pickup || !drop) return Alert.alert('Missing', 'Set pickup and destination');
    setLoading(true);
    try {
      const { data } = await api.post('/rides', {
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        pickup_address: pickup.address,
        drop_lat: drop.lat,
        drop_lng: drop.lng,
        drop_address: drop.address,
        vehicle_class: vehicle,
        payment_method: paymentMethod,
      });
      router.push(`/rider/ride/${data.ride.id}`);
    } catch (e) {
      Alert.alert('Booking failed', e.response?.data?.detail || 'Try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Map pickup={pickup} drop={drop} tripRoute={previewRoute} />

      {/* Top overlay */}
      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          <View style={styles.greetCard}>
            <Text style={styles.eyebrow}>HELLO</Text>
            <Text style={styles.greetName} numberOfLines={1}>{user?.name || 'Rider'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconBtn icon="time-outline" onPress={() => router.push('/rider/history')} testID="rider-history-btn" />
            <IconBtn icon="log-out-outline" onPress={async () => { await logout(); router.replace('/'); }} testID="rider-logout-btn" />
          </View>
        </View>
      </SafeAreaView>

      {/* Bottom sheet */}
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>WHERE TO?</Text>
          <Text style={styles.h2}>Plan your trip.</Text>

          <Pressable onPress={() => setPicker('pickup')} style={styles.locRow} testID="pickup-input">
            <View style={[styles.dot, { backgroundColor: colors.riderCta }]} />
            <Text style={[styles.locText, !pickup && styles.locPlaceholder]} numberOfLines={1}>
              {pickup?.address || 'Pickup location'}
            </Text>
          </Pressable>
          <Pressable onPress={() => setPicker('drop')} style={styles.locRow} testID="drop-input">
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <Text style={[styles.locText, !drop && styles.locPlaceholder]} numberOfLines={1}>
              {drop?.address || 'Where to?'}
            </Text>
          </Pressable>

          {estimates ? (
            <>
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
                      <Ionicons name={v.icon} size={22} color={active ? colors.white : colors.black} />
                      <Text style={[styles.vehicleLabel, active && { color: colors.white }]}>{v.label}</Text>
                      <Text style={[styles.vehicleEta, active && { color: colors.white, opacity: 0.85 }]}>{v.eta}</Text>
                      <Text style={[styles.vehicleFare, active && { color: colors.white }]}>£{est.fare.toFixed(2)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.payRow}>
                {['cash', 'stripe'].map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setPaymentMethod(m)}
                    style={[styles.payBtn, paymentMethod === m && styles.payBtnActive]}
                    testID={`payment-${m}-btn`}
                  >
                    <Text style={[styles.payText, paymentMethod === m && { color: colors.white }]}>
                      {m === 'cash' ? 'CASH' : 'CARD · STRIPE'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoMuted}>Distance</Text>
                <Text style={styles.infoBold}>{estimates.distance_km} km</Text>
              </View>

              <View style={{ marginTop: 8 }}>
                <Button
                  title={`Confirm ${VEHICLES.find((x) => x.id === vehicle).label} · £${estimates.estimates[vehicle].fare.toFixed(2)}`}
                  onPress={book}
                  loading={loading}
                  testID="book-ride-btn"
                />
              </View>
            </>
          ) : pickup ? (
            <View style={styles.empty}>
              <Ionicons name="search" size={20} color={colors.riderTextMuted} />
              <Text style={styles.emptyText}>Pick a destination to see fares</Text>
            </View>
          ) : (
            <ActivityIndicator style={{ marginTop: 24 }} />
          )}
        </ScrollView>
      </SafeAreaView>

      {picker && (
        <AddressPicker
          which={picker}
          onClose={() => setPicker(null)}
          onPick={(loc) => {
            if (picker === 'pickup') setPickup(loc);
            else setDrop(loc);
            setPicker(null);
          }}
        />
      )}
    </View>
  );
}

function AddressPicker({ which, onClose, onPick }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [searching, setSearching] = useState(false);
  const tRef = useRef(null);
  const TI = require('react-native').TextInput;

  const onChange = (v) => {
    setQ(v);
    if (tRef.current) clearTimeout(tRef.current);
    if (!v || v.length < 3) {
      setItems([]);
      return;
    }
    tRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await geocode(v);
        setItems(r);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
        <View style={pickerStyles.header}>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.black} />
          </Pressable>
          <Text style={pickerStyles.title}>{which === 'pickup' ? 'Pickup' : 'Drop'}</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={pickerStyles.searchBox}>
          <Ionicons name="search" size={18} color={colors.riderTextMuted} />
          <TI
            value={q}
            onChangeText={onChange}
            placeholder="Search UK address, postcode or place"
            placeholderTextColor={colors.riderTextMuted}
            autoFocus
            style={pickerStyles.searchInput}
          />
        </View>
        <FlatList
          data={items}
          keyExtractor={(it) => `${it.lat}-${it.lon}`}
          ListEmptyComponent={
            !searching && q.length >= 3 ? (
              <Text style={pickerStyles.empty}>No UK results. Try a postcode or place name.</Text>
            ) : searching ? (
              <ActivityIndicator style={{ marginTop: 24 }} />
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPick({ lat: parseFloat(item.lat), lng: parseFloat(item.lon), address: item.display_name })}
              style={pickerStyles.item}
            >
              <Ionicons name="location-outline" size={18} color={colors.riderText} />
              <Text style={pickerStyles.itemText} numberOfLines={2}>{item.display_name}</Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

function IconBtn({ icon, onPress, testID }) {
  return (
    <Pressable onPress={onPress} testID={testID} style={iconBtnStyles.btn}>
      <Ionicons name={icon} size={20} color={colors.black} />
    </Pressable>
  );
}

const iconBtnStyles = StyleSheet.create({
  btn: {
    width: 40, height: 40,
    borderWidth: 2, borderColor: colors.black,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  greetCard: {
    backgroundColor: colors.white,
    borderWidth: 2, borderColor: colors.black,
    paddingHorizontal: 12, paddingVertical: 8,
    minWidth: 140,
  },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.riderTextMuted },
  greetName: { fontSize: 14, fontWeight: '900', letterSpacing: -0.4, color: colors.black, marginTop: 2 },

  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.white,
    borderTopWidth: 2, borderTopColor: colors.black,
    maxHeight: '70%',
  },
  handle: { alignSelf: 'center', width: 48, height: 4, backgroundColor: colors.black, marginBottom: 16 },
  h2: { fontSize: 26, fontWeight: '900', letterSpacing: -1, marginBottom: 16 },
  locRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 2, borderColor: colors.black,
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  locText: { flex: 1, fontSize: 14, color: colors.black, fontWeight: '500' },
  locPlaceholder: { color: colors.riderTextMuted, fontWeight: '400' },

  vehicleRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  vehicleCard: {
    flex: 1, padding: 12,
    borderWidth: 2, borderColor: colors.black,
    backgroundColor: colors.white,
  },
  vehicleCardActive: { backgroundColor: colors.riderCta, borderColor: colors.riderCta },
  vehicleLabel: { fontSize: 14, fontWeight: '900', letterSpacing: -0.4, marginTop: 8 },
  vehicleEta: { fontSize: 10, color: colors.riderTextMuted, marginTop: 2 },
  vehicleFare: { fontSize: 18, fontWeight: '900', letterSpacing: -0.6, marginTop: 4, color: colors.black },

  payRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  payBtn: { flex: 1, paddingVertical: 12, borderWidth: 2, borderColor: colors.black, alignItems: 'center', backgroundColor: colors.white },
  payBtnActive: { backgroundColor: colors.black },
  payText: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4, color: colors.black },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 12 },
  infoMuted: { color: colors.riderTextMuted, fontSize: 13 },
  infoBold: { fontWeight: '800', fontSize: 13, color: colors.black },

  empty: {
    marginTop: 16, padding: 20,
    borderWidth: 2, borderStyle: 'dashed', borderColor: colors.riderBorder,
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
  },
  emptyText: { color: colors.riderTextMuted, fontSize: 13 },
});

const pickerStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.riderBorder },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: colors.black, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 16, color: colors.black, paddingVertical: 14 },
  inputBox: { flex: 1 },
  empty: { textAlign: 'center', marginTop: 24, color: colors.riderTextMuted },
  item: { flexDirection: 'row', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.riderBorder },
  itemText: { flex: 1, fontSize: 14, color: colors.black },
});
