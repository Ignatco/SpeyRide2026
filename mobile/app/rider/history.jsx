import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { colors } from '../../lib/theme';

export default function RiderHistory() {
  const router = useRouter();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/rides/my');
        setRides(data.rides);
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={['top']}>
      <Pressable onPress={() => router.back()} style={styles.backRow} testID="history-back-btn">
        <Ionicons name="chevron-back" size={18} color={colors.riderTextMuted} />
        <Text style={styles.backText}>BACK</Text>
      </Pressable>
      <View style={{ paddingHorizontal: 24 }}>
        <Text style={styles.eyebrow}>ARCHIVE</Text>
        <Text style={styles.h1}>Ride history</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : rides.length === 0 ? (
        <View style={styles.empty} testID="history-empty">
          <Ionicons name="location-outline" size={36} color={colors.riderTextMuted} />
          <Text style={styles.emptyText}>No rides yet.</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          testID="history-list"
          renderItem={({ item }) => (
            <View style={styles.card} testID={`history-item-${item.id}`}>
              <View style={styles.cardTop}>
                <Text style={styles.eyebrow}>{new Date(item.created_at).toLocaleDateString('en-GB')}</Text>
                <Text style={[styles.statusTag, statusColor(item.status)]}>{item.status.toUpperCase()}</Text>
              </View>
              <Text style={styles.line} numberOfLines={1}>↑ {item.pickup_address}</Text>
              <Text style={styles.line} numberOfLines={1}>↓ {item.drop_address}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.muted}>{item.distance_km} km · {item.vehicle_class}</Text>
                <Text style={styles.fare}>£{item.fare.toFixed(2)}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function statusColor(s) {
  if (s === 'completed') return { color: colors.success };
  if (s === 'cancelled') return { color: colors.danger };
  return { color: colors.riderCta };
}

const styles = StyleSheet.create({
  backRow: { flexDirection: 'row', gap: 6, padding: 24, alignItems: 'center' },
  backText: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: colors.riderTextMuted },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.riderCta },
  h1: { fontSize: 44, fontWeight: '900', letterSpacing: -1.6, marginTop: 8, marginBottom: 24, color: colors.black },
  empty: { alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { color: colors.riderTextMuted, fontSize: 14 },
  card: { borderWidth: 2, borderColor: colors.black, padding: 14, marginBottom: 12, backgroundColor: colors.white },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statusTag: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  line: { fontSize: 13, color: colors.black, fontWeight: '500', marginVertical: 2 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.riderBorder },
  muted: { fontSize: 12, color: colors.riderTextMuted },
  fare: { fontSize: 18, fontWeight: '900', letterSpacing: -0.6, color: colors.black },
});
