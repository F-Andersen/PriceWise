import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
import { ProductGrid } from "../components/ProductGrid";
import { Chip, ChipRow, contentWidth, ErrorState, PageTitle, SkeletonList, StateView } from "../components/ui";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { useAddToCart } from "../services/useAddToCart";
import { ProductPage } from "../types";
import { countLabel } from "../utils/prices";
import { colors, layout, radii, spacing, type } from "../utils/theme";

export function ProductSearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const addToCart = useAddToCart();
  const [result, setResult] = useState<ProductPage | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Усі");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    const timer = setTimeout(() => {
      api.searchProducts(query.trim(), { category: category === "Усі" ? undefined : category })
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
      const next = await api.searchProducts(query.trim(), { category: category === "Усі" ? undefined : category, page: result.page + 1 });
      setResult({ ...next, items: [...result.items, ...next.items] });
    } catch {
      // Кнопка лишається: можна спробувати ще раз.
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={contentWidth}>
        <PageTitle title="Пошук товарів" />
        <View style={[styles.searchBar, focused && styles.searchBarFocused]}>
          <Icon name="search" size={20} color={colors.muted} />
          <TextInput
            accessibilityLabel="Пошук товарів"
            value={query}
            onChangeText={changeQuery}
            placeholder="Назва, бренд або категорія"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={styles.input}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Очистити пошук" onPress={() => changeQuery("")} style={styles.clear}>
              <Text style={styles.clearText}>Очистити</Text>
            </Pressable>
          ) : null}
        </View>

        {status !== "error" && categories.length > 1 ? (
          <ChipRow>
            {categories.map((item) => (
              <Chip key={item} label={item} active={item === category} onPress={() => setCategory(item)} />
            ))}
          </ChipRow>
        ) : null}

        <View style={styles.results}>
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  searchBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 52, paddingLeft: spacing.lg, paddingRight: spacing.sm, marginBottom: spacing.md, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderStrong },
  searchBarFocused: { borderColor: colors.primary, borderWidth: 2 },
  // Фокус показує рамка всього поля, а не вбудований контур браузера.
  input: { ...type.body, flex: 1, minWidth: 0, minHeight: 48, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}) },
  clear: { minHeight: layout.minTouch, justifyContent: "center", paddingHorizontal: spacing.sm },
  clearText: { ...type.small, color: colors.primary, fontWeight: "600" },
  results: { marginTop: spacing.md },
  count: { ...type.small, marginBottom: spacing.sm },
  more: { marginTop: spacing.sm }
});
