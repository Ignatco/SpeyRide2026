import { TextInput, View, Text, StyleSheet } from 'react-native';
import { colors } from '../lib/theme';

export default function Input({ label, value, onChangeText, placeholder, keyboardType, maxLength, testID, style, ...rest }) {
  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.riderTextMuted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        testID={testID}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.riderTextMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.black,
    paddingHorizontal: 16,
    paddingVertical: 18,
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
    backgroundColor: colors.white,
  },
});
