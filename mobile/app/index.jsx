import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../lib/theme';
import Button from '../components/Button';

export default function Landing() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    // FIX: removed dob check — only role and first_name required now
    if (!user.role || !user.first_name) {
      router.replace('/onboarding');
    } else {
      router.replace(user.role === 'driver' ? '/driver' : '/rider');
    }
  }, [user, loading, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <Ionicons name="car" size={18} color="#FFF" />
            </View>
            <Text style={styles.brandName}>SPEY RIDE</Text>
          </View>
          <Pressable onPress={() => router.push('/login')} testID="header-signin-link">
            <Text style={styles.signin}>SIGN IN</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>AVIEMORE · CAIRNGORMS · THE HIGHLANDS</Text>
          <Text style={styles.h1}>The Highlands,</Text>
          <Text style={[styles.h1, { color: colors.riderCta }]}>on demand.</Text>
          <Text style={styles.body}>
            Local taxis from Aviemore to Inverness, Cairngorm Mountain, Loch Morlich and beyond.
            Tap, ride, pay — no fluff, just transit.
          </Text>

          <View style={styles.cta}>
            <Button
              title="Book a taxi"
              onPress={() => router.push({ pathname: '/login', params: { role: 'rider' } })}
              variant="primary"
              testID="cta-book-ride"
              icon={<Ionicons name="arrow-forward" size={18} color="#FFF" />}
            />
            <View style={{ height: 12 }} />
            <Button
              title="Drive & earn"
              onPress={() => router.push({ pathname: '/login', params: { role: 'driver' } })}
              variant="dark"
              testID="cta-drive"
              icon={<Ionicons name="arrow-forward" size={18} color={colors.driverCta} />}
            />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>COVERAGE</Text>
            <Text style={styles.statValue}>Aviemore +30mi</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>AVG PICKUP</Text>
            <Text style={styles.statValue}>6 min</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>DRIVER SPLIT</Text>
            <Text style={styles.statValue}>85%</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { flexGrow: 1, justifyContent: 'space-between' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: {
    width: 32, height: 32,
    backgroundColor: colors.riderCta,
    alignItems: 'center', justifyContent: 'center',
  },
  brandName: { fontSize: 18, fontWeight: '900', letterSpacing: -1 },
  signin: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: colors.riderCta },

  hero: { paddingHorizontal: 24, paddingVertical: 40 },
  eyebrow: {
    fontSize: 11, fontWeight: '700', letterSpacing: 2.4,
    color: colors.riderTextMuted, marginBottom: 18,
  },
  h1: { fontSize: 56, fontWeight: '900', letterSpacing: -2, lineHeight: 56, color: colors.riderText },
  body: { fontSize: 17, color: colors.riderTextMuted, lineHeight: 26, marginTop: 24 },
  cta: { marginTop: 36 },

  statsRow: {
    borderTopWidth: 1,
    borderTopColor: colors.riderBorder,
    paddingHorizontal: 24,
    paddingVertical: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: { flex: 1 },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.riderTextMuted, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '900', letterSpacing: -0.6 },
});
