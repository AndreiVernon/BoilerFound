import type { PropsWithChildren } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts } from '../theme';

export const icons = {
  back: require('../../assets/figma/back.svg'), camera: require('../../assets/figma/camera.svg'),
  check: require('../../assets/figma/check.svg'), pin: require('../../assets/figma/pin.svg'),
};
export function Icon({ name }: { name: keyof typeof icons }) {
  const size = { back: 24, camera: 26, check: 36, pin: 16 }[name];
  return <Image source={icons[name]} style={{ width: size, height: size }} contentFit="contain" accessibilityElementsHidden />;
}
export function Screen({ children }: PropsWithChildren) {
  return <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled"><View style={styles.screen}>{children}</View></ScrollView>;
}
export function Heading({ children }: PropsWithChildren) {
  return <Text role="heading" aria-level={1} style={styles.heading}>{children}</Text>;
}
export function Body({ children, centered = false }: PropsWithChildren<{ centered?: boolean }>) {
  return <Text style={[styles.body, centered && { textAlign: 'center' }]}>{children}</Text>;
}
export function Note({ children }: PropsWithChildren) {
  return <Text style={styles.note}>{children}</Text>;
}
export function Button({ title, onPress, secondary, disabled, caption, testID }: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; caption?: string; testID?: string;
}) {
  return <Pressable testID={testID} role="button" accessibilityLabel={title} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, disabled && styles.disabledButton, pressed && !disabled && { opacity: 0.8 }]}>
    <Text style={[styles.buttonText, disabled && { color: colors.secondary }]}>{title}</Text>
    {caption && <Text style={styles.buttonCaption}>{caption}</Text>}
  </Pressable>;
}
export function BackButton({ to }: { to: '/' | '/found' }) {
  return <Pressable role="button" accessibilityLabel="Go back" onPress={() => router.replace(to)} style={styles.back}><Icon name="back" /></Pressable>;
}
export function ErrorText({ children }: PropsWithChildren) {
  return <Text role="alert" style={styles.error}>{children}</Text>;
}
export function Field({ label, error, hint, required, ...props }: TextInputProps & { label: string; error?: string; hint?: string; required?: boolean }) {
  return <View style={styles.field}>
    <Text style={styles.label}>{label}{required ? ' (required)' : ' (optional)'}</Text>
    <TextInput {...props} accessibilityLabel={label} aria-required={required} aria-invalid={!!error} placeholderTextColor={colors.secondary}
      style={[styles.input, props.multiline && styles.multiline, error && { borderColor: colors.error }]} />
    {hint && <Note>{hint}</Note>}{error && <ErrorText>{error}</ErrorText>}
  </View>;
}
export const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  screen: { width: '100%', maxWidth: 440, flexGrow: 1, minHeight: 844, backgroundColor: colors.white, paddingHorizontal: 26, paddingTop: 38, paddingBottom: 32, gap: 16 },
  heading: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 38, color: colors.black },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.secondary },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.secondary },
  button: { backgroundColor: colors.gold, minHeight: 56, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 5 },
  secondaryButton: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.black },
  disabledButton: { backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border },
  buttonText: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, color: colors.black, textAlign: 'center' },
  buttonCaption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.black, textAlign: 'center' },
  back: { minWidth: 44, minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  field: { gap: 6 }, label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.secondary },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, minHeight: 52, padding: 16, color: colors.black, fontFamily: fonts.body, fontSize: 15, backgroundColor: colors.white },
  multiline: { minHeight: 76, textAlignVertical: 'top' },
  error: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.error },
  spacer: { flexGrow: 1, minHeight: 24 },
  card: { backgroundColor: colors.muted, padding: 16, borderRadius: 14, gap: 12 },
  badge: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
});
