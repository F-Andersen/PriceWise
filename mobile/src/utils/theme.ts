import { Platform, TextStyle } from "react-native";

/**
 * Візуальна система PriceWise: біле тло, тонкі лінії замість тіней і чорний текст, тож
 * колір лишається за товарами й цінами. Темно-зелений — єдиний акцент інтерфейсу.
 * Семантичні кольори описують стан даних, а не магазин.
 * Пари текст/тло мають контраст щонайменше 4.5:1; золотий лише декоративний.
 */
export const colors = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceMuted: "#F3F4F2",
  text: "#111513",
  textSoft: "#3F4744",
  muted: "#5F6663",
  border: "#E6E8E5",
  borderStrong: "#8F968F",

  primary: "#123F3A",
  primaryDark: "#0B2B28",
  primarySoft: "#E4EFEA",

  /** Темні панелі: головний блок, плаваюче меню. */
  ink: "#0F2A27",
  inkSoft: "#1C3D39",
  onInk: "#F6F3EC",
  onInkMuted: "#BCC9C2",

  /** Лише декоративні деталі, не для тексту на світлому тлі. */
  gold: "#C2A26A",

  // Неповні або застарілі дані
  caution: "#7A4E00",
  cautionSoft: "#FAEFD9",
  cautionBorder: "#E9D5AB",

  // Схожий, не ідентичний товар
  similar: "#3A4499",
  similarSoft: "#EAEBF8",

  // Знижка від магазину
  deal: "#8E1D4B",
  dealSoft: "#F8E8EE",

  danger: "#A62B1F",
  dangerSoft: "#FBE9E6",

  onPrimary: "#FFFFFF"
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radii = { sm: 8, md: 10, lg: 14, xl: 20, pill: 999 };

export const layout = {
  /** Колонка для тексту й форм на широкому екрані. */
  maxContent: 760,
  /** Ширша колонка для вітрин із товарами. */
  maxWide: 1120,
  /** Нижній відступ, щоб контент не ховався за панеллю вкладок. */
  tabBarInset: 96,
  minTouch: 44
};

function makeShadow(y: number, blur: number, opacity: number, elevation: number) {
  return Platform.select({
    web: { boxShadow: `0 ${y}px ${blur}px rgba(15,42,39,${opacity})` } as object,
    default: { shadowColor: "#0F2A27", shadowOpacity: opacity, shadowRadius: blur / 2, shadowOffset: { width: 0, height: y }, elevation }
  }) as object;
}

/** Межа звичайної картки: на білому тлі її відділяє лінія, а не тінь. */
export const outlined = { borderWidth: 1, borderColor: colors.border };
/** Лише для того, що плаває над вмістом: меню, підсумок кошика. */
export const shadowRaised = makeShadow(14, 36, 0.14, 8);

export const fonts = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extrabold: "Manrope_800ExtraBold"
};

const numeric: TextStyle = { fontVariant: ["tabular-nums"] };

export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36, color: colors.text, letterSpacing: -0.6 } as TextStyle,
  title: { fontFamily: fonts.bold, fontSize: 21, lineHeight: 27, color: colors.text, letterSpacing: -0.3 } as TextStyle,
  heading: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: colors.text, letterSpacing: -0.1 } as TextStyle,
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.text } as TextStyle,
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.text } as TextStyle,
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.muted } as TextStyle,
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.muted } as TextStyle,
  price: { ...numeric, fontFamily: fonts.extrabold, fontSize: 18, lineHeight: 24, color: colors.text, letterSpacing: -0.2 } as TextStyle,
  priceLarge: { ...numeric, fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36, color: colors.text, letterSpacing: -0.6 } as TextStyle,
  numeric
};
