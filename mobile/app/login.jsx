import { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Alert,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
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

  const [step, setStep]       = useState(1);
  const [phone, setPhone]     = useState('+44');
  const [code, setCode]       = useState('');
  const [devCode, setDevCode] = useState(null);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!phone.startsWith('+') || phone.length < 8) {
      Alert.alert('Invalid number', 'Use E.164 format e.g. +447424011420');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/send-otp', { phone });
      if (data.dev_code) {
        setDevCode(data.dev_code);
        Alert.alert('Dev OTP', `Code: ${data.dev_code}`);
      } else {
        setDevCode(null);
      }
      setStep(2);
    } catch (e) {
      Alert.alert('Failed', e?.response?.data?.detail || 'Could not send code');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (code.length < 4) return Alert.alert('Invalid', 'Enter the 6-digit code');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, code });
      await login(data.token, data.user);
      if (data.needs_onboarding) {
        router.replace({
          pathname: '/onboarding',
          params: intendedRole ? { role: intendedRole } : {},
        });
      } else {
        router.replace(data.user.role === 'driver' ? '/driver' : '/rider');
      }
    } catch (e) {
      Alert.alert('Failed', e?.response?.data?.detail || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => (step === 2 ? setStep(1) : router.back())}
            style={styles.back}
            testID="login-back-btn"
          >
            <Ionicons name="chevron-back" size={20} color={colors.riderTextMuted} />
          </Pressable>

          <View style={styles.body}>
            <Text style={styles.h1}>
              {step === 1 ? "What's your\nnumber?" : 'Enter the\ncode.'}
            </Text>

            <Text style={styles.sub}>
              {step === 1
                ? "We'll send a one-time SMS code to verify."
                : devCode
                  ? `Sent to ${phone}. Dev code: ${devCode}`
                  : `Sent to ${phone}. Check your messages.`}
            </Text>

            {/* Dev code badge */}
            {step === 2 && devCode && (
              <View style={styles.devBadge}>
                <Ionicons name="bug-outline" size={14} color={colors.riderCta} />
                <Text style={styles.devCode}>DEV CODE: {devCode}</Text>
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
                <View style={{ height: 20 }} />
                <Button
                  title="Continue"
                  onPress={send}
                  loading={loading}
                  testID="send-otp-btn"
                />
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
                  style={{ marginTop: 4 }}
                />
                <View style={{ height: 20 }} />
                <Button
                  title="Verify"
                  onPress={verify}
                  loading={loading}
                  testID="verify-otp-btn"
                />
                <Pressable
                  onPress={send}
                  style={styles.resendRow}
                  testID="resend-otp-btn"
                >
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
  back: { padding: 20 },
  body: { paddingHorizontal: 24, paddingBottom: 40 },
  h1: {
    fontSize: 36, fontWeight: '900', letterSpacing: -1.2,
    lineHeight: 40, color: colors.riderText, marginBottom: 12,
  },
  sub: { fontSize: 15, color: colors.riderTextMuted, marginBottom: 28, lineHeight: 22 },
  devBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1, borderColor: colors.riderCta,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 20,
  },
  devCode: { fontSize: 15, fontWeight: '800', letterSpacing: 2, color: colors.riderCta },
  resendRow: { alignSelf: 'center', marginTop: 16 },
  resend: { fontSize: 14, color: colors.riderTextMuted, textDecorationLine: 'underline' },
});
