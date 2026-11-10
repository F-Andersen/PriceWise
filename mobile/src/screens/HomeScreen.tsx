import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { NavigationProp, useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/Icon";
import { OfferCard } from "../components/OfferCard";
import { ProductGrid } from "../components/ProductGrid";
import { Chip, ChipRow, ErrorState, Notice, SectionHeader, SkeletonList, StateView, wideContent } from "../components/ui";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { useAddToCart } from "../services/useAddToCart";
import { CatalogSummary, Offer, OfferPage, Product, ProductPage, Store } from "../types";
import { ageLabel, countLabel, formatDate, formatPrice, isStale, minProductPrice, plural } from "../utils/prices";
import { colors, radii, outlined, spacing, type } from "../utils/theme";
import { useTabBarInset } from "../utils/useTabBarInset";

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabs = useNavigation<NavigationProp<{ Offers: { storeId?: string } | undefined }>>();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const addToCart = useAddToCart();
  const [catalog, setCatalog] = useState<ProductPage | null>(null);
  const [summary, setSummary] = useState<CatalogSummary | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerCounts, setOfferCounts] = useState<OfferPage["stores"]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [activeCategory, setActiveCategory] = useState("Усі");

  // Лише остання відповідь має значення, якщо користувач швидко перемикає категорії.
  const requestId = useRef(0);

  const load = useCallback(() => {
    const id = ++requestId.current;
    const category = activeCategory === "Усі" ? undefined : activeCategory;
    Promise.all([api.products({ category, limit: 8, sort: "popular" }), api.catalogSummary(), api.offers({ limit: 8 }), api.stores()])
      .then(([nextCatalog, nextSummary, nextOffers, nextStores]) => {
        if (id !== requestId.current) return;
        setCatalog(nextCatalog);
        setSummary(nextSummary);
        setOffers(nextOffers.items);
        setOfferCounts(nextOffers.stores);
        setStores(nextStores);
        setStatus("ready");
      })
      .catch(() => setStatus((current) => (current === "ready" ? current : "error")));
  }, [activeCategory]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const categories = ["Усі", ...(catalog?.categories.map((item) => item.name) ?? [])];
  const best = summary?.cheapest ?? [];
  const openProduct = (product: Product) => navigation.navigate("ProductDetails", { productId: product.id });
  const checkedAt = summary?.latestCheckedAt ?? null;
  const total = summary?.total ?? 0;
  const storeTiles = stores
    .map((store) => ({ store, count: offerCounts.find((item) => item.storeId === store.id)?.count ?? 0 }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: tabInset }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
        <View style={wideContent}>
          <Text accessibilityRole="header" style={styles.brand}>PriceWise</Text>

          <Pressable
            accessibilityRole="search"
            accessibilityLabel="Перейти до пошуку товарів"
            onPress={() => navigation.navigate("Search" as never)}
            style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}
          >
            <Icon name="search" size={20} color={colors.muted} />
            <Text style={styles.searchPlaceholder} numberOfLines={1}>Товар, бренд або категорія</Text>
          </Pressable>

          {status === "ready" && total > 0 ? (
            <Text style={styles.stats}>
              {total.toLocaleString("uk-UA")} {plural(total, "товар", "товари", "товарів")} · {summary?.storesWithPrices} з {stores.length} мереж
              {checkedAt ? ` · ціни на ${formatDate(checkedAt)} (${ageLabel(checkedAt)})` : ""}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <View style={wideContent}>
          {status === "loading" ? <SkeletonList label="Завантаження каталогу" /> : null}
          {status === "error" ? <ErrorState onRetry={() => { setStatus("loading"); load(); }} /> : null}

          {status === "ready" ? (
            total === 0 ? (
              <StateView icon="search" title="Каталог порожній" text="Товари з'являться після імпорту цін." />
            ) : (
              <>
                {checkedAt && isStale(checkedAt) ? (
                  <Notice icon="clock" title={`Ціни зібрано ${formatDate(checkedAt)} (${ageLabel(checkedAt)})`} text="Дані могли застаріти. Перевіряйте ціну й наявність у магазині." />
                ) : (
                  <Text style={styles.disclaimer}>Ціни із сайтів мереж, без прив'язки до міста. У вашому магазині можуть відрізнятися.</Text>
                )}

                {offers.length ? (
                  <>
                    <SectionHeader
                      title="Топ знижок"
                      subtitle="Найбільші знижки за даними магазинів на дату збору"
                      actionLabel="Показати всі"
                      onAction={() => navigation.navigate("Offers" as never)}
                    />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.railScroll} contentContainerStyle={styles.rail}>
                      {offers.map((offer) => (
                        <OfferCard key={offer.id} offer={offer} onPress={() => navigation.navigate("ProductDetails", { productId: offer.product.id })} />
                      ))}
                    </ScrollView>
                  </>
                ) : null}

                {storeTiles.length ? (
                  <>
                    <SectionHeader title="Акції за магазинами" />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tilesScroll} contentContainerStyle={styles.tiles}>
                      {storeTiles.map(({ store, count }) => (
                        <Pressable key={store.id} accessibilityRole="link" onPress={() => tabs.navigate("Offers", { storeId: store.id })} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
                          <Text style={type.bodyStrong} numberOfLines={1}>{store.name}</Text>
                          <Text style={type.small} numberOfLines={1}>{countLabel(count, "акція", "акції", "акцій")}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </>
                ) : null}

                <SectionHeader title="Товари" subtitle="Спершу ті, що є в кількох мережах" actionLabel="Весь каталог" onAction={() => navigation.navigate("Search" as never)} />
                <ChipRow>
                  {categories.map((category) => (
                    <Chip key={category} label={category} active={activeCategory === category} onPress={() => setActiveCategory(category)} />
                  ))}
                </ChipRow>
                <View style={styles.gridGap}>
                  <ProductGrid products={catalog?.items ?? []} onOpen={openProduct} onAdd={addToCart} />
                </View>

                <SectionHeader title="Найнижчі ціни в каталозі" subtitle="За сумою, а не за вигодою: товари та обсяги різні" />
                <View style={styles.dealList}>
                  {best.map((product) => (
                    <Pressable
                      key={product.id}
                      accessibilityRole="link"
                      onPress={() => openProduct(product)}
                      style={({ pressed }) => [styles.dealRow, pressed && styles.pressed]}
                    >
                      <View style={styles.dealText}>
                        <Text style={type.bodyStrong} numberOfLines={1}>{product.name}</Text>
                        <Text style={type.small} numberOfLines={1}>{product.volume} · {product.category}</Text>
                      </View>
                      <Text style={type.price}>{formatPrice(minProductPrice(product) || 0)}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  pressed: { opacity: 0.8 },
  hero: { backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  brand: { ...type.display, fontSize: 24, lineHeight: 30, marginBottom: spacing.md },
  searchBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md, backgroundColor: colors.surfaceMuted, borderRadius: radii.md },
  searchPlaceholder: { ...type.body, flex: 1, color: colors.muted },
  stats: { ...type.small, marginTop: spacing.sm },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  disclaimer: { ...type.small },
  railScroll: { marginHorizontal: -spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  rail: { flexGrow: 1 },
  gridGap: { marginTop: spacing.md },
  tilesScroll: { marginHorizontal: -spacing.lg },
  tiles: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  tile: { ...outlined, width: 124, padding: spacing.md, borderRadius: radii.md },
  dealList: { borderTopWidth: 1, borderTopColor: colors.border },
  dealRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 64, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  dealText: { flex: 1, minWidth: 0 }
});
