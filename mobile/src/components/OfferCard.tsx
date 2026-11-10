import { Pressable, StyleSheet, Text, View } from "react-native";
import { Offer } from "../types";
import { checkedAt, formatDate, formatPrice, promoUntilLabel } from "../utils/prices";
import { productTitle, unitPriceLabel, volumeLabel } from "../utils/productText";
import { colors, fonts, spacing, type } from "../utils/theme";
import { Badge, IconButton, ProductImage, VolumeTag } from "./ui";

type Props = {
  offer: Offer;
  onPress?: () => void;
  onAdd?: () => void;
  layout?: "rail" | "list";
};

/** Плоска акція: клітинка стрічки на головній або рядок списку. Межі — тонкі лінії. */
export function OfferCard({ offer, onPress, onAdd, layout = "rail" }: Props) {
  const imageUrl = offer.imageUrl || offer.product.imageUrl;
  const isList = layout === "list";
  const title = productTitle(offer.product);
  const volume = volumeLabel(offer.product.volume);
  const perUnit = isList ? unitPriceLabel(offer.price, offer.product.volume) : null;
  const a11y = `${offer.product.name}, ${offer.store.name}. ${formatPrice(offer.price)}, була ${formatPrice(offer.oldPrice)}, знижка ${offer.discountPercent}%, економія ${formatPrice(offer.saveAmount)}${offer.promoEndsAt ? `, акція ${promoUntilLabel(offer.promoEndsAt)}` : ""}. Станом на ${formatDate(checkedAt(offer))}`;

  const details = (
    <>
      <Text style={styles.store} numberOfLines={1}>{offer.store.name}</Text>
      {title.brand ? <Text style={styles.brand} numberOfLines={1}>{title.brand}</Text> : null}
      <Text style={[styles.name, !isList && styles.railName]} numberOfLines={2}>{title.name}</Text>
      <View style={styles.priceRow}>
        <Text style={type.price}>{formatPrice(offer.price)}</Text>
        <Text style={styles.oldPrice}>{formatPrice(offer.oldPrice)}</Text>
      </View>
      {perUnit ? <Text style={styles.unit} numberOfLines={1}>{perUnit}</Text> : null}
      <Text style={styles.saving} numberOfLines={1}>Економія {formatPrice(offer.saveAmount)}</Text>
      <Text style={styles.date} numberOfLines={1}>
        {offer.promoEndsAt ? `${promoUntilLabel(offer.promoEndsAt)} · ` : ""}дані на {formatDate(checkedAt(offer)).slice(0, 5)}
      </Text>
    </>
  );

  const badge = <View style={styles.badge}><Badge label={`−${offer.discountPercent}%`} tone="deal" /></View>;
  const tag = volume ? <VolumeTag label={volume} /> : null;

  if (!isList) {
    return (
      <Pressable accessibilityRole="link" accessibilityLabel={a11y} style={({ pressed }) => [styles.rail, pressed && styles.pressed]} onPress={onPress}>
        <View>
          <ProductImage uri={imageUrl} height={112} />
          {badge}
          {tag}
        </View>
        <View style={styles.railBody}>{details}</View>
      </Pressable>
    );
  }

  return (
    <View style={styles.list}>
      <Pressable accessibilityRole="link" accessibilityLabel={a11y} style={({ pressed }) => [styles.listMain, pressed && styles.pressed]} onPress={onPress}>
        <View style={styles.listImage}>
          <ProductImage uri={imageUrl} size={96} />
          {badge}
          {tag}
        </View>
        <View style={styles.listBody}>{details}</View>
      </Pressable>
      {onAdd ? (
        <View style={styles.addWrap}>
          <IconButton icon="plus" tone="primary" size={36} label={`Додати в кошик: ${offer.product.name}`} onPress={onAdd} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  badge: { position: "absolute", top: 0, left: 0 },
  rail: { width: 172, backgroundColor: colors.surface, padding: spacing.md, borderRightWidth: 1, borderRightColor: colors.border },
  railBody: { marginTop: spacing.sm },
  railName: { minHeight: 36 },
  store: { ...type.label, fontFamily: fonts.medium, color: colors.textSoft },
  brand: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.text, marginTop: 2 },
  name: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textSoft, marginTop: 2 },
  priceRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: spacing.sm, marginTop: spacing.xs },
  oldPrice: { ...type.small, ...type.numeric, textDecorationLine: "line-through" },
  unit: { ...type.label, fontFamily: fonts.medium, color: colors.textSoft },
  saving: { ...type.label, ...type.numeric, color: colors.deal, marginTop: 2 },
  date: { ...type.label, fontFamily: fonts.medium, marginTop: 2 },
  list: { flexDirection: "row", backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  listMain: { flex: 1, minWidth: 0, flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md },
  listImage: { width: 96 },
  listBody: { flex: 1, minWidth: 0 },
  addWrap: { justifyContent: "flex-end", paddingLeft: spacing.sm, paddingBottom: spacing.md }
});
