import { Pressable, StyleSheet, Text, View } from "react-native";
import { Product } from "../types";
import { countLabel, formatPrice, minProductPrice, productImageForBestPrice, storeCount } from "../utils/prices";
import { colors, radii, shadow, spacing, type } from "../utils/theme";
import { Badge, IconButton, ProductImage } from "./ui";

type Props = {
  product: Product;
  onPress: () => void;
  onAdd?: () => void;
};

export function ProductCard({ product, onPress, onAdd }: Props) {
  const minPrice = minProductPrice(product);
  const stores = storeCount(product);
  const priceText = minPrice === null ? "Немає ціни" : `${stores > 1 ? "від " : ""}${formatPrice(minPrice)}`;

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${product.name}, ${product.volume}. ${priceText}. ${stores ? `Дані з ${countLabel(stores, "магазину", "магазинів", "магазинів")}` : "Даних про ціну немає"}`}
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <ProductImage uri={productImageForBestPrice(product)} size={76} />
        <View style={styles.content}>
          <Text style={type.bodyStrong} numberOfLines={2}>{product.name}</Text>
          <Text style={[type.small, styles.meta]} numberOfLines={1}>{product.volume} · {product.category}</Text>
          <Text style={[type.price, styles.price, minPrice === null && styles.noPrice]}>{priceText}</Text>
          {stores === 0 ? (
            <Badge label="Даних немає" tone="caution" />
          ) : stores === 1 ? (
            <Badge label="Лише 1 магазин" tone="caution" />
          ) : (
            <Badge label={`Дані з ${stores} магазинів`} />
          )}
        </View>
      </Pressable>
      {onAdd ? (
        <View style={styles.addWrap}>
          <IconButton icon="plus" tone="primary" label={`Додати в кошик: ${product.name}`} onPress={onAdd} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...shadow, flexDirection: "row", backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  main: { flex: 1, minWidth: 0, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  pressed: { opacity: 0.75 },
  content: { flex: 1, minWidth: 0 },
  meta: { marginTop: 2 },
  price: { marginTop: spacing.xs, marginBottom: spacing.xs },
  noPrice: { ...type.bodyStrong, color: colors.muted },
  addWrap: { justifyContent: "flex-end", paddingRight: spacing.md, paddingBottom: spacing.md }
});
