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

  return (
    <Pressable style={({ pressed }) => [styles.card, layout === "list" && styles.listCard, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.discountBadge}>
        <Text style={styles.discountText}>-{offer.discountPercent}%</Text>
      </View>

      <View style={styles.imageWrap}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} /> : <Text style={styles.imageFallback}>PW</Text>}
      </View>

      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.store} numberOfLines={1}>{offer.store.name}</Text>
          <Text style={styles.label}>{offer.label || "Акція"}</Text>
        </View>

        <Text style={styles.name} numberOfLines={2}>{offer.product.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>{offer.product.volume} · {offer.product.category}</Text>

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.oldPrice}>{offer.oldPrice} грн</Text>
            <Text style={styles.price}>{offer.price} грн</Text>
          </View>
          <Text style={styles.save} numberOfLines={2}>Економія {offer.saveAmount} грн</Text>
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
    width: "100%",
    marginRight: 0,
    marginBottom: 12
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
  discountText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12
  },
  imageWrap: {
    height: 104,
    borderRadius: 16,
    backgroundColor: colors.amberSoft,
    overflow: "hidden"
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
  body: {
    marginTop: 10
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
  }
});
