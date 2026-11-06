import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OfferCard } from "../components/OfferCard";
import { Chip, ChipRow, contentWidth, ErrorState, FreshnessNotice, PageTitle, SkeletonList, StateView } from "../components/ui";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { useAddToCart } from "../services/useAddToCart";
import { Offer, Store } from "../types";
import { colors, spacing } from "../utils/theme";

export function OffersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const addToCart = useAddToCart();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(() => {
    Promise.all([api.offers(selectedStoreId), api.offers(), api.stores()])
      .then(([nextOffers, everyOffer, nextStores]) => {
        setOffers(nextOffers);
        setAllOffers(everyOffer);
        setStores(nextStores);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [selectedStoreId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const grouped = useMemo(
    () => stores.map((store) => ({ store, count: allOffers.filter((offer) => offer.store.id === store.id).length })),
    [allOffers, stores]
  );

  const newest = allOffers.reduce<string | null>((latest, offer) => (!latest || +new Date(offer.dateCollected) > +new Date(latest) ? offer.dateCollected : latest), null);

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
              <FreshnessNotice collectedAt={newest} detail="Акція могла вже закінчитися. Перевірте її на сайті чи в магазині." />
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
  filters: { marginVertical: spacing.md }
});
