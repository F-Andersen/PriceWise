import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { NavigationProp, RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OfferCard } from "../components/OfferCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { SearchField } from "../components/SearchField";
import { Chip, ChipRow, contentWidth, ErrorState, FreshnessNotice, SkeletonList, StateView } from "../components/ui";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { useAddToCart } from "../services/useAddToCart";
import { OfferPage, Store } from "../types";
import { colors, spacing } from "../utils/theme";
import { useTabBarInset } from "../utils/useTabBarInset";

type OffersRoute = { Offers: { storeId?: string } | undefined };

export function OffersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabs = useNavigation<NavigationProp<OffersRoute>>();
  const route = useRoute<RouteProp<OffersRoute, "Offers">>();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const addToCart = useAddToCart();
  const [page, setPage] = useState<OfferPage | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  // Лише остання відповідь має значення, якщо запит змінюють швидко.
  const requestId = useRef(0);

  // Магазин, вибраний на головній. Параметр скидаємо, щоб повторний вибір теж спрацював.
  const requestedStoreId = route.params?.storeId;
  useEffect(() => {
    if (!requestedStoreId) return;
    setSelectedStoreId(requestedStoreId);
    tabs.setParams({ storeId: undefined });
  }, [requestedStoreId, tabs]);

  useEffect(() => {
    const timer = setTimeout(() => setAppliedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(() => {
    const id = ++requestId.current;
    Promise.all([api.offers({ storeId: selectedStoreId, query: appliedQuery }), api.stores()])
      .then(([nextPage, nextStores]) => {
        if (id !== requestId.current) return;
        setPage(nextPage);
        setStores(nextStores);
        setStatus("ready");
      })
      .catch(() => {
        if (id === requestId.current) setStatus("error");
      });
  }, [selectedStoreId, appliedQuery]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const grouped = stores.map((store) => ({ store, count: page?.stores.find((item) => item.storeId === store.id)?.count ?? 0 }));
  const offers = page?.items ?? [];

  async function loadMore() {
    if (!page || loadingMore) return;
    setLoadingMore(true);
    const id = requestId.current;
    try {
      const next = await api.offers({ storeId: selectedStoreId, query: appliedQuery, page: page.page + 1 });
      if (id === requestId.current) setPage({ ...next, items: [...page.items, ...next.items] });
    } catch {
      // Кнопка лишається: можна спробувати ще раз.
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Як у пошуку: поле й магазини лишаються над списком під час прокрутки. */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={contentWidth}>
          <SearchField label="Пошук серед акцій" placeholder="Товар, бренд або мережа" value={query} onChangeText={setQuery} />
          {stores.length ? (
            <ChipRow>
              <Chip label="Усі" active={!selectedStoreId} onPress={() => setSelectedStoreId(undefined)} />
              {grouped.map(({ store, count }) => (
                <Chip key={store.id} label={`${store.name} · ${count}`} active={selectedStoreId === store.id} onPress={() => setSelectedStoreId(store.id)} />
              ))}
            </ChipRow>
          ) : null}
        </View>
      </View>

    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: tabInset }]}
      data={status === "ready" ? offers : []}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={contentWidth}>
          {status === "ready" ? <FreshnessNotice collectedAt={page?.latestCheckedAt ?? null} detail="Акція могла вже закінчитися. Перевірте її на сайті чи в магазині." /> : null}
          {status === "loading" ? <SkeletonList label="Завантаження акцій" /> : null}
          {status === "error" ? <ErrorState onRetry={() => { setStatus("loading"); load(); }} /> : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={contentWidth}>
          <OfferCard layout="list" offer={item} onPress={() => navigation.navigate("ProductDetails", { productId: item.product.id })} onAdd={() => addToCart(item.product)} />
        </View>
      )}
      ListFooterComponent={
        status === "ready" && page?.hasMore ? (
          <View style={[contentWidth, styles.more]}>
            <PrimaryButton title={`Показати ще (${offers.length} із ${page.total})`} variant="secondary" loading={loadingMore} disabled={loadingMore} onPress={loadMore} />
          </View>
        ) : undefined
      }
      ListEmptyComponent={
        status === "ready" ? (
          <View style={contentWidth}>
            {appliedQuery ? (
              <StateView icon="search" title={`Серед акцій немає «${appliedQuery}»`} text="У базі немає такої акційної ціни. Це не означає, що акції немає в самому магазині." actionLabel="Очистити пошук" onAction={() => setQuery("")} />
            ) : (
              <StateView icon="tag" title="Акцій немає" text="Для цього магазину в базі немає акційних цін. Це не означає, що акцій немає в самому магазині." actionLabel="Показати всі акції" onAction={() => setSelectedStoreId(undefined)} />
            )}
          </View>
        ) : undefined
      }
    />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  more: { marginTop: spacing.lg }
});
