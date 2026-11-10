import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "./theme";

/** Висота нижнього меню разом із безпечною зоною телефона. */
export function useTabBarHeight() {
  const insets = useSafeAreaInsets();
  return 57 + Math.max(insets.bottom, spacing.sm);
}

/** Скільки місця лишає знизу кожна вкладка, щоб контент не ховався за меню. */
export function useTabBarInset() {
  return useTabBarHeight() + spacing.lg;
}
