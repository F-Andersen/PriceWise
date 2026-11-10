import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Product } from "../types";
import { colors, spacing } from "../utils/theme";
import { ProductCard } from "./ProductCard";

type Props = {
  products: Product[];
  onOpen: (product: Product) => void;
  onAdd: (product: Product) => void;
};

/** Сітка з тонких ліній: на телефоні на всю ширину, на широкому екрані в колонці сторінки. */
export function ProductGrid({ products, onOpen, onAdd }: Props) {
  const { width } = useWindowDimensions();
  const columns = width >= 1040 ? 4 : width >= 720 ? 3 : 2;
  const edgeToEdge = columns === 2;
  return (
    <View style={[styles.grid, edgeToEdge ? styles.gridBleed : styles.gridFramed]}>
      {products.map((product, index) => (
        <View key={product.id} style={[styles.cell, { width: `${100 / columns}%` }, edgeToEdge && (index + 1) % columns === 0 && styles.cellLast]}>
          <ProductCard product={product} onPress={() => onOpen(product)} onAdd={() => onAdd(product)} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderColor: colors.border },
  gridBleed: { marginHorizontal: -spacing.lg },
  gridFramed: { borderLeftWidth: 1 },
  cell: { flexDirection: "row", borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  cellLast: { borderRightWidth: 0 }
});
