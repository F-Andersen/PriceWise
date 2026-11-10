import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { FormField } from "../components/FormField";
import { PrimaryButton } from "../components/PrimaryButton";
import { useToast } from "../components/Toast";
import { contentWidth, Notice } from "../components/ui";
import { useAuth } from "../services/AuthContext";
import { authErrorMessage, newPasswordProblem } from "../utils/authForm";
import { colors, spacing } from "../utils/theme";

export function ChangePasswordScreen() {
  const { changePassword } = useAuth();
  const navigation = useNavigation();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!current) return setError("Введіть поточний пароль.");
    const problem = newPasswordProblem(next, repeat);
    if (problem) return setError(problem);
    try {
      setSaving(true);
      setError(null);
      await changePassword(current, next);
      toast("Пароль змінено. На інших пристроях потрібно увійти знову.");
      navigation.goBack();
    } catch (reason) {
      setError(authErrorMessage(reason));
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={contentWidth}>
        <FormField label="Поточний пароль" autoComplete="current-password" secureTextEntry value={current} onChangeText={setCurrent} />
        <FormField label="Новий пароль" autoComplete="new-password" secureTextEntry value={next} onChangeText={setNext} />
        <FormField label="Повторіть новий пароль" autoComplete="new-password" secureTextEntry value={repeat} onChangeText={setRepeat} onSubmitEditing={save} />
        {error ? <View style={styles.notice}><Notice icon="alert" title="Пароль не змінено" text={error} /></View> : null}
        <PrimaryButton title="Зберегти пароль" loading={saving} disabled={saving} onPress={save} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  notice: { marginBottom: spacing.md }
});
