import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Offer } from "../types";
import { colors, radii, shadow } from "../utils/theme";

type Props = {
  offer: Offer;
  onPress?: () => void;
  layout?: "rail" | "list";
};

export function OfferCard({ offer, onPress, layout = "rail" }: Props) {
  const imageUrl = offer.imageUrl || offer.product.imageUrl;
  const isList = layout === "list";

  return (
    <Pressable style={({ pressed }) => [styles.card, isList && styles.listCard, pressed && styles.pressed]} onPress={onPress}>
      <View style={[styles.discountBadge, isList && styles.listDiscountBadge]}>
        <Text style={styles.discountText}>-{offer.discountPercent}%</Text>
      </View>

      <View style={[styles.imageWrap, isList && styles.listImageWrap]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
        ) : (
          <Text style={[styles.imageFallback, isList && styles.listImageFallback]}>PW</Text>
        )}
      </View>

      <View style={[styles.body, isList && styles.listBody]}>
        <View style={styles.top}>
          <Text style={styles.store} numberOfLines={1}>{offer.store.name}</Text>
          <Text style={styles.label}>{offer.label || "Акція"}</Text>
        </View>

        <Text style={[styles.name, isList && styles.listName]} numberOfLines={2}>{offer.product.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>{offer.product.volume} · {offer.product.category}</Text>

        <View style={[styles.priceRow, isList && styles.listPriceRow]}>
          <View>
            <Text style={styles.oldPrice}>{offer.oldPrice} грн</Text>
            <Text style={styles.price}>{offer.price} грн</Text>
          </View>
          <Text style={[styles.save, isList && styles.listSave]} numberOfLines={isList ? 1 : 2}>Економія {offer.saveAmount} грн</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadow,
    width: 184,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginRight: 12
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    minHeight: 124,
    marginRight: 0,
    marginBottom: 12,
    padding: 12
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },
  discountBadge: {
    position: "absolute",
    zIndex: 2,
    top: 11,
    right: 11,
    backgroundColor: colors.danger,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  listDiscountBadge: {
    top: 10,
    right: 10
  },
  discountText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12
  },
  imageWrap: {
    height: 104,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden"
  },
  listImageWrap: {
    width: 96,
    height: 96,
    borderRadius: 18,
    flexShrink: 0,
    backgroundColor: colors.surfaceMuted
  },
  image: {
    width: "100%",
    height: "100%"
  },
  imageFallback: {
    color: colors.warning,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 104
  },
  listImageFallback: {
    lineHeight: 96
  },
  body: {
    marginTop: 10
  },
  listBody: {
    flex: 1,
    alignSelf: "stretch",
    justifyContent: "center",
    marginTop: 0,
    marginLeft: 12,
    paddingRight: 2
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  store: {
    flex: 1,
    color: colors.primary,
    fontWeight: "900",
    fontSize: 12
  },
  label: {
    color: colors.warning,
    backgroundColor: colors.amberSoft,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontWeight: "900",
    fontSize: 10
  },
  name: {
    color: colors.text,
    fontWeight: "900",
    marginTop: 8,
    minHeight: 38,
    lineHeight: 19
  },
  listName: {
    minHeight: 0,
    marginTop: 7,
    fontSize: 15,
    lineHeight: 19
  },
  meta: {
    color: colors.muted,
    marginTop: 3,
    fontSize: 12
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 10,
    gap: 8
  },
  listPriceRow: {
    marginTop: 8,
    alignItems: "center"
  },
  oldPrice: {
    color: colors.muted,
    textDecorationLine: "line-through",
    fontWeight: "700",
    fontSize: 12
  },
  price: {
    color: colors.danger,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 1
  },
  save: {
    flex: 1,
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center"
  },
  listSave: {
    maxWidth: 132,
    paddingHorizontal: 9,
    paddingVertical: 7
  }
});
