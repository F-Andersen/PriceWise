import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/Icon";
import { OfferCard } from "../components/OfferCard";
import { ProductGrid } from "../components/ProductGrid";
import { Chip, ChipRow, contentWidth, ErrorState, FreshnessNotice, SectionHeader, SkeletonList, StateView } from "../components/ui";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { useAddToCart } from "../services/useAddToCart";
import { CatalogSummary, Offer, Product, ProductPage, Store } from "../types";
import { countLabel, formatPrice, minProductPrice } from "../utils/prices";
import { colors, radii, spacing, type } from "../utils/theme";

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const addToCart = useAddToCart();
  const [catalog, setCatalog] = useState<ProductPage | null>(null);
  const [summary, setSummary] = useState<CatalogSummary | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [activeCategory, setActiveCategory] = useState("Усі");

  // Лише остання відповідь має значення, якщо користувач швидко перемикає категорії.
  const requestId = useRef(0);

  const load = useCallback(() => {
    const id = ++requestId.current;
    const category = activeCategory === "Усі" ? undefined : activeCategory;
    Promise.all([api.products({ category, limit: 8 }), api.catalogSummary(), api.offers(), api.stores()])
      .then(([nextCatalog, nextSummary, nextOffers, nextStores]) => {
        if (id !== requestId.current) return;
        setCatalog(nextCatalog);
        setSummary(nextSummary);
        setOffers(nextOffers);
        setStores(nextStores);
        setStatus("ready");
      })
      .catch(() => setStatus((current) => (current === "ready" ? current : "error")));
  }, [activeCategory]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const categories = ["Усі", ...(catalog?.categories.map((item) => item.name) ?? [])];
  const filtered = catalog?.items ?? [];
  const best = summary?.cheapest ?? [];

  const openProduct = (product: Product) => navigation.navigate("ProductDetails", { productId: product.id });

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]} showsVerticalScrollIndicator={false}>
      <View style={contentWidth}>
        <Text style={styles.brand}>PriceWise</Text>
        <Text accessibilityRole="header" style={[type.display, styles.title]}>Що шукаємо сьогодні?</Text>

        <Pressable
          accessibilityRole="search"
          accessibilityLabel="Перейти до пошуку товарів"
          onPress={() => navigation.navigate("Search" as never)}
          style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}
        >
          <Icon name="search" size={20} color={colors.muted} />
          <Text style={styles.searchPlaceholder} numberOfLines={1}>Товар, бренд або категорія</Text>
        </Pressable>

        {status === "loading" ? <SkeletonList label="Завантаження каталогу" /> : null}
        {status === "error" ? <ErrorState onRetry={() => { setStatus("loading"); load(); }} /> : null}

        {status === "ready" ? (
          !summary?.total ? (
            <StateView icon="search" title="Каталог порожній" text="Товари з'являться після імпорту цін." />
          ) : (
            <>
              <FreshnessNotice
                collectedAt={summary.latestCheckedAt}
                detail={`У каталозі ${countLabel(summary.total, "товар", "товари", "товарів")}. Ціни є у ${summary.storesWithPrices} з ${stores.length} магазинів. Перевіряйте ціну й наявність перед покупкою.`}
              />

              {offers.length ? (
                <>
                  <SectionHeader
                    title="Акційні товари"
                    subtitle="Знижка вказана за даними магазину на дату збору"
                    actionLabel="Показати всі"
                    onAction={() => navigation.navigate("Offers" as never)}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                    {offers.slice(0, 8).map((offer) => (
                      <OfferCard key={offer.id} offer={offer} onPress={() => navigation.navigate("ProductDetails", { productId: offer.product.id })} />
                    ))}
                  </ScrollView>
                </>
              ) : null}

              <SectionHeader title="Товари" actionLabel="Весь каталог" onAction={() => navigation.navigate("Search" as never)} />
              <ChipRow>
                {categories.map((category) => (
                  <Chip key={category} label={category} active={activeCategory === category} onPress={() => setActiveCategory(category)} />
                ))}
              </ChipRow>
              <View style={styles.gridGap}>
                <ProductGrid products={filtered} onOpen={openProduct} onAdd={addToCart} />
              </View>

              <SectionHeader title="Найнижчі ціни в каталозі" subtitle="За сумою, а не за вигодою: товари та обсяги різні" />
              <View style={styles.dealList}>
                {best.map((product, index) => (
                  <Pressable
                    key={product.id}
                    accessibilityRole="link"
                    onPress={() => openProduct(product)}
                    style={({ pressed }) => [styles.dealRow, index > 0 && styles.dealDivider, pressed && styles.pressed]}
                  >
                    <View style={styles.dealText}>
                      <Text style={type.bodyStrong} numberOfLines={1}>{product.name}</Text>
                      <Text style={type.small} numberOfLines={1}>{product.volume} · {product.category}</Text>
                    </View>
                    <Text style={styles.dealPrice}>{formatPrice(minProductPrice(product) || 0)}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  pressed: { opacity: 0.75 },
  brand: { ...type.bodyStrong, color: colors.primary },
  title: { marginTop: spacing.xs, marginBottom: spacing.lg },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong
  },
  searchPlaceholder: { ...type.body, flex: 1, color: colors.muted },
  rail: { gap: spacing.md, paddingBottom: spacing.xs },
  gridGap: { marginTop: spacing.md },
  dealList: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg },
  dealRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  dealDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  dealText: { flex: 1, minWidth: 0 },
  dealPrice: { ...type.bodyStrong, ...type.numeric }
});
