import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors, radii, spacing, type } from "../utils/theme";

export function FormField({ label, ...input }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} style={styles.input} {...input} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  label: { ...type.label, color: colors.textSoft, marginBottom: spacing.xs },
  input: { ...type.body, minHeight: 50, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.md }
});
