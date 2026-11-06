import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/Icon";
import { ProductGrid } from "../components/ProductGrid";
import { Chip, ChipRow, contentWidth, ErrorState, PageTitle, SkeletonList, StateView } from "../components/ui";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { useAddToCart } from "../services/useAddToCart";
import { Product } from "../types";
import { countLabel } from "../utils/prices";
import { colors, layout, radii, spacing, type } from "../utils/theme";

export function ProductSearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const addToCart = useAddToCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Усі");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    const timer = setTimeout(() => {
      api.searchProducts(query.trim())
        .then((result) => {
          if (!active) return;
          setProducts(result);
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
  }, [query, attempt]);

  const categories = useMemo(() => ["Усі", ...Array.from(new Set(products.map((product) => product.category)))], [products]);
  const effectiveCategory = categories.includes(category) ? category : "Усі";
  const filtered = effectiveCategory === "Усі" ? products : products.filter((product) => product.category === effectiveCategory);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={contentWidth}>
        <PageTitle title="Пошук товарів" />
        <View style={[styles.searchBar, focused && styles.searchBarFocused]}>
          <Icon name="search" size={20} color={colors.muted} />
          <TextInput
            accessibilityLabel="Пошук товарів"
            value={query}
            onChangeText={setQuery}
            placeholder="Назва, бренд або категорія"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={styles.input}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Очистити пошук" onPress={() => setQuery("")} style={styles.clear}>
              <Text style={styles.clearText}>Очистити</Text>
            </Pressable>
          ) : null}
        </View>

        {status !== "error" && products.length > 0 ? (
          <ChipRow>
            {categories.map((item) => (
              <Chip key={item} label={item} active={item === effectiveCategory} onPress={() => setCategory(item)} />
            ))}
          </ChipRow>
        ) : null}

        <View style={styles.results}>
          {status === "loading" ? <SkeletonList label="Пошук товарів" /> : null}
          {status === "error" ? <ErrorState onRetry={retry} /> : null}
          {status === "ready" && filtered.length === 0 ? (
            <StateView
              icon="search"
              title={query ? `Нічого не знайдено за запитом «${query.trim()}»` : "Каталог порожній"}
              text="База поки невелика. Спробуйте коротшу назву або загальніше слово, наприклад «молоко»."
              actionLabel={query ? "Очистити пошук" : undefined}
              onAction={query ? () => setQuery("") : undefined}
            />
          ) : null}
          {status === "ready" && filtered.length > 0 ? (
            <>
              <Text accessibilityLiveRegion="polite" style={styles.count}>{countLabel(filtered.length, "товар", "товари", "товарів")}</Text>
              <ProductGrid products={filtered} onOpen={(item) => navigation.navigate("ProductDetails", { productId: item.id })} onAdd={addToCart} />
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
  count: { ...type.small, marginBottom: spacing.sm }
});
