import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { useToast } from "../components/Toast";
import { RootStackParamList } from "../navigation/AppNavigator";
import { Product } from "../types";
import { SessionExpiredError } from "./api";
import { useAuth } from "./AuthContext";
import { addToActiveList } from "./cart";

const LOGIN_REASON = "Увійдіть, і товар одразу з'явиться у вашому кошику.";

export function useAddToCart() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const { withAuth } = useAuth();

  return useCallback(
    (product: Pick<Product, "id" | "name">) => {
      const add = async () => {
        try {
          await addToActiveList(product.id);
          toast(`Додано: ${product.name}`, {
            actionLabel: "До кошика",
            onAction: () => navigation.popTo("Tabs", { screen: "Cart" })
          });
        } catch (error) {
          if (error instanceof SessionExpiredError) await withAuth(add, LOGIN_REASON);
          else toast("Не вдалося додати товар. Спробуйте ще раз.", { kind: "error" });
        }
      };
      return withAuth(add, LOGIN_REASON);
    },
    [navigation, toast, withAuth]
  );
}
