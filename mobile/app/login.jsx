import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors } from '../lib/theme';
import Input from '../components/Input';
import Button from '../components/Button';

export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const intendedRole = params.role;
  const { login } = useAuth();

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('+44');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState(null); // FIX: persist dev code in state
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!phone.startsWith('+') || phone.length < 8) {
      Alert.alert('Invalid', 'Phone must be in E.164 format e.g. +447424011420');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/send-otp', { phone });
      if (data.dev_code) {
        // FIX: store dev_code in state so it stays visible on step 2
        setDevCode(data.dev_code);
        Alert.alert('Dev OTP', `Code: ${data.dev_code}`);
      } else {
        setDevCode(null);
      }
      setStep(2);
    } catch (e) {
      console.log('[send-otp] FAILED', {
        message: e?.message,
        code: e?.code,
        status: e?.response?.status,
        data: e?.response?.data,
        url: e?.config?.url,
        baseURL: e?.config?.baseURL,
      });
      Alert.alert(
        'Failed',
        e?.response?.data?.detail ||
          `Could not send OTP\n${e?.message || ''}`.trim()
      );
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (code.length < 4) return Alert.alert('Invalid', 'Enter the OTP code');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, code });
      await login(data.token, data.user);
      if (data.needs_profile) {
        router.replace({ pathname: '/onboarding', params: intendedRole ? { role: intendedRole } : {} });
      } else {
        router.replace(data.user.role === 'driver' ? '/driver' : '/rider');
      }
    } catch (e) {
      Alert.alert('Failed', e.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => (step === 2 ? setStep(1) : router.back())}
            style={styles.backRow}
            testID="login-back-btn"
          >
            <Ionicons name="chevron-back" size={18} color={colors.riderTextMuted} />
            <Text style={styles.backText}>BACK</Text>
          </Pressable>

          <View style={styles.body}>
            <Text style={styles.eyebrow}>{step === 1 ? 'STEP 01 / PHONE' : 'STEP 02 / VERIFY'}</Text>
            <Text style={styles.h1}>{step === 1 ? "What's your\nnumber?" : 'Enter the\ncode.'}</Text>
            <Text style={styles.subtitle}>
              {step === 1
                ? "We'll send a one-time SMS code to verify your line."
                : devCode
                  // FIX: show dev code inline so user doesn't have to remember it
                  ? `Sent to ${phone}. Dev code: ${devCode}`
                  : `Sent to ${phone}. Check your messages.`}
            </Text>

            {/* FIX: show dev code badge on step 2 if available */}
            {step === 2 && devCode && (
              <View style={styles.devBadge}>
                <Ionicons name="bug-outline" size={14} color={colors.riderCta} />
                <Text style={styles.devBadgeText}>DEV CODE: {devCode}</Text>
              </View>
            )}

            {step === 1 ? (
              <>
                <Input
                  label="Phone number"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+447424011420"
                  keyboardType="phone-pad"
                  testID="phone-input"
                />
                <View style={{ height: 24 }} />
                <Button title="Send code" onPress={send} loading={loading} testID="send-otp-btn" />
              </>
            ) : (
              <>
                <Input
                  label="6-digit code"
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  testID="otp-input"
                  style={{ marginTop: 12 }}
                />
                <View style={{ height: 24 }} />
                <Button title="Verify & continue" onPress={verify} loading={loading} testID="verify-otp-btn" />
                <Pressable onPress={send} style={{ alignSelf: 'center', marginTop: 12 }} testID="resend-otp-btn">
                  <Text style={styles.resend}>Resend code</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { flexGrow: 1 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 24 },
  backText: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: colors.riderTextMuted },
  body: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: colors.riderCta, marginBottom: 12 },
  h1: { fontSize: 44, fontWeight: '900', letterSpacing: -1.6, lineHeight: 44, color: colors.riderText },
  subtitle: { fontSize: 16, color: colors.riderTextMuted, marginTop: 16, marginBottom: 16 },
  devBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1, borderColor: colors.riderCta,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 16,
  },
  devBadgeText: { fontSize: 15, fontWeight: '800', letterSpacing: 2, color: colors.riderCta },
  resend: { fontSize: 14, color: colors.riderTextMuted, textDecorationLine: 'underline' },
});
