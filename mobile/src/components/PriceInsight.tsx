import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { api } from "../services/api";
import { PriceSignal, ProductAnalysis, StoreAnalysis } from "../types";
import { formatPrice, rangePosition } from "../utils/prices";
import { colors, fonts, radii, spacing, type } from "../utils/theme";
import { Badge, SectionHeader } from "./ui";

const SIGNALS: Record<PriceSignal, { label: string; tone: "primary" | "caution" | "neutral"; marker: string }> = {
  good: { label: "Вигідна ціна", tone: "primary", marker: colors.positive },
  normal: { label: "Звичайна ціна", tone: "neutral", marker: colors.text },
  high: { label: "Вище звичайної", tone: "caution", marker: colors.caution },
  insufficient: { label: "Мало даних", tone: "neutral", marker: colors.text }
};

function RangeLabel({ label, value, align }: { label: string; value: number; align: "flex-start" | "center" | "flex-end" }) {
  return (
    <View style={[styles.rangeLabel, { alignItems: align }]}>
      <Text style={type.label}>{label}</Text>
      <Text style={styles.rangeValue}>{formatPrice(value)}</Text>
    </View>
  );
}

/** Де сьогоднішня ціна між найнижчою й найвищою за період. */
function PriceRange({ reference, marker }: { reference: StoreAnalysis; marker: string }) {
  const today = rangePosition(reference.current, reference.min, reference.max);
  const usual = rangePosition(reference.average, reference.min, reference.max);
  return (
    <View
      accessible
      accessibilityLabel={`Зараз ${formatPrice(reference.current)}. Найнижча ${formatPrice(reference.min)}, звичайна ${formatPrice(reference.average)}, найвища ${formatPrice(reference.max)}.`}
      style={styles.range}
    >
      <View style={styles.track}>
        <View style={[styles.usualTick, { left: `${usual * 100}%` }]} />
        <View style={[styles.todayMarker, { left: `${today * 100}%`, backgroundColor: marker }]} />
      </View>
      <View style={styles.rangeLabels}>
        <RangeLabel label="Найнижча" value={reference.min} align="flex-start" />
        <RangeLabel label="Звичайна" value={reference.average} align="center" />
        <RangeLabel label="Найвища" value={reference.max} align="flex-end" />
      </View>
    </View>
  );
}

/** Чи вигідна поточна ціна порівняно з власною історією товару, і чому. */
export function PriceInsight({ productId }: { productId: string }) {
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);

  useEffect(() => {
    let active = true;
    api.productAnalytics(productId)
      .then((next) => {
        if (active) setAnalysis(next);
      })
      .catch(() => {
        if (active) setAnalysis(null);
      });
    return () => {
      active = false;
    };
  }, [productId]);

  if (!analysis?.reference) return null;
  const signal = SIGNALS[analysis.signal];
  const { reference } = analysis;
  const enoughData = analysis.signal !== "insufficient";

  return (
    <View>
      <SectionHeader title="Чи вигідна ціна" subtitle={`За останні ${analysis.windowDays} днів`} />
      <View style={styles.head}>
        <Badge label={signal.label} tone={signal.tone} />
        {enoughData ? <Text style={styles.today} numberOfLines={1}>{reference.store.name}: {formatPrice(reference.current)}</Text> : null}
      </View>
      {enoughData ? <PriceRange reference={reference} marker={signal.marker} /> : null}
      <View style={styles.reasons}>
        {analysis.reasons.map((reason) => <Text key={reason} style={styles.reason}>{reason}</Text>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  today: { ...type.bodyStrong, ...type.numeric, flexShrink: 1 },
  range: { marginTop: spacing.lg },
  track: { height: 6, borderRadius: radii.xs, backgroundColor: colors.surfaceMuted },
  usualTick: { position: "absolute", top: -3, width: 2, height: 12, marginLeft: -1, backgroundColor: colors.borderStrong },
  todayMarker: { position: "absolute", top: -7, width: 4, height: 20, marginLeft: -2, borderRadius: 2 },
  rangeLabels: { flexDirection: "row", marginTop: spacing.md },
  rangeLabel: { flex: 1, minWidth: 0 },
  rangeValue: { ...type.small, ...type.numeric, color: colors.text, fontFamily: fonts.semibold },
  reasons: { marginTop: spacing.md, gap: spacing.xs },
  reason: { ...type.small, color: colors.textSoft }
});
