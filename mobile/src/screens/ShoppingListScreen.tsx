import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { ShoppingList } from "../types";

export function ShoppingListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [list, setList] = useState<ShoppingList | null>(null);

  const load = useCallback(async () => {
    let listId = await AsyncStorage.getItem("activeListId");
    if (!listId) {
      const created = await api.createList("Мій кошик");
      listId = created.id;
      await AsyncStorage.setItem("activeListId", listId);
    }
    setList(await api.list(listId));
  }, []);

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{list?.title || "Кошик"}</Text>
      <FlatList
        data={list?.items || []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Додайте товари з каталогу або рецептів.</Text>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.product.name}</Text>
              <Text style={styles.meta}>{item.product.brand} · {item.product.volume}</Text>
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
  container: { flex: 1, backgroundColor: "#f7fbf9", padding: 16 },
  title: { color: "#10251c", fontSize: 24, fontWeight: "900", marginBottom: 12 },
  empty: { color: "#60736b", backgroundColor: "#fff", padding: 16, borderRadius: 8, borderWidth: 1, borderColor: "#e4ece8" },
  item: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderColor: "#e4ece8", borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 10 },
  name: { color: "#17231e", fontWeight: "800" },
  meta: { color: "#60736b", marginTop: 3 },
  controls: { flexDirection: "row", alignItems: "center", gap: 8 },
  step: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#e7f3ee", alignItems: "center", justifyContent: "center" },
  qty: { color: "#17231e", fontWeight: "900", minWidth: 18, textAlign: "center" },
  remove: { color: "#b43131", fontSize: 24, paddingHorizontal: 4 }
});
