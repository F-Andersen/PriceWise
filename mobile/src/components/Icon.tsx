import { Platform } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "../utils/theme";

export type IconName =
  | "home"
  | "tag"
  | "search"
  | "basket"
  | "book"
  | "user"
  | "chevronLeft"
  | "chevronRight"
  | "chevronDown"
  | "chevronUp"
  | "plus"
  | "minus"
  | "trash"
  | "clock"
  | "alert"
  | "info"
  | "check"
  | "external"
  | "image"
  | "store"
  | "cloudOff"
  | "similar";

const paths: Record<IconName, string[]> = {
  home: ["M3 10.5 12 3l9 7.5", "M5.5 9v11h13V9", "M10 20v-6h4v6"],
  tag: ["M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z", "M8 8h.01"],
  search: ["M16.5 16.5 21 21", "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"],
  basket: ["M4 9h16l-1.5 11h-13L4 9Z", "M8 9l3-6", "M16 9l-3-6", "M9.5 13v3", "M14.5 13v3"],
  book: ["M4 5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2V5Z", "M4 20a2 2 0 0 0 2 2h14v-4", "M9 8h6"],
  user: ["M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z", "M4 21c1-4.5 4-6.5 8-6.5s7 2 8 6.5"],
  chevronLeft: ["M15 5l-7 7 7 7"],
  chevronRight: ["M9 5l7 7-7 7"],
  chevronDown: ["M5 9l7 7 7-7"],
  chevronUp: ["M5 15l7-7 7 7"],
  plus: ["M12 5v14", "M5 12h14"],
  minus: ["M5 12h14"],
  trash: ["M4 7h16", "M9 7V4h6v3", "M6 7l1 14h10l1-14", "M10 11v6", "M14 11v6"],
  clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7v5l3 2"],
  alert: ["M12 4 2.5 20h19L12 4Z", "M12 10v5", "M12 17.5h.01"],
  info: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 11v5", "M12 8h.01"],
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  external: ["M14 4h6v6", "M20 4l-9 9", "M18 14v6H4V6h6"],
  image: ["M4 4h16v16H4V4Z", "M4 16l5-5 4 4 2-2 5 5", "M15.5 9h.01"],
  store: ["M4 10v10h16V10", "M3 10l2-6h14l2 6", "M3 10c0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0", "M10 20v-5h4v5"],
  cloudOff: ["M3 3l18 18", "M8 8a5 5 0 0 0-2 9.6h11", "M12 6.2a5.5 5.5 0 0 1 6.5 4.3 4 4 0 0 1 2 5.5"],
  similar: ["M4 9h12", "M12 5l4 4-4 4", "M20 15H8", "M12 11l-4 4 4 4"]
};

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

const hiddenFromAssistive = (Platform.OS === "web" ? { "aria-hidden": true } : { accessibilityElementsHidden: true, importantForAccessibility: "no" }) as object;

/** Іконки декоративні: сенс завжди передає підпис або accessibilityLabel батьківського елемента. */
export function Icon({ name, size = 20, color = colors.text, strokeWidth = 1.8 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...hiddenFromAssistive}>
      {paths[name].map((d) => (
        <Path key={d} d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {name === "tag" ? <Circle cx={8} cy={8} r={1} fill={color} /> : null}
    </Svg>
  );
}
