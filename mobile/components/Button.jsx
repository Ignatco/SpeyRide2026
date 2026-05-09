import { Pressable, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '../lib/theme';

export default function Button({ title, onPress, variant = 'primary', loading, disabled, testID, icon, style }) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const isDisabled = loading || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border ?? v.bg },
        pressed && !isDisabled && styles.pressed,
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.label, { color: v.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const VARIANTS = {
  primary: { bg: colors.riderCta, fg: colors.white },
  dark: { bg: colors.black, fg: colors.white },
  driver: { bg: colors.driverCta, fg: colors.black },
  outline: { bg: 'transparent', fg: colors.black, border: colors.black },
  ghost: { bg: colors.riderSurface, fg: colors.black },
  danger: { bg: colors.danger, fg: colors.white },
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ translateY: -2 }] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 17, fontWeight: '800', letterSpacing: -0.4 },
});
