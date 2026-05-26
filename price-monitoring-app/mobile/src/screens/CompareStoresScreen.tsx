import { RouteProp, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { api } from "../services/api";
import { RootStackParamList } from "../navigation/AppNavigator";
import { ComparisonResult } from "../types";
import { colors, shadow } from "../utils/theme";

export function CompareStoresScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "CompareStores">>();
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    api.compare(route.params.listId).then(setResults).catch((error) => Alert.alert("Порівняння", error.message));
    api.recommendations(route.params.listId).then(setRecommendations).catch(() => setRecommendations([]));
  }, [route.params.listId]);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={results}
      keyExtractor={(item) => item.store.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.kicker}>Оптимізація витрат</Text>
          <Text style={styles.title}>Де кошик дешевший?</Text>
          <Text style={styles.subtitle}>Порівняння враховує доступність товарів, акції та різницю з найнижчою сумою.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={[styles.card, item.isBest && styles.best]}>
          <View style={styles.top}>
            <Text style={styles.store}>{item.store.name}</Text>
            {item.isBest ? <Text style={styles.badge}>Найвигідніше</Text> : <Text style={styles.diff}>+{item.difference} грн</Text>}
          </View>
          <Text style={styles.total}>{item.totalPrice} грн</Text>
          <View style={styles.metrics}>
            <Text style={styles.metric}>Знайдено {item.foundCount}</Text>
            <Text style={styles.metric}>Відсутньо {item.missingCount}</Text>
          </View>
          {item.missingProducts.length ? <Text style={styles.missing}>Немає: {item.missingProducts.join(", ")}</Text> : null}
        </View>
      )}
      ListFooterComponent={
        <View>
          <Text style={styles.section}>Рекомендації для економії</Text>
          {recommendations.map((item, index) => (
            <View key={`${item.type}-${index}`} style={styles.rec}>
              <Text style={styles.recText}>{item.message}</Text>
            </View>
          ))}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  header: { ...shadow, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  kicker: { color: colors.secondary, fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginBottom: 6 },
  title: { color: colors.text, fontSize: 25, fontWeight: "900" },
  subtitle: { color: colors.muted, marginTop: 6, lineHeight: 20 },
  card: { ...shadow, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 15, marginBottom: 12 },
  best: { borderColor: colors.primary, backgroundColor: "#f0fbf5" },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  store: { color: colors.text, fontWeight: "900", fontSize: 18 },
  total: { color: colors.primary, fontSize: 32, fontWeight: "900", marginTop: 7 },
  metrics: { flexDirection: "row", gap: 8, marginTop: 9 },
  metric: { color: colors.muted, backgroundColor: colors.surfaceMuted, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, overflow: "hidden", fontWeight: "700", fontSize: 12 },
  missing: { color: colors.warning, marginTop: 8, lineHeight: 18 },
  badge: { color: colors.primaryDark, backgroundColor: colors.successSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: "hidden", fontWeight: "900" },
  diff: { color: colors.muted, fontWeight: "900" },
  section: { fontSize: 18, fontWeight: "900", color: colors.text, marginTop: 18, marginBottom: 10 },
  rec: { ...shadow, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 9 },
  recText: { color: colors.text, fontWeight: "700", lineHeight: 20 }
});
