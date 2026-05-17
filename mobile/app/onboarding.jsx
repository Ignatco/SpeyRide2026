import { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Alert,
  ScrollView, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors } from '../lib/theme';
import Button from '../components/Button';

export default function Onboarding() {
  const router = useRouter();
  const { setUser } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [loading,   setLoading]   = useState(false);

  // Skip — go straight to rider home without saving anything
  const skip = () => router.replace('/rider');

  const save = async () => {
    if (!firstName.trim()) {
      return Alert.alert('Missing', 'Enter at least your first name');
    }
    setLoading(true);
    try {
      const { data } = await api.patch('/auth/profile', {
        first_name: firstName.trim(),
        last_name:  lastName.trim()  || null,
        email:      email.trim()     || null,
      });
      setUser(data.user);
      router.replace('/rider');
    } catch (e) {
      Alert.alert('Failed', e?.response?.data?.detail || 'Could not save profile');
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

          {/* Skip button top-right */}
          <View style={styles.topRow}>
            <View />
            <Pressable onPress={skip} testID="onboarding-skip-btn" style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
              <Ionicons name="close" size={16} color={colors.riderTextMuted} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <Text style={styles.h1}>What's your{'\n'}name?</Text>
            <Text style={styles.sub}>You can update this anytime in settings.</Text>

            {/* First name */}
            <Text style={styles.label}>FIRST NAME</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Alex"
              placeholderTextColor={colors.riderTextMuted}
              style={styles.input}
              testID="onboarding-firstname-input"
              autoCapitalize="words"
              autoFocus
            />

            {/* Last name */}
            <Text style={styles.label}>
              LAST NAME <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Morgan"
              placeholderTextColor={colors.riderTextMuted}
              style={[styles.input, styles.inputOptional]}
              testID="onboarding-lastname-input"
              autoCapitalize="words"
            />

            {/* Email */}
            <Text style={styles.label}>
              EMAIL <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="alex@example.com"
              placeholderTextColor={colors.riderTextMuted}
              style={[styles.input, styles.inputOptional]}
              testID="onboarding-email-input"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={{ height: 24 }} />
            <Button
              title="Continue"
              onPress={save}
              loading={loading}
              testID="onboarding-submit-btn"
            />

            <Pressable onPress={skip} style={styles.skipBelow}>
              <Text style={styles.skipBelowText}>Skip for now</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { flexGrow: 1 },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 12,
  },
  skipBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  skipText: { fontSize: 14, color: colors.riderTextMuted, fontWeight: '600' },
  body: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16 },
  h1: {
    fontSize: 34, fontWeight: '900', letterSpacing: -1,
    lineHeight: 38, color: colors.riderText, marginBottom: 10,
  },
  sub: { fontSize: 15, color: colors.riderTextMuted, marginBottom: 32, lineHeight: 22 },
  label: {
    fontSize: 10, fontWeight: '700', letterSpacing: 2,
    color: colors.riderTextMuted, marginBottom: 8,
  },
  optional: { fontSize: 10, fontWeight: '400', color: colors.riderTextMuted, letterSpacing: 0 },
  input: {
    borderWidth: 2, borderColor: colors.black,
    paddingHorizontal: 16, paddingVertical: 16,
    fontSize: 17, fontWeight: '600',
    color: colors.black, backgroundColor: colors.white,
    marginBottom: 20,
  },
  inputOptional: { borderColor: colors.riderBorder },
  skipBelow: { alignSelf: 'center', marginTop: 16 },
  skipBelowText: {
    fontSize: 14, color: colors.riderTextMuted,
    textDecorationLine: 'underline',
  },
});
