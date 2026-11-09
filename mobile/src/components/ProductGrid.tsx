import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Product } from "../types";
import { spacing } from "../utils/theme";
import { ProductCard } from "./ProductCard";

type Props = {
  products: Product[];
  onOpen: (product: Product) => void;
  onAdd: (product: Product) => void;
};

/** Дві колонки на телефоні, більше на широкому екрані. */
export function ProductGrid({ products, onOpen, onAdd }: Props) {
  const { width } = useWindowDimensions();
  const columns = width >= 1040 ? 4 : width >= 720 ? 3 : 2;
  return (
    <View style={styles.grid}>
      {products.map((product) => (
        <View key={product.id} style={[styles.cell, { width: `${100 / columns}%` }]}>
          <ProductCard product={product} onPress={() => onOpen(product)} onAdd={() => onAdd(product)} />
        </View>
      ))}
    </View>
  );
}

const CELL_GAP = spacing.sm / 2 + 2;

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -CELL_GAP },
  cell: { padding: CELL_GAP, flexDirection: "row" }
});
