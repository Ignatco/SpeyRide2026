import { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Alert,
  ScrollView, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors } from '../lib/theme';

const VEHICLE_CLASSES = ['mini', 'sedan', 'suv'];

export default function Onboarding() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const intendedRole = params.role;
  const { setUser } = useAuth();

  const [role, setRole] = useState(intendedRole || '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [vMake, setVMake] = useState('');
  const [vModel, setVModel] = useState('');
  const [vPlate, setVPlate] = useState('');
  const [vClass, setVClass] = useState('sedan');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!role) return Alert.alert('Missing', 'Choose Rider or Driver');
    if (!firstName.trim()) return Alert.alert('Missing', 'Enter your first name');
    if (!lastName.trim()) return Alert.alert('Missing', 'Enter your last name');
    if (role === 'driver') {
      if (!vMake.trim()) return Alert.alert('Missing', 'Enter vehicle make');
      if (!vModel.trim()) return Alert.alert('Missing', 'Enter vehicle model');
      if (!vPlate.trim()) return Alert.alert('Missing', 'Enter license plate');
    }

    setLoading(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role,
      };
      if (role === 'driver') {
        payload.vehicle_make = vMake.trim();
        payload.vehicle_model = vModel.trim();
        payload.vehicle_plate = vPlate.trim().toUpperCase();
        payload.vehicle_class = vClass;
      }

      const { data } = await api.post('/auth/complete-profile', payload);
      setUser(data.user);
      router.replace(role === 'driver' ? '/driver' : '/rider');
    } catch (e) {
      Alert.alert('Failed', e.response?.data?.detail || 'Could not create profile. Try again.');
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
          <Pressable onPress={() => router.back()} style={styles.backRow} testID="onboarding-back-btn">
            <Ionicons name="chevron-back" size={18} color={colors.riderTextMuted} />
            <Text style={styles.backText}>BACK</Text>
          </Pressable>

          <View style={styles.body}>
            <Text style={styles.eyebrow}>STEP 02 / PROFILE</Text>
            <Text style={styles.h1}>Create your{'\n'}account.</Text>

            {/* Role selector */}
            <View style={styles.roleRow}>
              <Pressable
                onPress={() => setRole('rider')}
                testID="role-rider-btn"
                style={[styles.roleCard, role === 'rider' && styles.roleCardActiveBlue]}
              >
                <Ionicons
                  name="person"
                  size={28}
                  color={role === 'rider' ? colors.white : colors.black}
                />
                <Text style={[styles.roleLabel, role === 'rider' && { color: colors.white }]}>
                  Rider
                </Text>
                <Text style={[styles.roleSub, role === 'rider' && { color: 'rgba(255,255,255,0.75)' }]}>
                  Book taxis
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setRole('driver')}
                testID="role-driver-btn"
                style={[styles.roleCard, role === 'driver' && styles.roleCardActiveDark]}
              >
                <Ionicons
                  name="car"
                  size={28}
                  color={role === 'driver' ? colors.driverCta : colors.black}
                />
                <Text style={[styles.roleLabel, role === 'driver' && { color: colors.driverCta }]}>
                  Driver
                </Text>
                <Text style={[styles.roleSub, role === 'driver' && { color: 'rgba(223,255,0,0.7)' }]}>
                  Earn locally
                </Text>
              </Pressable>
            </View>

            {/* Name */}
            <View style={styles.nameRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>FIRST NAME</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Alex"
                  placeholderTextColor={colors.riderTextMuted}
                  style={styles.input}
                  testID="onboarding-firstname-input"
                  autoCapitalize="words"
                />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>LAST NAME</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Morgan"
                  placeholderTextColor={colors.riderTextMuted}
                  style={styles.input}
                  testID="onboarding-lastname-input"
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Driver vehicle fields */}
            {role === 'driver' && (
              <View style={styles.vehicleSection}>
                <Text style={[styles.eyebrow, { color: colors.riderTextMuted, marginBottom: 12 }]}>
                  VEHICLE DETAILS
                </Text>
                <View style={styles.nameRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>MAKE</Text>
                    <TextInput
                      value={vMake}
                      onChangeText={setVMake}
                      placeholder="Toyota"
                      placeholderTextColor={colors.riderTextMuted}
                      style={styles.input}
                      testID="vehicle-make-input"
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={{ width: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>MODEL</Text>
                    <TextInput
                      value={vModel}
                      onChangeText={setVModel}
                      placeholder="Camry"
                      placeholderTextColor={colors.riderTextMuted}
                      style={styles.input}
                      testID="vehicle-model-input"
                      autoCapitalize="words"
                    />
                  </View>
                </View>
                <Text style={[styles.fieldLabel, { marginTop: 10 }]}>LICENSE PLATE</Text>
                <TextInput
                  value={vPlate}
                  onChangeText={(v) => setVPlate(v.toUpperCase())}
                  placeholder="AB12 CDE"
                  placeholderTextColor={colors.riderTextMuted}
                  style={[styles.input, { letterSpacing: 4, fontFamily: 'Menlo' }]}
                  testID="vehicle-plate-input"
                  autoCapitalize="characters"
                />
                <Text style={[styles.fieldLabel, { marginTop: 10, marginBottom: 8 }]}>VEHICLE CLASS</Text>
                <View style={styles.classRow}>
                  {VEHICLE_CLASSES.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setVClass(c)}
                      testID={`vehicle-class-${c}-btn`}
                      style={[styles.classBtn, vClass === c && styles.classBtnActive]}
                    >
                      <Text style={[styles.classBtnText, vClass === c && { color: colors.white }]}>
                        {c.toUpperCase()}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <Pressable
              onPress={submit}
              disabled={loading}
              testID="onboarding-submit-btn"
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            >
              <Text style={styles.submitText}>
                {loading ? 'Creating…' : 'Create account'}
              </Text>
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
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 24 },
  backText: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: colors.riderTextMuted },
  body: { paddingHorizontal: 24, paddingBottom: 40 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: colors.riderCta },
  h1: {
    fontSize: 40, fontWeight: '900', letterSpacing: -1.5,
    lineHeight: 42, color: colors.riderText,
    marginTop: 10, marginBottom: 28,
  },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  roleCard: {
    flex: 1, padding: 20,
    borderWidth: 2, borderColor: colors.black,
    backgroundColor: colors.white,
  },
  roleCardActiveBlue: { backgroundColor: colors.riderCta, borderColor: colors.riderCta },
  roleCardActiveDark: { backgroundColor: colors.black, borderColor: colors.black },
  roleLabel: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5, marginTop: 10, color: colors.black },
  roleSub: { fontSize: 12, color: colors.riderTextMuted, marginTop: 4 },
  nameRow: { flexDirection: 'row', marginBottom: 4 },
  fieldLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 2,
    color: colors.riderTextMuted, marginBottom: 6,
  },
  input: {
    borderWidth: 2, borderColor: colors.black,
    paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 16, fontWeight: '600',
    color: colors.black, backgroundColor: colors.white,
  },
  vehicleSection: {
    borderTopWidth: 2, borderTopColor: colors.black,
    paddingTop: 20, marginTop: 16,
  },
  classRow: { flexDirection: 'row', gap: 8 },
  classBtn: {
    flex: 1, paddingVertical: 12,
    borderWidth: 2, borderColor: colors.black,
    alignItems: 'center', backgroundColor: colors.white,
  },
  classBtnActive: { backgroundColor: colors.riderCta, borderColor: colors.riderCta },
  classBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, color: colors.black },
  submitBtn: {
    marginTop: 32,
    backgroundColor: colors.riderCta,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5, color: colors.white },
});
