import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../services/api";
import { BasketPlan, BasketPlanResult } from "../types";
import { countLabel, formatPrice } from "../utils/prices";
import { colors, layout, spacing, type, fonts } from "../utils/theme";
import { Icon } from "./Icon";
import { Badge, Chip, ChipRow, ErrorState, SectionHeader, SkeletonList } from "./ui";

const TRIP_COSTS = [0, 30, 60, 100];

function PlanCard({ plan, itemCount }: { plan: BasketPlan; itemCount: number }) {
  const [open, setOpen] = useState(false);
  const title = plan.storeCount === 1 ? plan.stops[0].store.name : plan.stops.map((stop) => stop.store.name).join(" + ");
  return (
    <View style={styles.row}>
      <View style={styles.top}>
        <Text style={type.label}>{countLabel(plan.storeCount, "магазин", "магазини", "магазинів")}</Text>
        {plan.isRecommended ? <Badge label="Рекомендовано" tone="primary" icon="check" /> : null}
      </View>
      <Text style={type.heading}>{title}</Text>
      <Text style={plan.isRecommended ? type.priceLarge : type.price}>{formatPrice(plan.total)}</Text>
      {plan.coveredCount < itemCount ? <Badge label={`${plan.coveredCount} із ${itemCount} товарів`} tone="caution" icon="alert" /> : null}
      {plan.explanation.map((line) => <Text key={line} style={styles.reason}>{line}</Text>)}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={styles.toggle}>
        <Text style={styles.toggleText}>{open ? "Сховати список" : "Що де купити"}</Text>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={16} color={colors.primary} />
      </Pressable>
      {open ? plan.stops.map((stop) => (
        <View key={stop.store.id} style={styles.stop}>
          <View style={styles.line}>
            <Text style={[type.bodyStrong, styles.lineName]}>{stop.store.name}</Text>
            <Text style={type.bodyStrong}>{formatPrice(stop.total)}</Text>
          </View>
          {stop.items.map((item) => (
            <View key={item.productId} style={styles.line}>
              <Text style={[type.small, styles.lineName]} numberOfLines={2}>{item.productName}{item.quantity > 1 ? ` × ${item.quantity}` : ""}</Text>
              <Text style={type.small}>{formatPrice(item.lineTotal)}{item.hasDiscount ? " · акція" : ""}</Text>
            </View>
          ))}
        </View>
      )) : null}
    </View>
  );
}

/** Як розділити кошик між магазинами з огляду на вартість ще однієї поїздки. */
export function BasketPlanSection({ listId }: { listId: string }) {
  const [tripCost, setTripCost] = useState(30);
  const [result, setResult] = useState<BasketPlanResult | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    api.plan(listId, tripCost)
      .then((next) => {
        if (!active) return;
        setResult(next);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [listId, tripCost, attempt]);

  if (status === "loading") return <SkeletonList count={1} label="Розрахунок плану покупки" />;
  if (status === "error") return <ErrorState onRetry={() => { setStatus("loading"); setAttempt((value) => value + 1); }} />;
  if (!result?.plans.length) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Як купити вигідніше" subtitle="Скільки для вас коштує поїздка ще в один магазин?" />
      <ChipRow>
        {TRIP_COSTS.map((cost) => (
          <Chip key={cost} label={cost === 0 ? "Не враховувати" : formatPrice(cost)} active={tripCost === cost} onPress={() => setTripCost(cost)} />
        ))}
      </ChipRow>
      {result.summary ? <Text style={[type.body, styles.summary]}>{result.summary}</Text> : null}
      <View style={styles.rows}>
        {result.plans.map((plan) => <PlanCard key={plan.storeCount} plan={plan} itemCount={result.itemCount} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.md },
  summary: { marginVertical: spacing.sm },
  rows: { borderTopWidth: 1, borderTopColor: colors.border },
  row: { paddingVertical: spacing.md, gap: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  reason: { ...type.small, color: colors.textSoft },
  toggle: { flexDirection: "row", alignItems: "center", gap: spacing.xs, minHeight: layout.minTouch, alignSelf: "flex-start" },
  toggleText: { ...type.small, color: colors.primary, fontFamily: fonts.semibold },
  stop: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: spacing.xs },
  line: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  lineName: { flex: 1, minWidth: 0 }
});
