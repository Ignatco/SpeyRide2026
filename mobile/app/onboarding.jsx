import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors } from '../lib/theme';
import Input from '../components/Input';
import Button from '../components/Button';

const DEFAULT_DOB = new Date(2000, 0, 1); // Jan 1, 2000

function formatDOB(d) {
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function toISO(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function Onboarding() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setUser } = useAuth();

  const [role, setRole] = useState(params.role || '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [vMake, setVMake] = useState('');
  const [vModel, setVModel] = useState('');
  const [vPlate, setVPlate] = useState('');
  const [vClass, setVClass] = useState('sedan');
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const maxDOB = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
  const minDOB = new Date(today.getFullYear() - 100, 0, 1);

  const onPickDate = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event?.type === 'dismissed') return;
    if (selectedDate) setDob(selectedDate);
  };

  const submit = async () => {
    if (!role) return Alert.alert('Choose role', 'Pick Rider or Driver');
    if (!firstName.trim()) return Alert.alert('Missing', 'Enter first name');
    if (!lastName.trim()) return Alert.alert('Missing', 'Enter last name');
    if (!dob) return Alert.alert('Missing', 'Enter date of birth');
    if (role === 'driver' && (!vMake || !vModel || !vPlate)) {
      return Alert.alert('Missing', 'Complete vehicle details');
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/complete-profile', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        dob: toISO(dob),
        role,
        vehicle_make: vMake || null,
        vehicle_model: vModel || null,
        vehicle_plate: vPlate || null,
        vehicle_class: role === 'driver' ? vClass : null,
      });
      setUser(data.user);
      router.replace(role === 'driver' ? '/driver' : '/rider');
    } catch (e) {
      Alert.alert('Failed', e.response?.data?.detail || 'Could not save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>STEP 03 / PROFILE</Text>
          <Text style={styles.h1}>Create your{'\n'}account.</Text>

          <View style={styles.rolesRow}>
            <RoleCard
              active={role === 'rider'}
              onPress={() => setRole('rider')}
              testID="role-rider-btn"
              icon="person"
              title="Rider"
              subtitle="Book taxis"
              variant="rider"
            />
            <RoleCard
              active={role === 'driver'}
              onPress={() => setRole('driver')}
              testID="role-driver-btn"
              icon="car-sport"
              title="Driver"
              subtitle="Earn locally"
              variant="driver"
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 24 }}>
            <Input
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Alex"
              testID="onboarding-firstname-input"
              style={{ flex: 1 }}
              autoCapitalize="words"
            />
            <Input
              label="Last name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Morgan"
              testID="onboarding-lastname-input"
              style={{ flex: 1 }}
              autoCapitalize="words"
            />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 24 }]}>DATE OF BIRTH</Text>
          <Pressable
            onPress={() => setShowPicker(true)}
            style={styles.dobBtn}
            testID="onboarding-dob-btn"
          >
            <Ionicons name="calendar-outline" size={20} color={colors.black} />
            <Text style={[styles.dobText, !dob && { color: colors.riderTextMuted }]}>
              {dob ? formatDOB(dob) : 'DD / MM / YYYY'}
            </Text>
          </Pressable>
          {showPicker && (
            <DateTimePicker
              value={dob || DEFAULT_DOB}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onPickDate}
              maximumDate={maxDOB}
              minimumDate={minDOB}
              style={Platform.OS === 'ios' ? { height: 180 } : undefined}
            />
          )}
          {Platform.OS === 'ios' && showPicker && (
            <Pressable onPress={() => setShowPicker(false)} style={styles.doneBtn} testID="dob-done-btn">
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          )}
          <Text style={styles.helper}>
            {role === 'driver'
              ? 'Drivers must be 21 or older'
              : 'Riders must be 16 or older'}
          </Text>

          {role === 'driver' && (
            <View style={styles.driverSection}>
              <Text style={styles.eyebrow}>VEHICLE DETAILS</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Input value={vMake} onChangeText={setVMake} placeholder="Make (Toyota)" testID="vehicle-make-input" style={{ flex: 1 }} />
                <Input value={vModel} onChangeText={setVModel} placeholder="Model (Camry)" testID="vehicle-model-input" style={{ flex: 1 }} />
              </View>
              <Input
                value={vPlate}
                onChangeText={(v) => setVPlate(v.toUpperCase())}
                placeholder="LICENSE PLATE"
                testID="vehicle-plate-input"
                style={{ marginTop: 12 }}
              />
              <Text style={[styles.eyebrow, { marginTop: 16 }]}>VEHICLE CLASS</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['mini', 'sedan', 'suv'].map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setVClass(c)}
                    testID={`vehicle-class-${c}-btn`}
                    style={[styles.classBtn, vClass === c && styles.classBtnActive]}
                  >
                    <Text style={[styles.classBtnText, vClass === c && { color: colors.white }]}>{c.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 32 }} />
          <Button title="Create account" onPress={submit} loading={loading} testID="onboarding-submit-btn" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RoleCard({ active, onPress, testID, icon, title, subtitle, variant }) {
  const isDriver = variant === 'driver';
  const activeBg = isDriver ? colors.black : colors.riderCta;
  const activeFg = isDriver ? colors.driverCta : colors.white;
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={[
        styles.roleCard,
        { backgroundColor: active ? activeBg : colors.white, borderColor: active ? activeBg : colors.black },
      ]}
    >
      <Ionicons name={icon} size={28} color={active ? activeFg : colors.black} />
      <Text style={[styles.roleTitle, { color: active ? activeFg : colors.black }]}>{title}</Text>
      <Text style={[styles.roleSub, { color: active ? activeFg : colors.riderTextMuted }]}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: colors.riderCta, marginBottom: 12 },
  h1: { fontSize: 44, fontWeight: '900', letterSpacing: -1.6, lineHeight: 44, marginBottom: 24 },
  rolesRow: { flexDirection: 'row', gap: 10 },
  roleCard: { flex: 1, padding: 20, borderWidth: 2 },
  roleTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.6, marginTop: 12 },
  roleSub: { fontSize: 12, marginTop: 4 },

  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: colors.riderTextMuted, marginBottom: 8 },
  dobBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 2, borderColor: colors.black,
    paddingHorizontal: 16, paddingVertical: 18,
    backgroundColor: colors.white,
  },
  dobText: { fontSize: 18, fontWeight: '600', color: colors.black, fontVariant: ['tabular-nums'] },
  doneBtn: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
  doneText: { color: colors.riderCta, fontWeight: '700', letterSpacing: 1 },
  helper: { fontSize: 12, color: colors.riderTextMuted, marginTop: 8 },

  driverSection: { marginTop: 24, paddingTop: 24, borderTopWidth: 2, borderTopColor: colors.black, gap: 12 },
  classBtn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: colors.black,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  classBtnActive: { backgroundColor: colors.riderCta, borderColor: colors.riderCta },
  classBtnText: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
});
