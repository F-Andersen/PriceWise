import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../services/AuthContext";
import { colors, shadow } from "../utils/theme";

export function AuthScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);

  async function submit(mode: "login" | "register") {
    try {
      setLoading(true);
      await signIn(email, password, mode);
    } catch (error) {
      Alert.alert("Помилка", error instanceof Error ? error.message : "Не вдалося увійти");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>₴</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.title}>Price Decision MVP</Text>
        <Text style={styles.subtitle}>Порівняння вартості кошика між магазинами</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Пароль" />
        <PrimaryButton title="Увійти" loading={loading} onPress={() => submit("login")} />
        <View style={{ height: 10 }} />
        <PrimaryButton title="Зареєструватися" variant="secondary" loading={loading} onPress={() => submit("register")} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: 22 },
  brandMark: { alignSelf: "center", width: 66, height: 66, borderRadius: 18, backgroundColor: colors.primaryDark, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  brandMarkText: { color: "#fff", fontSize: 34, fontWeight: "900" },
  panel: { ...shadow, backgroundColor: colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 27, fontWeight: "900", color: colors.text },
  subtitle: { color: colors.muted, marginTop: 6, marginBottom: 22, lineHeight: 20 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 13, marginBottom: 12, backgroundColor: colors.background, color: colors.text }
});
