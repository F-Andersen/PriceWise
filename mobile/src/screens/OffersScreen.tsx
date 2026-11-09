import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OfferCard } from "../components/OfferCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { Chip, ChipRow, contentWidth, ErrorState, FreshnessNotice, PageTitle, SkeletonList, StateView } from "../components/ui";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { useAddToCart } from "../services/useAddToCart";
import { OfferPage, Store } from "../types";
import { colors, spacing } from "../utils/theme";

export function OffersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const addToCart = useAddToCart();
  const [page, setPage] = useState<OfferPage | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(() => {
    Promise.all([api.offers({ storeId: selectedStoreId }), api.stores()])
      .then(([nextPage, nextStores]) => {
        setPage(nextPage);
        setStores(nextStores);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [selectedStoreId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const grouped = stores.map((store) => ({ store, count: page?.stores.find((item) => item.storeId === store.id)?.count ?? 0 }));
  const offers = page?.items ?? [];

  async function loadMore() {
    if (!page || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await api.offers({ storeId: selectedStoreId, page: page.page + 1 });
      setPage({ ...next, items: [...page.items, ...next.items] });
    } catch {
      // Кнопка лишається: можна спробувати ще раз.
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
      data={status === "ready" ? offers : []}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={contentWidth}>
          <PageTitle title="Акції магазинів" subtitle="Пропозиції, які були чинними на дату збору" />
          {status === "ready" ? (
            <>
              <FreshnessNotice collectedAt={page?.latestCheckedAt ?? null} detail="Акція могла вже закінчитися. Перевірте її на сайті чи в магазині." />
              <View style={styles.filters}>
                <ChipRow>
                  <Chip label="Усі" active={!selectedStoreId} onPress={() => setSelectedStoreId(undefined)} />
                  {grouped.map(({ store, count }) => (
                    <Chip key={store.id} label={`${store.name} · ${count}`} active={selectedStoreId === store.id} onPress={() => setSelectedStoreId(store.id)} />
                  ))}
                </ChipRow>
              </View>
            </>
          ) : null}
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
        ) : null
      }
      ListEmptyComponent={
        status === "ready" ? (
          <View style={contentWidth}>
            <StateView icon="tag" title="Акцій немає" text="Для цього магазину в базі немає акційних цін. Це не означає, що акцій немає в самому магазині." actionLabel="Показати всі акції" onAction={() => setSelectedStoreId(undefined)} />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  filters: { marginVertical: spacing.md },
  more: { marginTop: spacing.sm }
});
