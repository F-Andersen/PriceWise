import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { OfferCard } from "../components/OfferCard";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { Offer, Store } from "../types";
import { colors, shadow } from "../utils/theme";

export function OffersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>();

  const load = useCallback(() => {
    Promise.all([api.offers(selectedStoreId), api.stores()])
      .then(([nextOffers, nextStores]) => {
        setOffers(nextOffers);
        setStores(nextStores);
      })
      .catch((error) => Alert.alert("Акції", error.message));
  }, [selectedStoreId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const bestOffer = offers[0];
  const grouped = useMemo(() => {
    return stores.map((store) => ({
      store,
      count: offers.filter((offer) => offer.store.id === store.id).length
    }));
  }, [offers, stores]);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={offers}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          <View style={styles.hero}>
            <Text style={styles.kicker}>Знижки та спецпропозиції</Text>
            <Text style={styles.title}>Акції магазинів</Text>
            <Text style={styles.subtitle}>АТБ, Сільпо, Novus та інші пропозиції в одному місці.</Text>
            {bestOffer ? (
              <View style={styles.bestLine}>
                <Text style={styles.bestText}>Топ економія сьогодні</Text>
                <Text style={styles.bestValue}>-{bestOffer.discountPercent}%</Text>
              </View>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
            <Pressable onPress={() => setSelectedStoreId(undefined)} style={[styles.chip, !selectedStoreId && styles.chipActive]}>
              <Text style={[styles.chipText, !selectedStoreId && styles.chipTextActive]}>Усі</Text>
            </Pressable>
            {grouped.map(({ store, count }) => (
              <Pressable key={store.id} onPress={() => setSelectedStoreId(store.id)} style={[styles.chip, selectedStoreId === store.id && styles.chipActive]}>
                <Text style={[styles.chipText, selectedStoreId === store.id && styles.chipTextActive]}>{store.name} · {count}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.section}>Актуальні пропозиції</Text>
        </View>
      }
      renderItem={({ item }) => (
        <OfferCard layout="list" offer={item} onPress={() => navigation.navigate("ProductDetails", { productId: item.product.id })} />
      )}
      ListEmptyComponent={<Text style={styles.empty}>Акцій для цього магазину поки немає.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 118 },
  hero: { ...shadow, backgroundColor: colors.primary, borderRadius: 16, padding: 18, marginBottom: 14 },
  kicker: { color: "#d7f8e5", fontWeight: "900", textTransform: "uppercase", fontSize: 12 },
  title: { color: "#fff", fontSize: 30, fontWeight: "900", marginTop: 10 },
  subtitle: { color: "#e3f8ec", lineHeight: 20, marginTop: 7 },
  bestLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 12, padding: 12, marginTop: 15 },
  bestText: { color: "#fff", fontWeight: "800" },
  bestValue: { color: "#fff", fontSize: 22, fontWeight: "900" },
  filters: { marginBottom: 10 },
  chip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9, marginRight: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontWeight: "900" },
  chipTextActive: { color: "#fff" },
  section: { color: colors.text, fontSize: 19, fontWeight: "900", marginTop: 8, marginBottom: 12 },
  empty: { ...shadow, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, color: colors.muted, fontWeight: "700" }
});
