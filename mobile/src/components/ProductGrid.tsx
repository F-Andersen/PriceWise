import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Product } from "../types";
import { layout, spacing } from "../utils/theme";
import { ProductCard } from "./ProductCard";

type Props = {
  products: Product[];
  onOpen: (product: Product) => void;
  onAdd: (product: Product) => void;
};

/** Одна колонка на телефоні, дві на ширшому екрані. */
export function ProductGrid({ products, onOpen, onAdd }: Props) {
  const { width } = useWindowDimensions();
  const twoColumns = width >= layout.twoColumns;
  return (
    <View style={styles.grid}>
      {products.map((product) => (
        <View key={product.id} style={twoColumns ? styles.half : styles.full}>
          <ProductCard product={product} onPress={() => onOpen(product)} onAdd={() => onAdd(product)} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing.md },
  full: { width: "100%" },
  half: { width: "48.8%", flexGrow: 1 }
});
