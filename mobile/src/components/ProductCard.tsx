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
        <ProductImage uri={productImageForBestPrice(product)} height={128} />
        <Text style={[type.bodyStrong, styles.name]} numberOfLines={2}>{product.name}</Text>
        <Text style={type.small} numberOfLines={1}>{product.volume}</Text>
        <View style={styles.badge}>
          {stores === 0 ? (
            <Badge label="Даних немає" tone="caution" />
          ) : stores === 1 ? (
            <Badge label="Лише 1 магазин" tone="caution" />
          ) : (
            <Badge label={countLabel(stores, "магазин", "магазини", "магазинів")} />
          )}
        </View>
      </Pressable>
      {minPrice === null ? (
        <Text style={[type.small, styles.price]} numberOfLines={1}>Немає ціни</Text>
      ) : (
        <Text style={[type.price, styles.price]} numberOfLines={1}>
          {stores > 1 ? <Text style={styles.from}>від </Text> : null}
          {formatPrice(minPrice)}
        </Text>
      )}
      {onAdd ? (
        <View style={styles.add}>
          <IconButton icon="plus" tone="primary" size={36} label={`Додати в кошик: ${product.name}`} onPress={onAdd} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...shadow, flex: 1, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, justifyContent: "space-between" },
  main: { minWidth: 0 },
  pressed: { opacity: 0.75 },
  name: { marginTop: spacing.sm, minHeight: 42 },
  badge: { marginTop: spacing.sm },
  price: { marginTop: spacing.sm },
  from: { ...type.small, color: colors.muted },
  add: { position: "absolute", top: spacing.sm, right: spacing.sm }
});
