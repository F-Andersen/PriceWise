import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Product } from "../types";
import { colors, shadow } from "../utils/theme";
import { minProductPrice } from "../utils/prices";

type Props = {
  product: Product;
  onPress: () => void;
};

export function ProductCard({ product, onPress }: Props) {
  const minPrice = minProductPrice(product);
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: product.imageUrl }} style={styles.image} />
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.category}>{product.category}</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.brand}>{product.brand} · {product.volume}</Text>
        <View style={styles.row}>
          <Text style={styles.price}>{minPrice ? `від ${minPrice} грн` : "немає ціни"}</Text>
          <Text style={styles.badge}>Найнижча</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { ...shadow, flexDirection: "row", backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  imageWrap: { width: 82, height: 82, borderRadius: 12, backgroundColor: colors.surfaceMuted, overflow: "hidden" },
  image: { width: 82, height: 82 },
  content: { flex: 1, marginLeft: 12, justifyContent: "center" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  category: { color: colors.secondary, fontSize: 12, fontWeight: "800", marginBottom: 2 },
  chevron: { color: colors.muted, fontSize: 24, lineHeight: 24 },
  name: { color: colors.text, fontSize: 16, fontWeight: "800" },
  brand: { color: colors.muted, marginTop: 3 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 },
  price: { color: colors.primary, fontWeight: "900" },
  badge: { color: colors.primaryDark, backgroundColor: colors.successSoft, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, fontSize: 12, fontWeight: "800" }
});
