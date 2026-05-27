import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, radii, shadow } from "../utils/theme";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary";
};

export function PrimaryButton({ title, onPress, loading, variant = "primary" }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, variant === "secondary" && styles.secondary, pressed && styles.pressed]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : colors.primary} />
      ) : (
        <Text style={[styles.text, variant === "secondary" && styles.secondaryText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    ...shadow,
    minHeight: 50,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center"
  },
  secondary: {
    backgroundColor: colors.primarySoft,
    shadowOpacity: 0,
    elevation: 0
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }]
  },
  text: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15
  },
  secondaryText: {
    color: colors.primaryDark
  }
});
