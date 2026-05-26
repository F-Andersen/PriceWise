import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Offer } from "../types";
import { colors, shadow } from "../utils/theme";

type Props = {
  offer: Offer;
  onPress?: () => void;
  layout?: "rail" | "list";
};

export function OfferCard({ offer, onPress, layout = "rail" }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.card, layout === "list" && styles.listCard, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>-{offer.discountPercent}%</Text>
      </View>
      <Image source={{ uri: offer.product.imageUrl }} style={styles.image} />
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.store}>{offer.store.name}</Text>
          <Text style={styles.label}>{offer.label}</Text>
        </View>
        <Text style={styles.name} numberOfLines={2}>{offer.product.name}</Text>
        <Text style={styles.meta}>{offer.product.volume} · {offer.product.category}</Text>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.oldPrice}>{offer.oldPrice} грн</Text>
            <Text style={styles.price}>{offer.price} грн</Text>
          </View>
          <Text style={styles.save}>Економія {offer.saveAmount} грн</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { ...shadow, width: 188, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, marginRight: 12 },
  listCard: { width: "100%", marginRight: 0, marginBottom: 12 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  badge: { position: "absolute", zIndex: 2, top: 10, right: 10, backgroundColor: "#ef4b3f", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  badgeText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  image: { width: "100%", height: 108, borderRadius: 12, backgroundColor: colors.surfaceMuted },
  body: { marginTop: 10 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  store: { color: colors.primary, fontWeight: "900", fontSize: 12 },
  label: { color: colors.warning, fontWeight: "900", fontSize: 11 },
  name: { color: colors.text, fontWeight: "800", marginTop: 7, minHeight: 40 },
  meta: { color: colors.muted, marginTop: 3, fontSize: 12 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10, gap: 8 },
  oldPrice: { color: colors.muted, textDecorationLine: "line-through", fontWeight: "700" },
  price: { color: "#ef4b3f", fontSize: 20, fontWeight: "900", marginTop: 1 },
  save: { flex: 1, color: colors.primaryDark, backgroundColor: colors.successSoft, borderRadius: 999, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, fontWeight: "900", textAlign: "center" }
});
