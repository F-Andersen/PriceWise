import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { OfferCard } from "../components/OfferCard";
import { ProductCard } from "../components/ProductCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { Offer, Product } from "../types";
import { minProductPrice } from "../utils/prices";
import { colors, shadow } from "../utils/theme";

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [query, setQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      Promise.all([api.products(), api.offers()])
        .then(([nextProducts, nextOffers]) => {
          setProducts(nextProducts);
          setOffers(nextOffers);
        })
        .catch((error) => Alert.alert("API", error.message));
    }, [])
  );

  async function createList() {
    const list = await api.createList("Мій кошик");
    await AsyncStorage.setItem("activeListId", list.id);
    Alert.alert("Готово", "Новий кошик створено");
  }

  const filtered = products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  const best = [...products].filter((product) => minProductPrice(product)).sort((a, b) => (minProductPrice(a) || 0) - (minProductPrice(b) || 0)).slice(0, 5);
  const heroOffer = offers[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.kicker}>PriceWise</Text>
          <Text style={styles.heroBadge}>NOVUS style</Text>
        </View>
        <Text style={styles.title}>Вітаємо в PriceWise!</Text>
        <Text style={styles.subtitle}>Порівнюйте ціни, знаходьте акції та збирайте вигідний кошик.</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{products.length}</Text>
            <Text style={styles.statLabel}>товарів</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>магазини</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{best.length}</Text>
            <Text style={styles.statLabel}>кращих цін</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchPanel}>
        <View style={styles.storeRow}>
          <View style={styles.storeSelector}>
            <Text style={styles.pin}>⌖</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.storeTitle}>Оберіть магазин</Text>
              <Text style={styles.storeSubtitle}>Щоб бачити персональні пропозиції</Text>
            </View>
            <Text style={styles.plus}>+</Text>
          </View>
          <View style={styles.bonusCard}>
            <Text style={styles.bonusValue}>{offers.length}</Text>
            <Text style={styles.bonusLabel}>акцій</Text>
          </View>
        </View>
        <TextInput value={query} onChangeText={setQuery} placeholder="Пошук: молоко, гречка, кава..." placeholderTextColor={colors.muted} style={styles.input} />
        <View style={styles.ctaRow}>
          <View style={{ flex: 1 }}>
            <PrimaryButton title="Створити кошик" onPress={createList} />
          </View>
          <Pressable style={styles.scanButton} onPress={() => navigation.navigate("Offers" as never)}>
            <Text style={styles.scanIcon}>▦</Text>
          </Pressable>
        </View>
      </View>

      {heroOffer ? (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.section}>Свіжа пропозиція</Text>
            <Text style={styles.sectionMeta}>-{heroOffer.discountPercent}%</Text>
          </View>
          <View style={styles.banner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{heroOffer.product.name}</Text>
              <Text style={styles.bannerSubtitle}>{heroOffer.store.name} · економія {heroOffer.saveAmount} грн</Text>
            </View>
            <Text style={styles.bannerPrice}>{heroOffer.price} грн</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.section}>Акційні товари</Text>
        <Pressable onPress={() => navigation.navigate("Offers" as never)}>
          <Text style={styles.linkText}>Показати всі ›</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {offers.slice(0, 8).map((offer) => (
          <OfferCard key={offer.id} offer={offer} onPress={() => navigation.navigate("ProductDetails", { productId: offer.product.id })} />
        ))}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={styles.section}>Популярні товари</Text>
        <Text style={styles.sectionMeta}>{filtered.length} результатів</Text>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => <ProductCard product={item} onPress={() => navigation.navigate("ProductDetails", { productId: item.id })} />}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.section}>Найкращі ціни сьогодні</Text>
        <Text style={styles.sectionMeta}>мінімум</Text>
      </View>
      {best.map((product) => (
        <View key={product.id} style={styles.dealRow}>
          <View>
            <Text style={styles.dealName}>{product.name}</Text>
            <Text style={styles.dealSub}>{product.category}</Text>
          </View>
          <Text style={styles.dealPrice}>{minProductPrice(product)} грн</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 28 },
  hero: { ...shadow, backgroundColor: colors.primaryDark, borderRadius: 16, padding: 18, marginBottom: 14 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  kicker: { color: "#bdebd4", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  heroBadge: { color: colors.primaryDark, backgroundColor: "#d9f7e8", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontWeight: "900", overflow: "hidden" },
  title: { fontSize: 30, fontWeight: "900", color: "#fff" },
  subtitle: { color: "#d7eee3", marginTop: 7, marginBottom: 16, lineHeight: 20 },
  statsRow: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, padding: 10 },
  statValue: { color: "#fff", fontSize: 20, fontWeight: "900" },
  statLabel: { color: "#cde8db", fontSize: 12, marginTop: 2 },
  searchPanel: { ...shadow, backgroundColor: colors.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border },
  storeRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  storeSelector: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.primary, borderRadius: 12, padding: 12 },
  pin: { color: "#fff", fontSize: 22, fontWeight: "900" },
  plus: { color: "#fff", fontSize: 32, fontWeight: "300", lineHeight: 32 },
  storeTitle: { color: "#fff", fontWeight: "900", fontSize: 16 },
  storeSubtitle: { color: "#e2f7eb", fontSize: 12, marginTop: 2 },
  bonusCard: { width: 92, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  bonusValue: { color: colors.primary, fontWeight: "900", fontSize: 20 },
  bonusLabel: { color: colors.muted, fontWeight: "700", fontSize: 12 },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 13, marginBottom: 12, color: colors.text },
  ctaRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  scanButton: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", ...shadow },
  scanIcon: { color: "#fff", fontSize: 24, fontWeight: "900" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 22, marginBottom: 10 },
  section: { fontSize: 18, fontWeight: "900", color: colors.text },
  sectionMeta: { color: colors.muted, fontWeight: "700" },
  linkText: { color: colors.text, fontWeight: "800" },
  banner: { ...shadow, flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, borderRadius: 16, padding: 16 },
  bannerTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
  bannerSubtitle: { color: "#e2f7eb", marginTop: 6 },
  bannerPrice: { color: "#fff36b", fontSize: 25, fontWeight: "900" },
  dealRow: { ...shadow, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 14, borderRadius: 12, marginBottom: 9 },
  dealName: { color: colors.text, fontWeight: "800" },
  dealSub: { color: colors.muted, marginTop: 2, fontSize: 12 },
  dealPrice: { color: colors.primary, fontWeight: "900", fontSize: 16 }
});
