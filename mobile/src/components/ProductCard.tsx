import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Product } from "../types";
import { minProductPrice, productImageForBestPrice } from "../utils/prices";
import { colors, radii, shadow } from "../utils/theme";

type Props = {
  product: Product;
  onPress: () => void;
};

export function ProductCard({ product, onPress }: Props) {
  const minPrice = minProductPrice(product);
  const imageUrl = productImageForBestPrice(product);

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.imageWrap}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} /> : <Text style={styles.imageFallback}>PW</Text>}
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.category} numberOfLines={1}>{product.category}</Text>
          <Text style={styles.chevron}>›</Text>
        </View>

        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.brand} numberOfLines={1}>{product.brand} · {product.volume}</Text>

        <View style={styles.bottomRow}>
          <Text style={styles.price}>{minPrice ? `від ${minPrice} грн` : "немає ціни"}</Text>
          <Text style={styles.badge}>Найнижча ціна</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadow,
    flexDirection: "row",
    minHeight: 118,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2EDE8"
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },
  imageWrap: {
    width: 88,
    height: 88,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
    alignSelf: "center"
  },
  image: {
    width: "100%",
    height: "100%"
  },
  imageFallback: {
    color: colors.primary,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 88
  },
  content: {
    flex: 1,
    marginLeft: 13,
    justifyContent: "space-between"
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  category: {
    flex: 1,
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  chevron: {
    color: colors.muted,
    fontSize: 24,
    lineHeight: 24
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: 2
  },
  brand: {
    color: colors.muted,
    marginTop: 3,
    fontSize: 13
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 8
  },
  price: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: 16
  },
  badge: {
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden"
  }
});
