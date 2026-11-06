import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, radii, spacing, type } from "../utils/theme";
import { Icon, IconName } from "./Icon";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  variant?: "primary" | "secondary";
};

export function PrimaryButton({ title, onPress, loading, disabled, icon, variant = "primary" }: Props) {
  const isSecondary = variant === "secondary";
  const inactive = Boolean(loading || disabled);
  const foreground = inactive ? colors.muted : isSecondary ? colors.primary : colors.onPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: Boolean(loading) }}
      style={({ pressed }) => [styles.button, isSecondary && styles.secondary, inactive && styles.inactive, pressed && !inactive && styles.pressed]}
      onPress={onPress}
      disabled={inactive}
    >
      {loading ? <ActivityIndicator color={foreground} /> : icon ? <Icon name={icon} size={18} color={foreground} /> : null}
      <Text style={[styles.text, { color: foreground }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 50,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center"
  },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  inactive: { backgroundColor: colors.surfaceMuted, borderColor: colors.surfaceMuted },
  pressed: { opacity: 0.85 },
  text: { ...type.bodyStrong, textAlign: "center" }
});
