import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors } from '../lib/theme';

function Row({ icon, label, value, onPress, danger }) {
  return (
    <Pressable onPress={onPress} style={[styles.row, danger && styles.rowDanger]}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons name={icon} size={20} color={danger ? colors.danger : '#52525B'} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
        {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
      </View>
      {!danger && <Ionicons name="chevron-forward" size={16} color="#D4D4D8" />}
    </Pressable>
  );
}

function SectionTitle({ title }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

export default function AccountSettings() {
  const router = useRouter();
  const { user, setUser, logout } = useAuth();
  const [view, setView] = useState('main');
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName,  setLastName]  = useState(user?.last_name  || '');
  const [email,     setEmail]     = useState(user?.email      || '');
  const [vMake,  setVMake]  = useState(user?.vehicle_make  || '');
  const [vModel, setVModel] = useState(user?.vehicle_model || '');
  const [vPlate, setVPlate] = useState(user?.vehicle_plate || '');
  const [vClass, setVClass] = useState(user?.vehicle_class || 'sedan');

  const [methods,   setMethods]   = useState([]);
  const [defaultPm, setDefaultPm] = useState(user?.default_payment_method_id || null);
  const [pmLoading, setPmLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name   || '');
      setEmail(user.email          || '');
      setVMake(user.vehicle_make   || '');
      setVModel(user.vehicle_model || '');
      setVPlate(user.vehicle_plate || '');
      setVClass(user.vehicle_class || 'sedan');
    }
  }, [user]);

  const loadMethods = useCallback(async () => {
    setPmLoading(true);
    try {
      const { data } = await api.get('/payments/methods');
      setMethods(data.methods || []);
      setDefaultPm(data.default_payment_method_id || null);
    } catch {} finally { setPmLoading(false); }
  }, []);

  useEffect(() => { if (view === 'payments') loadMethods(); }, [view, loadMethods]);

  const saveProfile = async () => {
    if (!firstName.trim()) return Alert.alert('Missing', 'Enter first name');
    setSaving(true);
    try {
      const { data } = await api.patch('/auth/profile', {
        first_name: firstName.trim(),
        last_name:  lastName.trim()  || null,
        email:      email.trim()     || null,
      });
      setUser(data.user);
      Alert.alert('Saved', 'Profile updated');
      setView('main');
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const saveVehicle = async () => {
    if (!vMake.trim() || !vModel.trim() || !vPlate.trim())
      return Alert.alert('Missing', 'Fill in all vehicle fields');
    setSaving(true);
    try {
      const { data } = await api.post('/auth/complete-profile', {
        first_name: user?.first_name || 'Driver',
        last_name:  user?.last_name  || '',
        role: 'driver',
        vehicle_make:  vMake.trim(),
        vehicle_model: vModel.trim(),
        vehicle_plate: vPlate.trim().toUpperCase(),
        vehicle_class: vClass,
      });
      setUser(data.user);
      Alert.alert('Saved', 'Vehicle updated');
      setView('main');
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const deleteMethod = async (pmId) => {
    Alert.alert('Remove card', 'Remove this payment method?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/payments/methods/${pmId}`);
          setMethods(prev => prev.filter(m => m.id !== pmId));
        } catch { Alert.alert('Error', 'Could not remove card'); }
      }},
    ]);
  };

  const setDefault = async (pmId) => {
    try {
      await api.post(`/payments/methods/${pmId}/default`);
      setDefaultPm(pmId);
    } catch { Alert.alert('Error', 'Could not update default'); }
  };

  const backRoute = user?.role === 'driver' ? '/driver' : '/rider';

  // ── Edit profile ──────────────────────────────────────────────────────────
  if (view === 'edit-profile') return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable onPress={() => setView('main')} style={styles.navBack}>
          <Ionicons name="chevron-back" size={22} color={colors.black} />
        </Pressable>
        <Text style={styles.navTitle}>Edit profile</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {[
          { label: 'FIRST NAME', val: firstName, set: setFirstName, placeholder: 'Alex', cap: 'words' },
          { label: 'LAST NAME', val: lastName, set: setLastName, placeholder: 'Morgan', cap: 'words' },
          { label: 'EMAIL', val: email, set: setEmail, placeholder: 'alex@example.com', keyboard: 'email-address', cap: 'none' },
        ].map(f => (
          <View key={f.label} style={{ marginBottom: 16 }}>
            <Text style={styles.fieldLabel}>{f.label}</Text>
            <TextInput
              value={f.val} onChangeText={f.set} placeholder={f.placeholder}
              placeholderTextColor={colors.riderTextMuted}
              keyboardType={f.keyboard || 'default'}
              autoCapitalize={f.cap || 'sentences'}
              style={styles.fieldInput}
            />
          </View>
        ))}
        <Pressable
          onPress={saveProfile} disabled={saving}
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          testID="save-name-btn"
        >
          {saving
            ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.saveBtnText}>Save</Text>
          }
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );

  // ── Edit vehicle ──────────────────────────────────────────────────────────
  if (view === 'edit-vehicle') return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable onPress={() => setView('main')} style={styles.navBack}>
          <Ionicons name="chevron-back" size={22} color={colors.black} />
        </Pressable>
        <Text style={styles.navTitle}>Edit vehicle</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {[
          { label: 'MAKE',  val: vMake,  set: setVMake,  placeholder: 'Toyota' },
          { label: 'MODEL', val: vModel, set: setVModel, placeholder: 'Camry' },
          { label: 'PLATE', val: vPlate, set: (v) => setVPlate(v.toUpperCase()), placeholder: 'AB12 CDE' },
        ].map(f => (
          <View key={f.label} style={{ marginBottom: 16 }}>
            <Text style={styles.fieldLabel}>{f.label}</Text>
            <TextInput
              value={f.val} onChangeText={f.set} placeholder={f.placeholder}
              placeholderTextColor={colors.riderTextMuted}
              autoCapitalize="characters"
              style={styles.fieldInput}
            />
          </View>
        ))}
        <Text style={styles.fieldLabel}>CLASS</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
          {['mini','sedan','suv'].map(c => (
            <Pressable
              key={c} onPress={() => setVClass(c)}
              style={[styles.classBtn, vClass === c && styles.classBtnActive]}
            >
              <Text style={[styles.classBtnText, vClass === c && { color: colors.white }]}>
                {c.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={saveVehicle} disabled={saving}
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          testID="save-vehicle-btn"
        >
          {saving
            ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.saveBtnText}>Save</Text>
          }
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );

  // ── Payment methods ───────────────────────────────────────────────────────
  if (view === 'payments') return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable onPress={() => setView('main')} style={styles.navBack}>
          <Ionicons name="chevron-back" size={22} color={colors.black} />
        </Pressable>
        <Text style={styles.navTitle}>Payment methods</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Apple/Google Pay info */}
        <View style={styles.infoBanner}>
          <Ionicons name="phone-portrait-outline" size={20} color="#52525B" />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Apple Pay & Google Pay</Text>
            <Text style={styles.infoBody}>
              Available at checkout if your device supports it. No setup needed.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>SAVED CARDS</Text>
        {pmLoading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={colors.riderCta} />
        ) : methods.length === 0 ? (
          <Text style={styles.emptyText}>No saved cards yet.</Text>
        ) : (
          methods.map(m => (
            <View key={m.id} style={styles.cardRow}>
              <View style={styles.cardIcon}>
                <Ionicons name="card-outline" size={20} color="#52525B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabel}>
                  {m.wallet || m.brand} •••• {m.last4}
                  {m.id === defaultPm && <Text style={styles.defaultTag}> Default</Text>}
                </Text>
                <Text style={styles.cardSub}>
                  {m.wallet ? m.wallet : `Exp ${m.exp_month}/${m.exp_year}`}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                {m.id !== defaultPm && (
                  <Pressable onPress={() => setDefault(m.id)}>
                    <Text style={styles.setDefaultText}>Set default</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => deleteMethod(m.id)}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Pressable
          style={styles.addCardBtn}
          onPress={() => Alert.alert('Add card', 'Card setup coming in next release')}
          testID="add-card-btn"
        >
          <Ionicons name="add" size={20} color="#52525B" />
          <Text style={styles.addCardText}>Add card</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.push(backRoute)} style={styles.navBack} testID="settings-back-btn">
          <Ionicons name="chevron-back" size={22} color={colors.black} />
        </Pressable>
        <Text style={styles.navTitle}>Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView>
        {/* Profile hero */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.first_name?.[0] || user?.phone?.[3] || '?').toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>{user?.name || user?.phone || '—'}</Text>
            <Text style={styles.heroPhone}>{user?.phone}</Text>
            <View style={styles.heroMeta}>
              <Ionicons name="star" size={12} color={colors.black} />
              <Text style={styles.heroMetaText}>{(user?.rating || 5).toFixed(1)}</Text>
              <Text style={styles.heroDot}>·</Text>
              <Text style={styles.heroMetaText}>{user?.rides_count || 0} trips</Text>
              <Text style={styles.heroDot}>·</Text>
              <View style={[styles.roleBadge, user?.role === 'driver' && styles.roleBadgeDriver]}>
                <Text style={[styles.roleBadgeText, user?.role === 'driver' && { color: colors.driverCta }]}>
                  {user?.role || 'rider'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <SectionTitle title="ACCOUNT" />
        <Row icon="person-outline"     label="Name"  value={user?.name  || 'Not set'} onPress={() => setView('edit-profile')} testID="edit-name-btn" />
        <Row icon="mail-outline"       label="Email" value={user?.email || 'Not set'} onPress={() => setView('edit-profile')} />
        <Row icon="call-outline"       label="Phone" value={user?.phone}              onPress={() => Alert.alert('Phone', 'Phone number cannot be changed')} />

        <SectionTitle title="PAYMENT" />
        <Row
          icon="card-outline"
          label="Payment methods"
          value={methods.length > 0 ? `${methods.length} card${methods.length > 1 ? 's' : ''} saved` : 'Apple Pay, Google Pay, card'}
          onPress={() => setView('payments')}
          testID="payment-methods-btn"
        />

        {user?.role === 'driver' && <>
          <SectionTitle title="VEHICLE" />
          <Row
            icon="car-outline"
            label="Your vehicle"
            value={`${user.vehicle_make || ''} ${user.vehicle_model || ''} · ${(user.vehicle_plate || '').toUpperCase()}`}
            onPress={() => setView('edit-vehicle')}
            testID="edit-vehicle-btn"
          />
          <SectionTitle title="EARNINGS" />
          <Row
            icon="cash-outline"
            label="Earnings"
            value={`£${(user?.earnings_total || 0).toFixed(2)} total`}
            onPress={() => router.push('/driver/earnings')}
          />
        </>}

        {user?.role === 'rider' && <>
          <SectionTitle title="ACTIVITY" />
          <Row icon="time-outline" label="Ride history" value={`${user?.rides_count || 0} trips`} onPress={() => router.push('/rider/history')} testID="history-row" />
        </>}

        <SectionTitle title="APP" />
        <Row icon="notifications-outline" label="Notifications" onPress={() => Alert.alert('Coming soon')} />
        <Row icon="shield-checkmark-outline" label="Privacy"    onPress={() => Alert.alert('Coming soon')} />
        <Row icon="help-circle-outline"    label="Help"          onPress={() => Alert.alert('Coming soon')} />
        <Row icon="document-text-outline"  label="Legal"         onPress={() => Alert.alert('Coming soon')} />

        <SectionTitle title="SESSION" />
        <Row
          icon="log-out-outline"
          label="Log out"
          onPress={() => {
            Alert.alert('Log out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log out', style: 'destructive', onPress: () => { logout(); router.replace('/'); } },
            ]);
          }}
          danger
          testID="settings-logout-btn"
        />

        <Text style={styles.version}>Spey Ride · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F4F4F5',
  },
  navBack: { width: 40, alignItems: 'flex-start' },
  navTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },

  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#F4F4F5',
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: colors.white },
  heroName: { fontSize: 18, fontWeight: '900', letterSpacing: -0.4, color: colors.black },
  heroPhone: { fontSize: 13, color: '#52525B', marginTop: 2 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  heroMetaText: { fontSize: 12, color: '#52525B', fontWeight: '600' },
  heroDot: { fontSize: 12, color: '#D4D4D8' },
  roleBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  roleBadgeDriver: { backgroundColor: colors.black },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: colors.riderCta },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    color: '#52525B', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F9F9F9',
    backgroundColor: colors.white,
  },
  rowDanger: { backgroundColor: '#FFF5F5' },
  rowIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F4F4F5', alignItems: 'center', justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: '#FEE2E2' },
  rowLabel: { fontSize: 15, fontWeight: '600', color: colors.black },
  rowValue: { fontSize: 13, color: '#52525B', marginTop: 1 },

  version: {
    textAlign: 'center', fontSize: 12, color: '#D4D4D8',
    paddingVertical: 32,
  },

  // Edit views
  fieldLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    color: '#52525B', marginBottom: 8,
  },
  fieldInput: {
    borderWidth: 1.5, borderColor: '#E4E4E7',
    paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 16, fontWeight: '500', color: colors.black,
    backgroundColor: colors.white,
  },
  saveBtn: {
    backgroundColor: colors.black, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: colors.white },
  classBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E4E4E7', backgroundColor: colors.white,
  },
  classBtnActive: { backgroundColor: colors.black, borderColor: colors.black },
  classBtnText: { fontSize: 13, fontWeight: '700', color: colors.black },

  // Payment methods
  infoBanner: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#F4F4F5', padding: 14, marginBottom: 20, borderRadius: 12,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: colors.black, marginBottom: 4 },
  infoBody: { fontSize: 13, color: '#52525B', lineHeight: 18 },
  emptyText: { fontSize: 14, color: '#52525B', paddingVertical: 12 },
  cardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F4F4F5',
  },
  cardIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F4F4F5', alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: { fontSize: 14, fontWeight: '600', color: colors.black },
  cardSub: { fontSize: 12, color: '#52525B', marginTop: 2 },
  defaultTag: { color: colors.riderCta, fontWeight: '700' },
  setDefaultText: { fontSize: 12, color: '#52525B', textDecorationLine: 'underline' },
  addCardBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 16, paddingVertical: 16,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#E4E4E7',
    justifyContent: 'center', borderRadius: 8,
  },
  addCardText: { fontSize: 15, fontWeight: '600', color: '#52525B' },
});
