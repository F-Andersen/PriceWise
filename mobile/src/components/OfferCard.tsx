import { Pressable, StyleSheet, Text, View } from "react-native";
import { Offer } from "../types";
import { checkedAt, formatDate, formatPrice, promoUntilLabel } from "../utils/prices";
import { colors, radii, shadow, spacing, type } from "../utils/theme";
import { Badge, IconButton, ProductImage } from "./ui";

type Props = {
  offer: Offer;
  onPress?: () => void;
  onAdd?: () => void;
  layout?: "rail" | "list";
};

export function OfferCard({ offer, onPress, onAdd, layout = "rail" }: Props) {
  const imageUrl = offer.imageUrl || offer.product.imageUrl;
  const isList = layout === "list";
  const a11y = `${offer.product.name}, ${offer.store.name}. ${formatPrice(offer.price)}, була ${formatPrice(offer.oldPrice)}, знижка ${offer.discountPercent}%${offer.promoEndsAt ? `, акція ${promoUntilLabel(offer.promoEndsAt)}` : ""}. Станом на ${formatDate(checkedAt(offer))}`;

  const details = (
    <>
      <Text style={styles.store} numberOfLines={1}>{offer.store.name}</Text>
      <Text style={[type.bodyStrong, !isList && styles.railName]} numberOfLines={2}>{offer.product.name}</Text>
      <View style={styles.priceRow}>
        <Text style={type.price}>{formatPrice(offer.price)}</Text>
        <Text style={styles.oldPrice}>{formatPrice(offer.oldPrice)}</Text>
      </View>
      {offer.promoEndsAt ? <Text style={styles.promoEnd}>акція {promoUntilLabel(offer.promoEndsAt)}</Text> : null}
      <Text style={styles.date}>станом на {formatDate(checkedAt(offer))}</Text>
    </>
  );

  if (!isList) {
    return (
      <Pressable accessibilityRole="link" accessibilityLabel={a11y} style={({ pressed }) => [styles.rail, pressed && styles.pressed]} onPress={onPress}>
        <View style={styles.railImage}>
          <ProductImage uri={imageUrl} height={112} />
          <View style={styles.floatingBadge}><Badge label={`−${offer.discountPercent}%`} tone="deal" /></View>
        </View>
        <View style={styles.railBody}>{details}</View>
      </Pressable>
    );
  }

  return (
    <View style={styles.list}>
      <Pressable accessibilityRole="link" accessibilityLabel={a11y} style={({ pressed }) => [styles.listMain, pressed && styles.pressed]} onPress={onPress}>
        <View>
          <ProductImage uri={imageUrl} size={84} />
          <View style={styles.listBadge}><Badge label={`−${offer.discountPercent}%`} tone="deal" /></View>
        </View>
        <View style={styles.listBody}>{details}</View>
      </Pressable>
      {onAdd ? (
        <View style={styles.addWrap}>
          <IconButton icon="plus" tone="primary" label={`Додати в кошик: ${offer.product.name}`} onPress={onAdd} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  rail: { ...shadow, width: 196, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  railImage: { position: "relative" },
  floatingBadge: { position: "absolute", top: spacing.sm, left: spacing.sm },
  railBody: { marginTop: spacing.sm },
  railName: { minHeight: 42 },
  store: { ...type.label, color: colors.textSoft, marginBottom: 2 },
  priceRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: spacing.sm, marginTop: spacing.xs },
  oldPrice: { ...type.small, ...type.numeric, textDecorationLine: "line-through" },
  date: { ...type.small, fontSize: 12, marginTop: 2 },
  promoEnd: { ...type.small, fontSize: 12, marginTop: 2, color: colors.deal },
  list: { ...shadow, flexDirection: "row", backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  listMain: { flex: 1, minWidth: 0, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  listBadge: { position: "absolute", top: spacing.xs, left: spacing.xs },
  listBody: { flex: 1, minWidth: 0 },
  addWrap: { justifyContent: "flex-end", paddingRight: spacing.md, paddingBottom: spacing.md }
});
