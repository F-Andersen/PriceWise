import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
import { Notice } from "../components/ui";
import { useAuth } from "../services/AuthContext";
import { colors, radii, spacing, type } from "../utils/theme";

export function AuthScreen() {
  const { signIn, sessionExpired } = useAuth();
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password123");
  const [pending, setPending] = useState<"login" | "register" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(mode: "login" | "register") {
    try {
      setPending(mode);
      setError(null);
      await signIn(email, password, mode);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "";
      setError(message === "Failed to fetch" || !message ? "Немає зв'язку із сервером. Перевірте, чи запущено API, і спробуйте ще раз." : message);
    } finally {
      setPending(null);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}><Icon name="basket" size={22} color={colors.onPrimary} /></View>
          <Text style={styles.brand}>PriceWise</Text>
        </View>
        <Text accessibilityRole="header" style={type.display}>Порівнюйте кошик, а не обіцянки</Text>
        <Text style={[type.body, styles.subtitle]}>Шукайте товари, складайте кошик і дивіться, що відомо про ціни в магазинах.</Text>

        <Text nativeID="email-label" style={styles.label}>Email</Text>
        <TextInput accessibilityLabel="Email" autoComplete="email" style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Text nativeID="password-label" style={styles.label}>Пароль</Text>
        <TextInput accessibilityLabel="Пароль" autoComplete="password" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

        {sessionExpired && !error ? <View style={styles.error}><Notice icon="info" tone="neutral" title="Сесія завершилась" text="Увійдіть знову, щоб побачити кошик і профіль." /></View> : null}
        {error ? <View style={styles.error}><Notice icon="alert" title="Не вдалося увійти" text={error} /></View> : null}

        <View style={styles.actions}>
          <PrimaryButton title="Увійти" loading={pending === "login"} disabled={Boolean(pending)} onPress={() => submit("login")} />
          <PrimaryButton title="Зареєструватися" variant="secondary" loading={pending === "register"} disabled={Boolean(pending)} onPress={() => submit("register")} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: spacing.xl },
  inner: { width: "100%", maxWidth: 420, alignSelf: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl },
  brandMark: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  brand: { ...type.heading, color: colors.primaryDark },
  subtitle: { color: colors.textSoft, marginTop: spacing.sm, marginBottom: spacing.xl },
  label: { ...type.label, color: colors.textSoft, marginBottom: spacing.xs },
  input: { ...type.body, minHeight: 50, paddingHorizontal: spacing.md, marginBottom: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.md },
  error: { marginBottom: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.xs }
});
