import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, shadow } from "../utils/theme";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary";
};

export function PrimaryButton({ title, onPress, loading, variant = "primary" }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.button, variant === "secondary" && styles.secondary, pressed && styles.pressed]} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color={variant === "primary" ? "#fff" : colors.primary} /> : <Text style={[styles.text, variant === "secondary" && styles.secondaryText]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { ...shadow, backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 10, alignItems: "center" },
  secondary: { backgroundColor: colors.surfaceMuted, shadowOpacity: 0, elevation: 0 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  text: { color: "#fff", fontWeight: "800" },
  secondaryText: { color: colors.primaryDark }
});
