import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Alert, Dimensions, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { PrimaryButton } from "../components/PrimaryButton";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { Product } from "../types";
import { activePrice, averageLatestPrice, latestByStore, minProductPrice, productImageForBestPrice } from "../utils/prices";

export function ProductDetailsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "ProductDetails">>();
  const [product, setProduct] = useState<Product | null>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);

  useEffect(() => {
    api.product(route.params.productId).then(setProduct).catch((error) => Alert.alert("Товар", error.message));
    api.alternatives(route.params.productId).then(setAlternatives).catch(() => setAlternatives([]));
  }, [route.params.productId]);

  async function addToCart() {
    if (!product) return;
    let listId = await AsyncStorage.getItem("activeListId");
    if (!listId) {
      const list = await api.createList("Мій кошик");
      listId = list.id;
      await AsyncStorage.setItem("activeListId", listId);
    }
    await api.addItem(listId, product.id, 1);
    Alert.alert("Додано", `${product.name} додано в кошик`);
  }

  if (!product) return <View style={styles.container}><Text>Завантаження...</Text></View>;

  const latest = latestByStore(product.prices);
  const history = (product.prices || []).slice(-8);
  const chartData = history.length ? history.map(activePrice) : [0];
  const imageUrl = productImageForBestPrice(product);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} /> : null}
      <Text style={styles.category}>{product.category}</Text>
      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.meta}>{product.brand} · {product.volume} · {product.unit}</Text>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>Найнижча: {minProductPrice(product)} грн</Text>
        <Text style={styles.summaryText}>Середня: {averageLatestPrice(product)} грн</Text>
      </View>
      <PrimaryButton title="Додати в кошик" onPress={addToCart} />

      <Text style={styles.section}>Ціни в магазинах</Text>
      {latest.map((price) => (
        <View key={price.id} style={styles.priceRow}>
          <View>
            <Text style={styles.store}>{price.store.name}</Text>
            <Text style={styles.date}>{new Date(price.dateCollected).toLocaleDateString()}</Text>
            {price.sourceUrl ? (
              <Pressable onPress={() => Linking.openURL(price.sourceUrl!)}>
                <Text style={styles.sourceLink}>Відкрити товар</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.price}>{activePrice(price)} грн</Text>
            {price.discountPrice ? <Text style={styles.discount}>Акція</Text> : null}
          </View>
        </View>
      ))}

      <Text style={styles.section}>Історія ціни</Text>
      <LineChart
        data={{ labels: history.map((_, index) => String(index + 1)), datasets: [{ data: chartData }] }}
        width={Dimensions.get("window").width - 32}
        height={190}
        yAxisSuffix="₴"
        chartConfig={{ backgroundColor: "#fff", backgroundGradientFrom: "#fff", backgroundGradientTo: "#fff", decimalPlaces: 0, color: () => "#116a43", labelColor: () => "#60736b" }}
        bezier
        style={styles.chart}
      />

      <Text style={styles.section}>Схожі дешевші товари</Text>
      {alternatives.length ? alternatives.map((item) => (
        <View key={item.product.id} style={styles.alt}>
          <Text style={styles.store}>{item.product.name}</Text>
          <Text style={styles.discount}>Економія {item.saveAmount} грн</Text>
        </View>
      )) : <Text style={styles.empty}>Дешевших аналогів поки не знайдено.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7fbf9" },
  content: { padding: 16 },
  image: { height: 210, borderRadius: 8, backgroundColor: "#e7f3ee" },
  category: { marginTop: 14, color: "#4a7c68", fontWeight: "700" },
  title: { color: "#10251c", fontSize: 26, fontWeight: "900", marginTop: 3 },
  meta: { color: "#60736b", marginTop: 4, marginBottom: 14 },
  summary: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#e7f3ee", padding: 12, borderRadius: 8, marginBottom: 12 },
  summaryText: { color: "#0d5f3c", fontWeight: "800" },
  section: { fontSize: 18, fontWeight: "800", color: "#17231e", marginTop: 22, marginBottom: 10 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#fff", borderColor: "#e4ece8", borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
  store: { color: "#17231e", fontWeight: "800" },
  date: { color: "#60736b", marginTop: 2 },
  sourceLink: { color: "#0e7a43", fontWeight: "800", marginTop: 6 },
  price: { color: "#0e7a43", fontWeight: "900", fontSize: 16 },
  discount: { color: "#0e7a43", backgroundColor: "#dff5e9", overflow: "hidden", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  chart: { borderRadius: 8 },
  alt: { backgroundColor: "#fff", borderColor: "#e4ece8", borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
  empty: { color: "#60736b" }
});
