import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { OfferCard } from "../components/OfferCard";
import { ProductCard } from "../components/ProductCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { Offer, Product } from "../types";
import { minProductPrice } from "../utils/prices";
import { colors, radii, shadow } from "../utils/theme";

const categories = ["Усі", "Овочі", "Крупи", "Напої", "Побутова хімія", "Молочні продукти"];

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Усі");

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

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products
      .filter((product) => {
        const matchesQuery =
          !normalizedQuery ||
          product.name.toLowerCase().includes(normalizedQuery) ||
          product.brand.toLowerCase().includes(normalizedQuery) ||
          product.category.toLowerCase().includes(normalizedQuery);

        const matchesCategory = activeCategory === "Усі" || product.category === activeCategory;
        return matchesQuery && matchesCategory;
      })
      .slice(0, 8);
  }, [activeCategory, products, query]);

  const best = useMemo(() => {
    return [...products]
      .filter((product) => minProductPrice(product))
      .sort((a, b) => (minProductPrice(a) || 0) - (minProductPrice(b) || 0))
      .slice(0, 5);
  }, [products]);

  const topOffer = offers[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.brand}>PriceWise</Text>
            <Text style={styles.heroTitle}>Порівнюй ціни та збирай вигідний кошик</Text>
          </View>
          <Pressable style={styles.bellButton} onPress={() => navigation.navigate("Offers" as never)}>
            <Text style={styles.bellIcon}>%</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{products.length}</Text>
            <Text style={styles.statLabel}>товарів</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>магазини</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{offers.length}</Text>
            <Text style={styles.statLabel}>акцій</Text>
          </View>
        </View>

        <PrimaryButton title="Почати покупки" onPress={createList} />
      </View>

      <View style={styles.searchCard}>
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Пошук товарів, брендів або категорій..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
        {categories.map((category) => {
          const isActive = activeCategory === category;
          return (
            <Pressable key={category} onPress={() => setActiveCategory(category)} style={[styles.chip, isActive && styles.chipActive]}>
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{category}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {topOffer ? (
        <View style={styles.promoBanner}>
          <View style={styles.promoCopy}>
            <Text style={styles.promoKicker}>Свіжа пропозиція</Text>
            <Text style={styles.promoTitle} numberOfLines={2}>{topOffer.product.name}</Text>
            <Text style={styles.promoMeta}>{topOffer.store.name} · економія {topOffer.saveAmount} грн</Text>
          </View>
          <View style={styles.promoPriceBox}>
            <Text style={styles.promoDiscount}>-{topOffer.discountPercent}%</Text>
            <Text style={styles.promoPrice}>{topOffer.price} грн</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Акційні товари</Text>
          <Text style={styles.sectionSubtitle}>Свіжі пропозиції від магазинів</Text>
        </View>
        <Pressable onPress={() => navigation.navigate("Offers" as never)}>
          <Text style={styles.linkText}>Показати всі</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.offersRail}>
        {offers.slice(0, 8).map((offer) => (
          <OfferCard key={offer.id} offer={offer} onPress={() => navigation.navigate("ProductDetails", { productId: offer.product.id })} />
        ))}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Популярні товари</Text>
          <Text style={styles.sectionSubtitle}>{filtered.length} результатів у добірці</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => <ProductCard product={item} onPress={() => navigation.navigate("ProductDetails", { productId: item.id })} />}
      />

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Найкращі ціни сьогодні</Text>
          <Text style={styles.sectionSubtitle}>Мінімальні ціни серед магазинів</Text>
        </View>
        <Text style={styles.sectionPill}>топ цін</Text>
      </View>

      {best.map((product) => (
        <View key={product.id} style={styles.dealRow}>
          <View style={styles.dealText}>
            <Text style={styles.dealName} numberOfLines={1}>{product.name}</Text>
            <Text style={styles.dealSub}>{product.category}</Text>
          </View>
          <Text style={styles.dealPrice}>{minProductPrice(product)} грн</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: 16,
    paddingBottom: 118
  },
  hero: {
    ...shadow,
    backgroundColor: colors.primaryDark,
    borderRadius: radii.xl,
    padding: 20,
    marginBottom: 14
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16
  },
  brand: {
    color: "#D9F8E8",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    lineHeight: 33,
    fontWeight: "900",
    marginTop: 8,
    maxWidth: 260
  },
  bellButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center"
  },
  bellIcon: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 20
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    marginBottom: 14
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 10
  },
  statValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900"
  },
  statLabel: {
    color: "#CDEEDD",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  searchCard: {
    ...shadow,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12
  },
  searchRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingHorizontal: 14
  },
  searchIcon: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: "900"
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15
  },
  chipsContent: {
    paddingRight: 16,
    paddingBottom: 4
  },
  chip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  chipText: {
    color: colors.muted,
    fontWeight: "900"
  },
  chipTextActive: {
    color: "#fff"
  },
  promoBanner: {
    ...shadow,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    padding: 16,
    marginTop: 14
  },
  promoCopy: {
    flex: 1
  },
  promoKicker: {
    color: "#D7F8E5",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  promoTitle: {
    color: "#fff",
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900",
    marginTop: 6
  },
  promoMeta: {
    color: "#DFF7EA",
    marginTop: 6,
    fontWeight: "700"
  },
  promoPriceBox: {
    minWidth: 92,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 10,
    alignItems: "center"
  },
  promoDiscount: {
    color: "#FFF176",
    fontWeight: "900",
    fontSize: 16
  },
  promoPrice: {
    color: "#fff",
    fontWeight: "900",
    marginTop: 4
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    marginTop: 22,
    marginBottom: 12
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  sectionSubtitle: {
    color: colors.muted,
    marginTop: 3,
    fontWeight: "700",
    fontSize: 12
  },
  linkText: {
    color: colors.primary,
    fontWeight: "900"
  },
  sectionPill: {
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontWeight: "900",
    fontSize: 12
  },
  offersRail: {
    paddingRight: 16
  },
  dealRow: {
    ...shadow,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    borderRadius: radii.md,
    marginBottom: 9
  },
  dealText: {
    flex: 1,
    paddingRight: 12
  },
  dealName: {
    color: colors.text,
    fontWeight: "900"
  },
  dealSub: {
    color: colors.muted,
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700"
  },
  dealPrice: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: 17
  }
});
