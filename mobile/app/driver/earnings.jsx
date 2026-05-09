import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { colors } from '../../lib/theme';

export default function DriverEarnings() {
  const router = useRouter();
  const [rides, setRides] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/rides/my');
        setRides(data.rides.filter((r) => r.status === 'completed'));
      } catch {}
    })();
  }, []);

  const today = rides.filter((r) => {
    const d = new Date(r.completed_at || r.created_at);
    return d.toDateString() === new Date().toDateString();
  });
  const todayEarn = today.reduce((s, r) => s + r.fare, 0);
  const total = rides.reduce((s, r) => s + r.fare, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.driverBg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()} style={styles.backRow} testID="earnings-back-btn">
          <Ionicons name="chevron-back" size={18} color={colors.driverTextMuted} />
          <Text style={styles.backText}>BACK</Text>
        </Pressable>

        <Text style={styles.eyebrow}>EARNINGS</Text>
        <Text style={styles.h1}>Your money.</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TODAY</Text>
            <Text style={styles.statValue} testID="earnings-today">£{todayEarn.toFixed(2)}</Text>
            <Text style={styles.statSub}>{today.length} trips</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ALL TIME</Text>
            <Text style={styles.statValue} testID="earnings-total">£{total.toFixed(2)}</Text>
            <Text style={styles.statSub}>{rides.length} trips</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 }}>
          <Ionicons name="trending-up" size={16} color={colors.driverCta} />
          <Text style={styles.eyebrow}>RECENT TRIPS</Text>
        </View>

        {rides.length === 0 ? (
          <View style={styles.dashed} testID="earnings-empty">
            <Text style={{ color: colors.driverTextMuted, fontSize: 13 }}>No completed trips yet.</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }} testID="earnings-list">
            {rides.map((r) => (
              <View key={r.id} style={styles.tripRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripDate}>{new Date(r.completed_at || r.created_at).toLocaleString('en-GB')}</Text>
                  <Text style={styles.tripDest} numberOfLines={1}>{r.drop_address}</Text>
                </View>
                <Text style={styles.tripFare}>£{r.fare.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 24 },
  backText: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: colors.driverTextMuted },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.driverCta },
  h1: { fontSize: 44, fontWeight: '900', letterSpacing: -1.6, color: colors.driverText, marginTop: 8, marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, borderWidth: 2, borderColor: colors.driverBorder, backgroundColor: colors.driverSurface, padding: 14 },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.driverTextMuted },
  statValue: { fontSize: 28, fontWeight: '900', letterSpacing: -1, color: colors.driverCta, marginTop: 4 },
  statSub: { fontSize: 11, color: colors.driverTextMuted, marginTop: 4 },
  dashed: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.driverBorder, padding: 30, alignItems: 'center' },
  tripRow: { borderWidth: 2, borderColor: colors.driverBorder, backgroundColor: colors.driverSurface, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tripDate: { fontSize: 11, color: colors.driverTextMuted },
  tripDest: { fontSize: 13, color: colors.driverText, fontWeight: '500', marginTop: 2 },
  tripFare: { fontSize: 18, fontWeight: '900', letterSpacing: -0.6, color: colors.driverCta },
});
