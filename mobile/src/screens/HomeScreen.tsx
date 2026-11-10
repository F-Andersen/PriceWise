import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
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
import { CatalogSummary, Offer, Product, ProductPage, Store } from "../types";
import { ageLabel, formatDate, formatPrice, isStale, minProductPrice, plural } from "../utils/prices";
import { colors, fonts, radii, outlined, shadowRaised, spacing, type } from "../utils/theme";
import { useTabBarInset } from "../utils/useTabBarInset";

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
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
    Promise.all([api.products({ category, limit: 8, sort: "popular" }), api.catalogSummary(), api.offers({ limit: 8 }), api.stores()])
      .then(([nextCatalog, nextSummary, nextOffers, nextStores]) => {
        if (id !== requestId.current) return;
        setCatalog(nextCatalog);
        setSummary(nextSummary);
        setOffers(nextOffers.items);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: tabInset }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
        <View style={wideContent}>
          <View style={styles.brandRow}>
            <View style={styles.brandDot} />
            <Text style={styles.brand}>PriceWise</Text>
          </View>
          <Text accessibilityRole="header" style={styles.heroTitle}>Що шукаємо сьогодні?</Text>

          <Pressable
            accessibilityRole="search"
            accessibilityLabel="Перейти до пошуку товарів"
            onPress={() => navigation.navigate("Search" as never)}
            style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}
          >
            <Icon name="search" size={20} color={colors.primary} />
            <Text style={styles.searchPlaceholder} numberOfLines={1}>Товар, бренд або категорія</Text>
          </Pressable>

          {status === "ready" && total > 0 ? (
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{total.toLocaleString("uk-UA")}</Text>
                <Text style={styles.statLabel}>{plural(total, "товар", "товари", "товарів")}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{summary?.storesWithPrices} з {stores.length}</Text>
                <Text style={styles.statLabel}>мереж із цінами</Text>
              </View>
              {checkedAt ? (
                <>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{ageLabel(checkedAt)}</Text>
                    <Text style={styles.statLabel}>{formatDate(checkedAt)}</Text>
                  </View>
                </>
              ) : null}
            </View>
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
                      title="Акційні товари"
                      subtitle="Знижка вказана за даними магазину на дату збору"
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
  hero: { backgroundColor: colors.ink, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, borderBottomLeftRadius: radii.xl, borderBottomRightRadius: radii.xl },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  brand: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.onInk, letterSpacing: 0.2 },
  heroTitle: { ...type.display, color: colors.onInk, marginTop: spacing.md, marginBottom: spacing.lg },
  searchBar: { ...shadowRaised, flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 56, paddingHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.pill },
  searchPlaceholder: { ...type.body, flex: 1, color: colors.muted },
  stats: { flexDirection: "row", alignItems: "stretch", marginTop: spacing.lg },
  stat: { flex: 1, minWidth: 0 },
  statDivider: { width: 1, backgroundColor: colors.inkSoft, marginHorizontal: spacing.md },
  statValue: { ...type.numeric, fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: colors.onInk },
  statLabel: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.onInkMuted },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  disclaimer: { ...type.small },
  railScroll: { marginHorizontal: -spacing.lg, marginBottom: -spacing.md },
  rail: { gap: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg },
  gridGap: { marginTop: spacing.md },
  dealList: { ...outlined, backgroundColor: colors.surface, borderRadius: radii.lg, paddingHorizontal: spacing.lg },
  dealRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 64, paddingVertical: spacing.sm },
  dealDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  dealText: { flex: 1, minWidth: 0 }
});
