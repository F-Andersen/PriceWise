import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "./theme";

/** Висота плаваючого меню разом із зазором: стільки місця лишає знизу кожна вкладка. */
export function useTabBarInset() {
  const insets = useSafeAreaInsets();
  return 68 + Math.max(insets.bottom, spacing.md) + spacing.md;
}
