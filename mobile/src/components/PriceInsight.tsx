import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { api } from "../services/api";
import { PriceSignal, ProductAnalysis } from "../types";
import { formatPrice } from "../utils/prices";
import { colors, spacing, type } from "../utils/theme";
import { Badge, Card, SectionHeader } from "./ui";

const SIGNALS: Record<PriceSignal, { label: string; tone: "primary" | "caution" | "neutral" }> = {
  good: { label: "Вигідна ціна", tone: "primary" },
  normal: { label: "Звичайна ціна", tone: "neutral" },
  high: { label: "Вище звичайної", tone: "caution" },
  insufficient: { label: "Мало даних", tone: "neutral" }
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={type.small}>{label}</Text>
      <Text style={type.bodyStrong}>{formatPrice(value)}</Text>
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

  return (
    <View style={styles.section}>
      <SectionHeader title="Аналіз ціни" subtitle={`За останні ${analysis.windowDays} днів`} />
      <Card style={styles.card}>
        <Badge label={signal.label} tone={signal.tone} />
        {analysis.reasons.map((reason) => <Text key={reason} style={styles.reason}>{reason}</Text>)}
        {analysis.signal !== "insufficient" ? (
          <View style={styles.stats}>
            <Stat label="Мінімум" value={reference.min} />
            <Stat label="Середня" value={reference.average} />
            <Stat label="Максимум" value={reference.max} />
          </View>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.md },
  card: { gap: spacing.sm, alignItems: "flex-start" },
  reason: { ...type.small, color: colors.textSoft },
  stats: { flexDirection: "row", alignSelf: "stretch", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  stat: { gap: 2 }
});
