import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FormField } from "../components/FormField";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
import { Notice } from "../components/ui";
import { api } from "../services/api";
import { useAuth } from "../services/AuthContext";
import { authErrorMessage, isValidEmail, newPasswordProblem } from "../utils/authForm";
import { colors, layout, radii, spacing, type } from "../utils/theme";

/**
 * Demo credentials are prefilled only in development, or in a build made with
 * EXPO_PUBLIC_DEMO_LOGIN=true (e.g. for a diploma demo). Production shows empty fields.
 */
const prefillDemo = __DEV__ || process.env.EXPO_PUBLIC_DEMO_LOGIN === "true";

type Step = "signIn" | "forgot" | "reset";
type Pending = "login" | "register" | "send" | "reset" | null;

/** The login window: sign in, register, or recover a forgotten password. */
export function AuthScreen() {
  const { authPrompt, closeAuth, resetPassword, sessionExpired, signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("signIn");
  const [email, setEmail] = useState(prefillDemo ? "demo@example.com" : "");
  const [password, setPassword] = useState(prefillDemo ? "password123" : "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const cleanEmail = email.trim();

  function goTo(next: Step) {
    setStep(next);
    setError(null);
    setInfo(null);
  }

  async function run(kind: Exclude<Pending, null>, action: () => Promise<void>) {
    try {
      setPending(kind);
      setError(null);
      setInfo(null);
      await action();
    } catch (reason) {
      setError(authErrorMessage(reason));
    } finally {
      setPending(null);
    }
  }

  function submit(mode: "login" | "register") {
    if (!isValidEmail(cleanEmail)) return setError("Вкажіть правильну адресу пошти.");
    return run(mode, () => signIn(cleanEmail, password, mode));
  }

  function sendCode(isResend: boolean) {
    if (!isValidEmail(cleanEmail)) return setError("Вкажіть правильну адресу пошти.");
    return run("send", async () => {
      await api.forgotPassword(cleanEmail);
      if (isResend) setInfo("Новий код можна отримати раз на хвилину. Перевірте також папку «Спам».");
      else setStep("reset");
    });
  }

  function submitReset() {
    if (!/^\d{6}$/.test(code)) return setError("Введіть шість цифр із листа.");
    const problem = newPasswordProblem(newPassword, repeat);
    if (problem) return setError(problem);
    return run("reset", () => resetPassword(cleanEmail, code, newPassword));
  }

  const heading = { signIn: "Увійдіть у PriceWise", forgot: "Відновлення пароля", reset: "Новий пароль" }[step];
  const subtitle = {
    signIn: authPrompt?.reason ?? "Каталог доступний усім, а кошики зберігаються у вашому акаунті.",
    forgot: "Вкажіть пошту акаунта, і ми надішлемо код із шести цифр.",
    reset: `Якщо ${cleanEmail} зареєстровано, на цю адресу надійшов код. Він діє 15 хвилин.`
  }[step];
  const busy = Boolean(pending);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}
      >
        <View style={styles.inner}>
          <View style={styles.topRow}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}><Icon name="basket" size={22} color={colors.onPrimary} /></View>
              <Text style={styles.brand}>PriceWise</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={closeAuth} style={styles.textButton}>
              <Text style={styles.textButtonLabel}>Не зараз</Text>
            </Pressable>
          </View>

          <Text accessibilityRole="header" style={type.display}>{heading}</Text>
          <Text style={[type.body, styles.subtitle]}>{subtitle}</Text>

          {step !== "reset" ? (
            <FormField label="Email" autoComplete="email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          ) : null}

          {step === "signIn" ? (
            <FormField label="Пароль" autoComplete="password" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={() => submit("login")} />
          ) : null}

          {step === "reset" ? (
            <>
              <FormField label="Код із листа" autoComplete="one-time-code" keyboardType="number-pad" maxLength={6} value={code} onChangeText={(text) => setCode(text.replace(/\D/g, ""))} />
              <FormField label="Новий пароль" autoComplete="new-password" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
              <FormField label="Повторіть новий пароль" autoComplete="new-password" secureTextEntry value={repeat} onChangeText={setRepeat} onSubmitEditing={submitReset} />
            </>
          ) : null}

          {step === "signIn" && sessionExpired && !error ? <View style={styles.notice}><Notice icon="info" tone="neutral" title="Сесія завершилась" text="Увійдіть знову, щоб побачити кошик." /></View> : null}
          {info ? <View style={styles.notice}><Notice icon="info" tone="neutral" title="Код надіслано" text={info} /></View> : null}
          {error ? <View style={styles.notice}><Notice icon="alert" title="Не вдалося виконати" text={error} /></View> : null}

          {step === "signIn" ? (
            <View style={styles.actions}>
              <PrimaryButton title="Увійти" loading={pending === "login"} disabled={busy} onPress={() => submit("login")} />
              <PrimaryButton title="Зареєструватися" variant="secondary" loading={pending === "register"} disabled={busy} onPress={() => submit("register")} />
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => goTo("forgot")} style={styles.textButtonCentered}>
                <Text style={styles.textButtonLabel}>Забули пароль?</Text>
              </Pressable>
            </View>
          ) : null}

          {step === "forgot" ? (
            <View style={styles.actions}>
              <PrimaryButton title="Надіслати код" loading={pending === "send"} disabled={busy} onPress={() => sendCode(false)} />
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => goTo("signIn")} style={styles.textButtonCentered}>
                <Text style={styles.textButtonLabel}>Назад до входу</Text>
              </Pressable>
            </View>
          ) : null}

          {step === "reset" ? (
            <View style={styles.actions}>
              <PrimaryButton title="Зберегти пароль і увійти" loading={pending === "reset"} disabled={busy} onPress={submitReset} />
              <PrimaryButton title="Надіслати код ще раз" variant="secondary" loading={pending === "send"} disabled={busy} onPress={() => sendCode(true)} />
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => goTo("signIn")} style={styles.textButtonCentered}>
                <Text style={styles.textButtonLabel}>Назад до входу</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.xl },
  inner: { width: "100%", maxWidth: 420, alignSelf: "center" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xl },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  brandMark: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  brand: { ...type.heading, color: colors.primaryDark },
  subtitle: { color: colors.textSoft, marginTop: spacing.sm, marginBottom: spacing.xl },
  notice: { marginBottom: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
  textButton: { minHeight: layout.minTouch, justifyContent: "center", paddingLeft: spacing.md },
  textButtonCentered: { minHeight: layout.minTouch, alignItems: "center", justifyContent: "center" },
  textButtonLabel: { ...type.label, color: colors.primaryDark }
});
