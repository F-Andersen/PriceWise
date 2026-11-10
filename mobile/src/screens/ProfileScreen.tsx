import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
import { StorePicker } from "../components/StorePicker";
import { contentWidth, ErrorState, PageTitle, SectionHeader, SkeletonList, StateView } from "../components/ui";
import { api } from "../services/api";
import { useAuth } from "../services/AuthContext";
import { ShoppingList } from "../types";
import { countLabel, formatDate } from "../utils/prices";
import { colors, radii, spacing, type, shadow } from "../utils/theme";

export function ProfileScreen() {
  const { email, openAuth, signOut, token } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(() => {
    api.lists()
      .then((result) => {
        setLists(result);
        setStatus("ready");
      })
      .catch(() => setStatus((current) => (current === "ready" ? current : "error")));
  }, []);

  useFocusEffect(useCallback(() => {
    if (token) {
      load();
    } else {
      setLists([]);
      setStatus("loading");
    }
  }, [load, token]));

  async function openList(list: ShoppingList) {
    await AsyncStorage.setItem("activeListId", list.id);
    navigation.navigate("Cart" as never);
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
      data={status === "ready" ? lists : []}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={contentWidth}>
          <PageTitle title="Профіль" subtitle={token ? email ?? undefined : undefined} />
          {!token ? (
            <StateView icon="user" title="Ви ще не увійшли" text="Каталог, акції та рецепти доступні без акаунта. Вхід потрібен, щоб зберігати кошики." actionLabel="Увійти або зареєструватися" onAction={openAuth} />
          ) : null}
          <StorePicker />
          {token ? (
            <>
              <SectionHeader title="Збережені кошики" />
              {status === "loading" ? <SkeletonList count={2} label="Завантаження кошиків" /> : null}
              {status === "error" ? <ErrorState onRetry={() => { setStatus("loading"); load(); }} /> : null}
            </>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={contentWidth}>
          <Pressable accessibilityRole="link" onPress={() => openList(item)} style={({ pressed }) => [styles.list, pressed && styles.pressed]}>
            <View style={styles.listBody}>
              <Text style={type.bodyStrong} numberOfLines={1}>{item.title}</Text>
              <Text style={type.small}>{countLabel(item.items.length, "товар", "товари", "товарів")} · {formatDate(item.createdAt)}</Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.muted} />
          </Pressable>
        </View>
      )}
      ListEmptyComponent={
        token && status === "ready" ? (
          <View style={contentWidth}>
            <StateView icon="basket" title="Кошиків ще немає" text="Перший кошик з'явиться, коли ви додасте товар." />
          </View>
        ) : undefined
      }
      ListFooterComponent={
        token ? (
          <View style={[contentWidth, styles.footer]}>
            <PrimaryButton title="Змінити пароль" variant="secondary" onPress={() => navigation.navigate("ChangePassword" as never)} />
            <PrimaryButton title="Вийти" variant="secondary" onPress={signOut} />
          </View>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  pressed: { opacity: 0.75 },
  list: { ...shadow, flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 64, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.sm },
  listBody: { flex: 1, minWidth: 0 },
  footer: { marginTop: spacing.lg, gap: spacing.sm }
});
