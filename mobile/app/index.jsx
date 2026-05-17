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
    // No name required — any logged-in user goes straight to dashboard
    router.replace(user.role === 'driver' ? '/driver' : '/rider');
  }, [user, loading, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <Ionicons name="car" size={18} color="#FFF" />
            </View>
            <Text style={styles.brandName}>Spey Ride</Text>
          </View>
          <Pressable onPress={() => router.push('/login')} testID="header-signin-link">
            <Text style={styles.signIn}>Sign in</Text>
          </Pressable>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>AVIEMORE · CAIRNGORMS · HIGHLANDS</Text>
          <Text style={styles.h1}>Go anywhere,</Text>
          <Text style={[styles.h1, { color: colors.riderCta }]}>anytime.</Text>
          <Text style={styles.body}>
            Local taxis across the Highlands. Tap, ride, pay — no surprises.
          </Text>

          <View style={styles.cta}>
            <Button
              title="Get started"
              onPress={() => router.push('/login')}
              variant="primary"
              testID="cta-book-ride"
            />
            {/* Driver sign-up — subtle text link, not a button */}
            <Pressable
              onPress={() => router.push({ pathname: '/login', params: { role: 'driver' } })}
              style={styles.driverLink}
              testID="cta-drive"
            >
              <Text style={styles.driverLinkText}>
                Want to drive?{' '}
                <Text style={styles.driverLinkUnderline}>Sign up to drive</Text>
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>COVERAGE</Text>
            <Text style={styles.statValue}>30+ mi</Text>
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
  safe: { flex: 1, backgroundColor: colors.black },
  scroll: { flexGrow: 1 },
  header: {
    paddingHorizontal: 24, paddingTop: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: {
    width: 32, height: 32,
    backgroundColor: colors.riderCta,
    alignItems: 'center', justifyContent: 'center',
  },
  brandName: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5, color: colors.white },
  signIn: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },

  hero: { paddingHorizontal: 24, paddingVertical: 48, flex: 1 },
  eyebrow: {
    fontSize: 10, fontWeight: '700', letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.4)', marginBottom: 20,
  },
  h1: { fontSize: 52, fontWeight: '900', letterSpacing: -2, lineHeight: 54, color: colors.white },
  body: {
    fontSize: 16, color: 'rgba(255,255,255,0.5)',
    lineHeight: 24, marginTop: 20, marginBottom: 40, maxWidth: 280,
  },
  cta: { gap: 0 },
  driverLink: { marginTop: 20, alignSelf: 'center' },
  driverLinkText: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  driverLinkUnderline: { color: 'rgba(255,255,255,0.6)', textDecorationLine: 'underline' },

  statsRow: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24, paddingVertical: 28,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  stat: { flex: 1 },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: 'rgba(255,255,255,0.35)', marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5, color: colors.white },
});
