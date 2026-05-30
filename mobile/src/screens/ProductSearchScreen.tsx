import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ProductCard } from "../components/ProductCard";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { Product } from "../types";
import { colors, shadow } from "../utils/theme";

export function ProductSearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Усі");

  useEffect(() => {
    const timer = setTimeout(() => {
      api.searchProducts(query).then(setProducts).catch((error) => Alert.alert("Пошук", error.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const categories = useMemo(() => ["Усі", ...Array.from(new Set(products.map((product) => product.category)))], [products]);
  const filtered = category === "Усі" ? products : products.filter((product) => product.category === category);

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Text style={styles.title}>Пошук товарів</Text>
        <TextInput value={query} onChangeText={setQuery} placeholder="Назва, бренд або категорія" placeholderTextColor={colors.muted} style={styles.input} />
      </View>
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
        contentContainerStyle={styles.categoryListContent}
        renderItem={({ item }) => (
          <Pressable onPress={() => setCategory(item)} style={[styles.chip, item === category && styles.chipActive]}>
            <Text style={[styles.chipText, item === category && styles.chipTextActive]}>{item}</Text>
          </Pressable>
        )}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProductCard product={item} onPress={() => navigation.navigate("ProductDetails", { productId: item.id })} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.productListContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  searchBox: { ...shadow, backgroundColor: colors.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900", marginBottom: 10 },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 13, color: colors.text },
  categoryList: { flexGrow: 0, flexShrink: 0, height: 48, marginBottom: 10 },
  categoryListContent: { alignItems: "center", paddingRight: 8 },
  chip: { minHeight: 36, paddingHorizontal: 13, justifyContent: "center", backgroundColor: colors.surface, borderRadius: 999, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontWeight: "800" },
  chipTextActive: { color: "#fff" },
  productListContent: { paddingTop: 12, paddingBottom: 118 }
});
