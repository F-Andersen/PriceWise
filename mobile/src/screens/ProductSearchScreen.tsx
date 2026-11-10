import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/PrimaryButton";
import { ProductGrid } from "../components/ProductGrid";
import { SearchField } from "../components/SearchField";
import { Chip, ChipRow, ErrorState, SkeletonList, StateView, wideContent } from "../components/ui";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { useAddToCart } from "../services/useAddToCart";
import { ProductPage } from "../types";
import { countLabel } from "../utils/prices";
import { colors, spacing, type } from "../utils/theme";
import { useTabBarInset } from "../utils/useTabBarInset";

export function ProductSearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const addToCart = useAddToCart();
  const [result, setResult] = useState<ProductPage | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Усі");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    const timer = setTimeout(() => {
      api.searchProducts(query.trim(), { sort: query.trim() ? undefined : "popular", category: category === "Усі" ? undefined : category })
        .then((next) => {
          if (!active) return;
          setResult(next);
          setStatus("ready");
        })
        .catch(() => {
          if (active) setStatus("error");
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, category, attempt]);

  const products = result?.items ?? [];
  const categories = ["Усі", ...(result?.categories.map((item) => item.name) ?? [])];
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  // Інший запит може не мати вибраної категорії, тому починаємо знову з усіх.
  function changeQuery(next: string) {
    setQuery(next);
    setCategory("Усі");
  }

  async function loadMore() {
    if (!result || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await api.searchProducts(query.trim(), { sort: query.trim() ? undefined : "popular", category: category === "Усі" ? undefined : category, page: result.page + 1 });
      setResult({ ...next, items: [...result.items, ...next.items] });
    } catch {
      // Кнопка лишається: можна спробувати ще раз.
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Поле й категорії поза прокруткою: завжди під рукою, навіть далеко внизу каталогу. */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={wideContent}>
          <SearchField label="Пошук товарів" placeholder="Назва, бренд або категорія" value={query} onChangeText={changeQuery} />
          {status !== "error" && categories.length > 1 ? (
            <ChipRow>
              {categories.map((item) => (
                <Chip key={item} label={item} active={item === category} onPress={() => setCategory(item)} />
              ))}
            </ChipRow>
          ) : null}
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: tabInset }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={wideContent}>
          {status === "loading" ? <SkeletonList label="Пошук товарів" /> : null}
          {status === "error" ? <ErrorState onRetry={retry} /> : null}
          {status === "ready" && products.length === 0 ? (
            <StateView
              icon="search"
              title={query ? `Нічого не знайдено за запитом «${query.trim()}»` : "Каталог порожній"}
              text="База поки невелика. Спробуйте коротшу назву або загальніше слово, наприклад «молоко»."
              actionLabel={query ? "Очистити пошук" : undefined}
              onAction={query ? () => changeQuery("") : undefined}
            />
          ) : null}
          {status === "ready" && products.length > 0 ? (
            <>
              <Text accessibilityLiveRegion="polite" style={styles.count}>{countLabel(result?.total ?? products.length, "товар", "товари", "товарів")}</Text>
              <ProductGrid products={products} onOpen={(item) => navigation.navigate("ProductDetails", { productId: item.id })} onAdd={addToCart} />
              {result?.hasMore ? (
                <View style={styles.more}>
                  <PrimaryButton title={`Показати ще (${products.length} із ${result.total})`} variant="secondary" loading={loadingMore} disabled={loadingMore} onPress={loadMore} />
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  count: { ...type.small, marginBottom: spacing.md },
  more: { marginTop: spacing.lg }
});
