import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts, layout, radii, spacing, type } from "../utils/theme";
import { Icon } from "./Icon";

type Props = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (next: string) => void;
};

export function SearchField({ label, placeholder, value, onChangeText }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.bar, focused && styles.barFocused]}>
      <Icon name="search" size={20} color={colors.muted} />
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.input}
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Очистити пошук" onPress={() => onChangeText("")} style={styles.clear}>
          <Text style={styles.clearText}>Очистити</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 56, paddingLeft: spacing.lg, paddingRight: spacing.sm, marginBottom: spacing.md, backgroundColor: colors.surface, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  barFocused: { borderColor: colors.primary, borderWidth: 2 },
  // Фокус показує рамка всього поля, а не вбудований контур браузера.
  input: { ...type.body, flex: 1, minWidth: 0, minHeight: 48, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}) },
  clear: { minHeight: layout.minTouch, justifyContent: "center", paddingHorizontal: spacing.sm },
  clearText: { ...type.small, color: colors.primary, fontFamily: fonts.semibold }
});
