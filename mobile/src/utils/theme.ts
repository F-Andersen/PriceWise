import { TextStyle } from "react-native";

/**
 * Візуальна система PriceWise: біле тло, чорний текст і нейтральні сірі без відтінку.
 * Колір лише там, де він щось означає, і завжди суцільний: червоний — знижка,
 * зелений — найкраща ціна. Пари текст/тло мають контраст щонайменше 4.5:1.
 */
export const colors = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceMuted: "#F2F2F2",
  text: "#1A1A1A",
  textSoft: "#444444",
  muted: "#6B6B6B",
  border: "#E2E2E2",
  borderStrong: "#8C8C8C",

  primary: "#1A1A1A",
  primaryDark: "#000000",

  // Найнижча ціна, рекомендація
  positive: "#1B7A3D",

  // Неповні або застарілі дані
  caution: "#8A5200",

  // Схожий, не ідентичний товар
  similar: "#2B5C8F",

  // Знижка від магазину
  deal: "#C8102E",

  danger: "#B3261E",

  onPrimary: "#FFFFFF"
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radii = { xs: 4, sm: 6, md: 8, lg: 10, xl: 12, pill: 999 };

export const layout = {
  /** Колонка для тексту й форм на широкому екрані. */
  maxContent: 760,
  /** Ширша колонка для вітрин із товарами. */
  maxWide: 1120,
  /** Нижній відступ, щоб контент не ховався за панеллю вкладок. */
  tabBarInset: 96,
  minTouch: 44
};

/** Межа звичайної картки: на білому тлі її відділяє лінія, а не тінь. */
export const outlined = { borderWidth: 1, borderColor: colors.border };

export const fonts = {
  regular: "IBMPlexSans_400Regular",
  medium: "IBMPlexSans_500Medium",
  semibold: "IBMPlexSans_600SemiBold",
  bold: "IBMPlexSans_700Bold"
};

const numeric: TextStyle = { fontVariant: ["tabular-nums"] };

export const type = {
  display: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, color: colors.text, letterSpacing: -0.3 } as TextStyle,
  title: { fontFamily: fonts.bold, fontSize: 21, lineHeight: 27, color: colors.text } as TextStyle,
  heading: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: colors.text } as TextStyle,
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.text } as TextStyle,
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.text } as TextStyle,
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.muted } as TextStyle,
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.muted } as TextStyle,
  price: { ...numeric, fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.text } as TextStyle,
  priceLarge: { ...numeric, fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, color: colors.text, letterSpacing: -0.3 } as TextStyle,
  numeric
};
