import { Platform, TextStyle } from "react-native";

/**
 * Візуальна система PriceWise — «Чесний чек».
 * Семантичні кольори описують стан даних, а не магазин.
 * Усі пари текст/тло мають контраст щонайменше 4.5:1.
 */
export const colors = {
  background: "#F5F6F3",
  surface: "#FFFFFF",
  surfaceMuted: "#ECEEE9",
  text: "#16211F",
  textSoft: "#46524F",
  muted: "#5C6865",
  border: "#DDE1DA",
  borderStrong: "#8A9490",

  primary: "#0B5C5A",
  primaryDark: "#074240",
  primarySoft: "#DCEDEB",

  // Неповні або застарілі дані
  caution: "#7A4E00",
  cautionSoft: "#FBF0D9",
  cautionBorder: "#E7CF9C",

  // Схожий, не ідентичний товар
  similar: "#3A4499",
  similarSoft: "#E9EBFA",

  // Знижка від магазину
  deal: "#96174F",
  dealSoft: "#F9E7EF",

  danger: "#A62B1F",
  dangerSoft: "#FBE9E6",

  onPrimary: "#FFFFFF"
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radii = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

export const layout = {
  /** Основна колонка на широкому екрані. */
  maxContent: 760,
  /** Ширина, від якої товари стають у дві колонки. */
  twoColumns: 640,
  /** Нижній відступ, щоб контент не ховався за панеллю вкладок. */
  tabBarInset: 96,
  minTouch: 44
};

export const shadow = Platform.select({
  web: { boxShadow: "0 1px 2px rgba(22,33,31,0.06)" } as object,
  default: {
    shadowColor: "#16211F",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  }
}) as object;

const fontFamily = Platform.select({
  web: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  default: undefined
});

const base: TextStyle = fontFamily ? { fontFamily } : {};
const numeric: TextStyle = { fontVariant: ["tabular-nums"] };

export const type = {
  display: { ...base, fontSize: 28, lineHeight: 34, fontWeight: "700", color: colors.text, letterSpacing: -0.3 } as TextStyle,
  title: { ...base, fontSize: 20, lineHeight: 26, fontWeight: "700", color: colors.text } as TextStyle,
  heading: { ...base, fontSize: 16, lineHeight: 22, fontWeight: "600", color: colors.text } as TextStyle,
  body: { ...base, fontSize: 15, lineHeight: 22, fontWeight: "400", color: colors.text } as TextStyle,
  bodyStrong: { ...base, fontSize: 15, lineHeight: 21, fontWeight: "600", color: colors.text } as TextStyle,
  small: { ...base, fontSize: 13, lineHeight: 18, fontWeight: "400", color: colors.muted } as TextStyle,
  label: { ...base, fontSize: 12, lineHeight: 16, fontWeight: "600", color: colors.muted } as TextStyle,
  price: { ...base, ...numeric, fontSize: 18, lineHeight: 24, fontWeight: "700", color: colors.text } as TextStyle,
  priceLarge: { ...base, ...numeric, fontSize: 28, lineHeight: 34, fontWeight: "700", color: colors.text } as TextStyle,
  numeric
};
