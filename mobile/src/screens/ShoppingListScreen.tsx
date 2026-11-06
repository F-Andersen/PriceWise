import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { ShoppingList } from "../types";
import { minProductPrice } from "../utils/prices";
import { colors, radii, shadow } from "../utils/theme";

export function ShoppingListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [lists, setLists] = useState<ShoppingList[]>([]);

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
      listId = userLists[0]?.id;
      if (listId) {
        await AsyncStorage.setItem("activeListId", listId);
      }
    }

    if (!listId) {
      const created = await createAndOpenList();
      setLists([created]);
      return;
    }

    try {
      await openList(listId);
    } catch (error) {
      await AsyncStorage.removeItem("activeListId");
      if (userLists.length > 1) {
        const fallback = userLists.find((item) => item.id !== listId);
        if (fallback) {
          await openList(fallback.id);
          return;
        }
      }
      await createAndOpenList();
    }
  }, [createAndOpenList, openList]);

  useFocusEffect(useCallback(() => { load().catch((error) => Alert.alert("Кошик", error.message)); }, [load]));

  async function changeQuantity(itemId: string, next: number) {
    if (!list) return;
    if (next < 1) return;
    await api.updateItem(list.id, itemId, next);
    await load();
  }

  async function remove(itemId: string) {
    if (!list) return;
    await api.deleteItem(list.id, itemId);
    await load();
  }

  const total = (list?.items || []).reduce((sum, item) => sum + (minProductPrice(item.product) || 0) * item.quantity, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Мій список</Text>
          <Text style={styles.title}>{list?.title || "Кошик"}</Text>
        </View>
        <View style={styles.totalPill}>
          <Text style={styles.totalLabel}>мінімум</Text>
          <Text style={styles.totalValue}>{total ? `${total.toFixed(0)} грн` : "0 грн"}</Text>
        </View>
      </View>

      {lists.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listsRail} contentContainerStyle={styles.listsRailContent}>
          {lists.map((item) => {
            const isActive = item.id === list?.id;
            return (
              <Pressable key={item.id} onPress={() => openList(item.id).catch((error) => Alert.alert("Кошик", error.message))} style={[styles.listChip, isActive && styles.listChipActive]}>
                <Text style={[styles.listChipText, isActive && styles.listChipTextActive]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.listChipCount, isActive && styles.listChipTextActive]}>{item.items.length} товарів</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <FlatList
        data={list?.items || []}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Кошик порожній</Text>
            <Text style={styles.emptyText}>Додайте товари з каталогу або рецепти з меню, а потім порівняйте магазини.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.imageWrap}>
              {item.product.imageUrl ? <Image source={{ uri: item.product.imageUrl }} resizeMode="contain" style={styles.image} /> : <Text style={styles.imageFallback}>PW</Text>}
            </View>
            <View style={styles.itemBody}>
              <Text style={styles.name}>{item.product.name}</Text>
              <Text style={styles.meta}>{item.product.brand} · {item.product.volume}</Text>
              {minProductPrice(item.product) ? <Text style={styles.price}>від {minProductPrice(item.product)} грн</Text> : null}
            </View>
            <View style={styles.controls}>
              <Pressable style={styles.step} onPress={() => changeQuantity(item.id, item.quantity - 1)}><Text>-</Text></Pressable>
              <Text style={styles.qty}>{item.quantity}</Text>
              <Pressable style={styles.step} onPress={() => changeQuantity(item.id, item.quantity + 1)}><Text>+</Text></Pressable>
              <Pressable onPress={() => remove(item.id)}><Text style={styles.remove}>×</Text></Pressable>
            </View>
          </View>
        )}
      />
      <PrimaryButton title="Порівняти магазини" onPress={() => list && navigation.navigate("CompareStores", { listId: list.id })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 },
  kicker: { color: colors.primary, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  title: { color: colors.text, fontSize: 24, fontWeight: "900", marginTop: 2 },
  totalPill: { backgroundColor: colors.primarySoft, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, alignItems: "flex-end" },
  totalLabel: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  totalValue: { color: colors.primaryDark, fontSize: 16, fontWeight: "900", marginTop: 2 },
  listsRail: { flexGrow: 0, flexShrink: 0, marginBottom: 12 },
  listsRailContent: { paddingRight: 8 },
  listChip: { minWidth: 128, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, marginRight: 8 },
  listChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  listChipText: { color: colors.text, fontWeight: "900" },
  listChipCount: { color: colors.muted, fontSize: 11, fontWeight: "800", marginTop: 2 },
  listChipTextActive: { color: "#fff" },
  listContent: { paddingBottom: 108 },
  empty: { ...shadow, backgroundColor: colors.surface, padding: 16, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  emptyText: { color: colors.muted, lineHeight: 20, marginTop: 6 },
  item: { ...shadow, flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: 10, marginBottom: 10 },
  imageWrap: { width: 62, height: 62, borderRadius: 16, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  imageFallback: { color: colors.primary, fontSize: 11, fontWeight: "900" },
  itemBody: { flex: 1, marginLeft: 11 },
  name: { color: colors.text, fontWeight: "900", lineHeight: 18 },
  meta: { color: colors.muted, marginTop: 3, fontSize: 12 },
  price: { color: colors.primary, fontWeight: "900", marginTop: 5 },
  controls: { flexDirection: "row", alignItems: "center", gap: 8 },
  step: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  qty: { color: colors.text, fontWeight: "900", minWidth: 18, textAlign: "center" },
  remove: { color: "#b43131", fontSize: 24, paddingHorizontal: 4 }
});
