import { ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from "react-native";
import { ageLabel, formatDate, isStale } from "../utils/prices";
import { colors, layout, radii, shadow, spacing, type, fonts } from "../utils/theme";
import { Icon, IconName } from "./Icon";
import { PrimaryButton } from "./PrimaryButton";

/** Центрує вміст і обмежує ширину на широких екранах. */
export const contentWidth: ViewStyle = { width: "100%", maxWidth: layout.maxContent, alignSelf: "center" };

/** Ширша колонка для вітрин із товарами. */
export const wideContent: ViewStyle = { width: "100%", maxWidth: layout.maxWide, alignSelf: "center" };

export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.pageTitle}>
      <View style={styles.flex}>
        <Text accessibilityRole="header" style={type.display}>{title}</Text>
        {subtitle ? <Text style={[type.small, styles.gapXs]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function SectionHeader({ title, subtitle, actionLabel, onAction }: { title: string; subtitle?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.flex}>
        <Text accessibilityRole="header" style={type.title}>{title}</Text>
        {subtitle ? <Text style={[type.small, styles.gapXs]}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.sectionAction}>
          <Text style={styles.linkText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type Tone = "neutral" | "caution" | "similar" | "deal" | "primary";

const toneStyles: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surfaceMuted, fg: colors.textSoft },
  caution: { bg: colors.cautionSoft, fg: colors.caution },
  similar: { bg: colors.similarSoft, fg: colors.similar },
  deal: { bg: colors.dealSoft, fg: colors.deal },
  primary: { bg: colors.primarySoft, fg: colors.primaryDark }
};

export function Badge({ label, tone = "neutral", icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const palette = toneStyles[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      {icon ? <Icon name={icon} size={13} color={palette.fg} strokeWidth={2} /> : null}
      <Text style={[type.label, { color: palette.fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipRowContent}>
      {children}
    </ScrollView>
  );
}

export function IconButton({ icon, label, onPress, disabled, tone = "neutral", size = 44 }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; tone?: "neutral" | "primary" | "ghost"; size?: number }) {
  const isPrimary = tone === "primary";
  const color = disabled ? colors.borderStrong : isPrimary ? colors.onPrimary : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={size < layout.minTouch ? (layout.minTouch - size) / 2 : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2 },
        isPrimary && styles.iconButtonPrimary,
        tone === "ghost" && styles.iconButtonGhost,
        pressed && !disabled && styles.pressed
      ]}
    >
      <Icon name={icon} size={18} color={color} strokeWidth={2} />
    </Pressable>
  );
}

/** Зображення товару з нейтральною заглушкою, якщо фото немає або не завантажилось. */
export function ProductImage({ uri, size, height, label }: { uri?: string | null; size?: number; height?: number; label?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  const box: ViewStyle = size ? { width: size, height: size } : { width: "100%", height: height ?? 200 };
  return (
    <View style={[styles.imageBox, box]}>
      {uri && !failed ? (
        <Image accessibilityLabel={label} source={{ uri }} style={styles.image} resizeMode="contain" onError={() => setFailed(true)} />
      ) : (
        <Icon name="image" size={Math.min(size ?? 40, 40) * 0.5} color={colors.borderStrong} />
      )}
    </View>
  );
}

export function Stepper({ value, onChange, name }: { value: number; onChange: (next: number) => void; name: string }) {
  return (
    <View style={styles.stepper}>
      <IconButton icon="minus" tone="ghost" size={36} label={`Зменшити кількість: ${name}`} disabled={value <= 1} onPress={() => onChange(value - 1)} />
      <Text accessibilityLabel={`Кількість: ${value}`} style={styles.stepperValue}>{value}</Text>
      <IconButton icon="plus" tone="ghost" size={36} label={`Збільшити кількість: ${name}`} onPress={() => onChange(value + 1)} />
    </View>
  );
}

type NoticeProps = {
  title?: string;
  text: string;
  tone?: "caution" | "similar" | "neutral";
  icon?: IconName;
};

export function Notice({ title, text, tone = "caution", icon = "info" }: NoticeProps) {
  const palette = toneStyles[tone];
  return (
    <View style={[styles.notice, { backgroundColor: palette.bg }]}>
      <Icon name={icon} size={16} color={palette.fg} />
      <View style={styles.flex}>
        {title ? <Text style={[styles.noticeTitle, { color: palette.fg }]}>{title}</Text> : null}
        <Text style={[type.small, { color: tone === "neutral" ? colors.textSoft : palette.fg }]}>{text}</Text>
      </View>
    </View>
  );
}

/** Завжди показує дату збору цін. Застарілі дані позначаються бурштиновим. */
export function FreshnessNotice({ collectedAt, detail }: { collectedAt: string | null; detail?: string }) {
  if (!collectedAt) return <Notice icon="clock" title="Дата збору цін невідома" text="Перевіряйте ціну в магазині перед покупкою." />;
  const stale = isStale(collectedAt);
  return (
    <Notice
      icon="clock"
      tone={stale ? "caution" : "neutral"}
      title={`Ціни зібрано ${formatDate(collectedAt)} (${ageLabel(collectedAt)})`}
      text={detail ?? (stale ? "Дані могли застаріти. Перевіряйте ціну й наявність у магазині." : "Ціни із сайтів мереж. У вашому магазині можуть відрізнятися.")}
    />
  );
}

export function PriceDate({ value }: { value: string }) {
  const stale = isStale(value);
  return (
    <View style={styles.priceDate}>
      <Icon name="clock" size={13} color={stale ? colors.caution : colors.muted} />
      <Text style={[type.small, stale && { color: colors.caution }]}>станом на {formatDate(value)}</Text>
    </View>
  );
}

export function StateView({ icon, title, text, actionLabel, onAction, secondaryLabel, onSecondary }: { icon: IconName; title: string; text: string; actionLabel?: string; onAction?: () => void; secondaryLabel?: string; onSecondary?: () => void }) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Icon name={icon} size={24} color={colors.primary} />
      </View>
      <Text accessibilityRole="header" style={[type.heading, styles.stateText]}>{title}</Text>
      <Text style={[type.body, styles.stateBody]}>{text}</Text>
      {actionLabel && onAction ? <View style={styles.stateAction}><PrimaryButton title={actionLabel} onPress={onAction} /></View> : null}
      {secondaryLabel && onSecondary ? <View style={styles.stateAction}><PrimaryButton variant="secondary" title={secondaryLabel} onPress={onSecondary} /></View> : null}
    </View>
  );
}

