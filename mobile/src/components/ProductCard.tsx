import { Pressable, StyleSheet, Text, View } from "react-native";
import { Product } from "../types";
import { countLabel, formatPrice, minProductPrice, productImageForBestPrice, storeCount } from "../utils/prices";
import { productTitle, unitPriceLabel, volumeLabel } from "../utils/productText";
import { colors, fonts, radii, spacing, type } from "../utils/theme";
import { IconButton, ProductImage } from "./ui";

type Props = {
  product: Product;
  onPress: () => void;
  onAdd?: () => void;
};

/** Плоска клітинка каталогу: межі малює ProductGrid. */
export function ProductCard({ product, onPress, onAdd }: Props) {
  const minPrice = minProductPrice(product);
  const stores = storeCount(product);
  const priceText = minPrice === null ? "Немає ціни" : `${stores > 1 ? "від " : ""}${formatPrice(minPrice)}`;
  const perUnit = minPrice === null ? null : unitPriceLabel(minPrice, product.volume);
  const title = productTitle(product);
  const volume = volumeLabel(product.volume);
  const storesText = stores === 0 ? "Даних немає" : stores === 1 ? "Лише 1 магазин" : countLabel(stores, "магазин", "магазини", "магазинів");

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${product.name}, ${product.volume}. ${priceText}${perUnit ? `, ${perUnit}` : ""}. ${stores ? `Дані з ${countLabel(stores, "магазину", "магазинів", "магазинів")}` : "Даних про ціну немає"}`}
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <View>
          <View>
            <ProductImage uri={productImageForBestPrice(product)} height={124} />
            {volume ? (
              <View style={styles.volumeTag}>
                <Text style={styles.volumeText} numberOfLines={1}>{volume}</Text>
              </View>
            ) : null}
          </View>
          {title.brand ? <Text style={styles.brand} numberOfLines={1}>{title.brand}</Text> : null}
          <Text style={[styles.name, !title.brand && styles.nameAlone]} numberOfLines={2}>{title.name}</Text>
        </View>
        <View style={styles.prices}>
          {minPrice === null ? (
            <Text style={type.small} numberOfLines={1}>Немає ціни</Text>
          ) : (
            <Text style={type.price} numberOfLines={1}>
              {stores > 1 ? <Text style={styles.from}>від </Text> : null}
              {formatPrice(minPrice)}
            </Text>
          )}
          {perUnit ? <Text style={styles.unit} numberOfLines={1}>{perUnit}</Text> : null}
          <Text style={[styles.stores, stores < 2 && styles.storesCaution]} numberOfLines={1}>{storesText}</Text>
        </View>
      </Pressable>
      {onAdd ? (
        <View style={styles.add}>
          <IconButton icon="plus" tone="primary" size={36} label={`Додати в кошик: ${product.name}`} onPress={onAdd} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.surface, padding: spacing.md },
  main: { flex: 1, minWidth: 0, justifyContent: "space-between" },
  pressed: { opacity: 0.7 },
  volumeTag: { position: "absolute", left: 0, bottom: 0, maxWidth: "100%", paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.xs, backgroundColor: colors.text },
  volumeText: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15, color: colors.onPrimary },
  brand: { marginTop: spacing.sm, fontFamily: fonts.extrabold, fontSize: 14, lineHeight: 19, color: colors.text },
  name: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textSoft },
  nameAlone: { marginTop: spacing.sm },
  prices: { marginTop: spacing.sm },
  from: { ...type.small, color: colors.muted },
  unit: { ...type.label, fontFamily: fonts.medium, color: colors.textSoft },
  stores: { ...type.label, fontFamily: fonts.medium, marginTop: 2 },
  storesCaution: { color: colors.caution },
  add: { position: "absolute", top: spacing.sm, right: spacing.sm }
});
