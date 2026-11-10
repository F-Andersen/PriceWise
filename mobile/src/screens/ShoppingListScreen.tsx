import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/PrimaryButton";
import { useToast } from "../components/Toast";
import { Badge, contentWidth, ErrorState, IconButton, PageTitle, ProductImage, SkeletonList, StateView, Stepper } from "../components/ui";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { useAuth } from "../services/AuthContext";
import { ShoppingList, ShoppingListItem } from "../types";
import { cheapestAvailablePrice, countLabel, formatDate, formatPrice, isStale, latestCollectedAt, minProductPrice } from "../utils/prices";
import { colors, layout, radii, shadow, spacing, type, fonts } from "../utils/theme";

export function ShoppingListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { token, sessionExpired, openAuth } = useAuth();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const openList = useCallback(async (listId: string) => {
    const nextList = await api.list(listId);
    setList(nextList);
    await AsyncStorage.setItem("activeListId", listId);
  }, []);

  const createAndOpenList = useCallback(async () => {
    const created = await api.createList("Мій кошик");
    await AsyncStorage.setItem("activeListId", created.id);
    await openList(created.id);
    return created;
  }, [openList]);

  const load = useCallback(async () => {
    let listId = await AsyncStorage.getItem("activeListId");
    const userLists = await api.lists();
    setLists(userLists);

    const savedListExists = listId ? userLists.some((item) => item.id === listId) : false;
    if (!savedListExists) {
      listId = userLists[0]?.id ?? null;
      if (listId) await AsyncStorage.setItem("activeListId", listId);
    }

    if (!listId) {
      const created = await createAndOpenList();
      setLists([created]);
      return;
    }

    try {
      await openList(listId);
    } catch {
      await AsyncStorage.removeItem("activeListId");
      const fallback = userLists.find((item) => item.id !== listId);
      if (fallback) await openList(fallback.id);
      else await createAndOpenList();
    }
  }, [createAndOpenList, openList]);

  const refresh = useCallback(() => {
    load()
      .then(() => setStatus("ready"))
      .catch(() => setStatus((current) => (current === "ready" ? current : "error")));
  }, [load]);

  useFocusEffect(useCallback(() => {
    if (token) {
      refresh();
    } else {
      setList(null);
      setLists([]);
      setStatus("loading");
    }
  }, [refresh, token]));

  async function changeQuantity(item: ShoppingListItem, next: number) {
    if (!list || next < 1) return;
    try {
      await api.updateItem(list.id, item.id, next);
      await load();
    } catch {
      toast("Не вдалося змінити кількість.", { kind: "error" });
    }
  }

  async function remove(item: ShoppingListItem) {
    if (!list) return;
    const listId = list.id;
    try {
      await api.deleteItem(listId, item.id);
      await load();
      toast(`Видалено: ${item.product.name}`, {
        actionLabel: "Повернути",
        onAction: () => {
          api.addItem(listId, item.productId, item.quantity).then(load).catch(() => toast("Не вдалося повернути товар.", { kind: "error" }));
        }
      });
    } catch {
      toast("Не вдалося видалити товар.", { kind: "error" });
    }
  }

  async function newList() {
    try {
      await createAndOpenList();
      setLists(await api.lists());
      toast("Новий кошик створено");
    } catch {
      toast("Не вдалося створити кошик.", { kind: "error" });
    }
  }

  const items = list?.items || [];
  const priced = items.filter((item) => minProductPrice(item.product) !== null);
  const unpriced = items.length - priced.length;
  const estimate = priced.reduce((sum, item) => sum + (minProductPrice(item.product) || 0) * item.quantity, 0);
  const collectedAt = latestCollectedAt(items.map((item) => item.product));

  if (!token) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
        <View style={[contentWidth, styles.guest]}>
          <PageTitle title="Кошик" />
          <StateView
            icon="basket"
            title={sessionExpired ? "Сесія завершилась" : "Кошик зберігається в акаунті"}
            text={sessionExpired ? "Увійдіть знову, щоб побачити свої кошики." : "Увійдіть, щоб додавати товари й порівнювати вартість кошика в магазинах."}
            actionLabel="Увійти"
            onAction={openAuth}
            secondaryLabel="Знайти товари"
            onSecondary={() => navigation.navigate("Search" as never)}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <FlatList
        data={status === "ready" ? items : []}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={contentWidth}>
            <PageTitle
              title="Кошик"
              subtitle={list ? `${list.title} · ${countLabel(items.length, "товар", "товари", "товарів")}` : undefined}
              right={status === "ready" ? (
                <Pressable accessibilityRole="button" onPress={newList} style={styles.newList}>
                  <Text style={styles.newListText}>Новий кошик</Text>
                </Pressable>
              ) : null}
            />
            {status === "ready" && lists.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lists} contentContainerStyle={styles.listsContent}>
                {lists.map((item) => {
                  const active = item.id === list?.id;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => openList(item.id).catch(() => toast("Не вдалося відкрити кошик.", { kind: "error" }))}
                      style={[styles.listChip, active && styles.listChipActive]}
                    >
                      <Text style={[styles.listChipTitle, active && styles.listChipTextActive]} numberOfLines={1}>{item.title}</Text>
                      <Text style={[styles.listChipCount, active && styles.listChipTextActive]}>{countLabel(item.items.length, "товар", "товари", "товарів")}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
            {status === "loading" ? <SkeletonList count={3} label="Завантаження кошика" /> : null}
            {status === "error" ? <ErrorState onRetry={() => { setStatus("loading"); refresh(); }} /> : null}
          </View>
        }
        ListEmptyComponent={
          status === "ready" ? (
            <View style={contentWidth}>
              <StateView
                icon="basket"
                title="Кошик порожній"
                text="Додайте товари з пошуку або продукти з рецепта, а потім порівняйте магазини."
                actionLabel="Знайти товари"
                onAction={() => navigation.navigate("Search" as never)}
                secondaryLabel="Обрати рецепт"
                onSecondary={() => navigation.navigate("Recipes" as never)}
              />
            </View>
          ) : undefined
        }
        renderItem={({ item }) => {
          const cheapest = cheapestAvailablePrice(item.product);
          const price = minProductPrice(item.product);
          return (
            <View style={contentWidth}>
              <View style={styles.item}>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => navigation.navigate("ProductDetails", { productId: item.productId })}
                  style={({ pressed }) => [styles.itemMain, pressed && styles.pressed]}
                >
                  <ProductImage uri={item.product.imageUrl} size={60} />
                  <View style={styles.itemBody}>
                    <Text style={type.bodyStrong} numberOfLines={2}>{item.product.name}</Text>
                    <Text style={type.small} numberOfLines={1}>{item.product.volume}</Text>
                    {price !== null && cheapest ? (
                      <Text style={styles.itemPrice} numberOfLines={1}>{formatPrice(price)} · {cheapest.store.name}</Text>
                    ) : (
                      <View style={styles.badgeGap}><Badge label="Ціни немає" tone="caution" icon="alert" /></View>
                    )}
                  </View>
                </Pressable>
                <View style={styles.itemActions}>
                  <Stepper value={item.quantity} name={item.product.name} onChange={(next) => changeQuantity(item, next)} />
                  <IconButton icon="trash" label={`Видалити: ${item.product.name}`} onPress={() => remove(item)} />
                </View>
              </View>
            </View>
          );
        }}
      />

      {status === "ready" && items.length > 0 ? (
        <View style={styles.footer}>
          <View style={contentWidth}>
            <View style={styles.footerSummary}>
              <View style={styles.footerText}>
                <Text style={type.label}>Орієнтовний мінімум</Text>
                <Text style={styles.footerHint}>
                  Якщо брати кожен товар там, де він найдешевший.{unpriced ? ` Не враховано товарів без ціни: ${unpriced}.` : ""}
                </Text>
              </View>
              <Text style={type.price}>≈ {formatPrice(Math.round(estimate * 100) / 100)}</Text>
            </View>
            {collectedAt ? <Text style={[styles.footerDate, isStale(collectedAt) && styles.footerDateStale]}>Ціни станом на {formatDate(collectedAt)}. Це не сума до сплати.</Text> : null}
            <PrimaryButton title="Порівняти магазини" icon="store" onPress={() => list && navigation.navigate("CompareStores", { listId: list.id })} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  guest: { paddingHorizontal: spacing.lg },
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  pressed: { opacity: 0.75 },
  newList: { minHeight: layout.minTouch, justifyContent: "center" },
  newListText: { ...type.small, color: colors.primary, fontFamily: fonts.semibold },
  lists: { flexGrow: 0, marginBottom: spacing.md },
  listsContent: { gap: spacing.sm },
  listChip: { minWidth: 120, maxWidth: 180, minHeight: 52, justifyContent: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  listChipActive: { backgroundColor: colors.text, borderColor: colors.text },
  listChipTitle: { ...type.small, color: colors.text, fontFamily: fonts.semibold },
  listChipCount: { ...type.small, fontSize: 12 },
  listChipTextActive: { color: colors.onPrimary },
  item: { ...shadow, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md },
  itemMain: { flexDirection: "row", gap: spacing.md },
  itemBody: { flex: 1, minWidth: 0 },
  itemPrice: { ...type.bodyStrong, ...type.numeric, marginTop: spacing.xs },
  badgeGap: { marginTop: spacing.xs },
  itemActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm },
  footer: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  footerSummary: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginBottom: spacing.sm },
  footerText: { flex: 1, minWidth: 0 },
  footerHint: { ...type.small, fontSize: 12 },
  footerDate: { ...type.small, fontSize: 12, marginBottom: spacing.sm },
  footerDateStale: { color: colors.caution, fontFamily: fonts.semibold }
});
