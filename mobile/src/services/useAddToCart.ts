import { useNavigation } from "@react-navigation/native";
import { useCallback } from "react";
import { useToast } from "../components/Toast";
import { Product } from "../types";
import { addToActiveList } from "./cart";

export function useAddToCart() {
  const navigation = useNavigation();
  const toast = useToast();

  return useCallback(
    async (product: Pick<Product, "id" | "name">) => {
      try {
        await addToActiveList(product.id);
        toast(`Додано: ${product.name}`, {
          actionLabel: "До кошика",
          onAction: () => navigation.navigate("Cart" as never)
        });
      } catch {
        toast("Не вдалося додати товар. Спробуйте ще раз.", { kind: "error" });
      }
    },
    [navigation, toast]
  );
}