export function ErrorState({ onRetry, text }: { onRetry: () => void; text?: string }) {
  return (
    <StateView
      icon="cloudOff"
      title="Не вдалося завантажити дані"
      text={text ?? "Перевірте з'єднання із сервером і спробуйте ще раз."}
      actionLabel="Спробувати ще раз"
      onAction={onRetry}
    />
  );
}

function Bone({ style }: { style: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: Platform.OS !== "web" })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[styles.bone, style, { opacity }]} />;
}

export function SkeletonList({ count = 4, label = "Завантаження" }: { count?: number; label?: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <Bone style={styles.skeletonImage} />
          <View style={styles.skeletonLines}>
            <Bone style={styles.skeletonLineLong} />
            <Bone style={styles.skeletonLineShort} />
            <Bone style={styles.skeletonLinePrice} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  gapXs: { marginTop: 2 },
  pressed: { opacity: 0.75 },
  pageTitle: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginBottom: spacing.lg },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", gap: spacing.md, marginTop: spacing.xl, marginBottom: spacing.md },
  sectionAction: { minHeight: layout.minTouch, justifyContent: "flex-end", paddingLeft: spacing.sm },
  linkText: { ...type.small, color: colors.primary, fontFamily: fonts.semibold },
  card: { ...shadow, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg },
  badge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.pill, maxWidth: "100%" },
  chipRow: { flexGrow: 0, flexShrink: 0, marginHorizontal: -spacing.lg },
  chipRowContent: { gap: spacing.sm, paddingVertical: 2, paddingHorizontal: spacing.lg },
  chip: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.lg, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { ...type.small, color: colors.textSoft, fontFamily: fonts.medium },
  chipTextActive: { color: colors.onPrimary, fontFamily: fonts.semibold },
  iconButton: { alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  iconButtonPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  iconButtonGhost: { backgroundColor: "transparent", borderColor: "transparent" },
  imageBox: { alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: colors.surface, borderRadius: radii.md },
  image: { width: "100%", height: "100%" },
  stepper: { flexDirection: "row", alignItems: "center", padding: 2, backgroundColor: colors.surfaceMuted, borderRadius: radii.pill },
  stepperValue: { ...type.bodyStrong, ...type.numeric, minWidth: 24, textAlign: "center" },
  notice: { flexDirection: "row", gap: spacing.sm, paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: radii.md },
  noticeTitle: { ...type.small, fontFamily: fonts.semibold },
  priceDate: { flexDirection: "row", alignItems: "center", gap: 4 },
  state: { alignItems: "center", paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  stateIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft, marginBottom: spacing.md },
  stateText: { textAlign: "center" },
  stateBody: { textAlign: "center", color: colors.textSoft, marginTop: spacing.xs, maxWidth: 420 },
  stateAction: { marginTop: spacing.md, width: "100%", maxWidth: 320 },
  bone: { backgroundColor: colors.surfaceMuted, borderRadius: radii.sm },
  skeletonRow: { ...shadow, flexDirection: "row", gap: spacing.md, padding: spacing.md, marginBottom: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg },
  skeletonImage: { width: 76, height: 76 },
  skeletonLines: { flex: 1, gap: spacing.sm },
  skeletonLineLong: { height: 14, width: "85%" },
  skeletonLineShort: { height: 12, width: "50%" },
  skeletonLinePrice: { height: 18, width: "35%", marginTop: spacing.xs }
});
