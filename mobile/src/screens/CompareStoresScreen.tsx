import { RouteProp, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BasketPlanSection } from "../components/BasketPlanSection";
import { Icon } from "../components/Icon";
import { Badge, Card, contentWidth, ErrorState, FreshnessNotice, Notice, SectionHeader, SkeletonList, StateView } from "../components/ui";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { useStores } from "../services/StoresContext";
import { BasketComparison, BasketVerdict, ComparisonResult, MissingItem, Recommendation } from "../types";
import { countLabel, formatDate, formatPrice, promoUntilLabel } from "../utils/prices";
import { colors, layout, radii, spacing, type, fonts } from "../utils/theme";

function Coverage({ found, total }: { found: number; total: number }) {
  const complete = found === total;
  return (
    <View accessibilityLabel={`Знайдено ${found} із ${total} товарів`} style={styles.coverage}>
      <View style={styles.coverageTrack}>
        <View style={[styles.coverageFill, { width: `${total ? (found / total) * 100 : 0}%`, backgroundColor: complete ? colors.primary : colors.caution }]} />
      </View>
      <Text style={[type.label, { color: complete ? colors.primaryDark : colors.caution }]}>{found} із {total} товарів</Text>
    </View>
  );
}

function missingLabel(line: MissingItem) {
  if (line.reason === "unavailable") return "немає в наявності";
  if (line.reason === "stale") return line.checkedAt ? `не підтверджено з ${formatDate(line.checkedAt)}` : "не підтверджено";
  return "немає ціни в базі";
}

function ItemLines({ result }: { result: ComparisonResult }) {
  return (
    <View style={styles.lines}>
      {(result.items || []).map((line) => (
        <View key={line.productId} style={styles.line}>
          <Text style={[type.small, styles.lineName]} numberOfLines={2}>
            {line.productName}{line.quantity > 1 ? ` × ${line.quantity}` : ""}
          </Text>
          <Text style={styles.lineValue}>{formatPrice(line.lineTotal)}{line.hasDiscount ? " · акція" : ""}</Text>
        </View>
      ))}
      {result.missing.map((line) => (
        <View key={line.productId} style={styles.line}>
          <Text style={[type.small, styles.lineName, styles.missing]} numberOfLines={2}>{line.productName}</Text>
          <Text style={styles.missingValue}>{missingLabel(line)}</Text>
        </View>
      ))}
    </View>
  );
}

function CompleteCard({ result, total }: { result: ComparisonResult; total: number }) {
  return (
    <Card style={[styles.card, result.isBest ? styles.cardLowest : {}]}>
      <View style={styles.cardTop}>
        <Text style={type.heading}>{result.store.name}</Text>
        {result.isBest ? <Badge label="Найнижча сума" tone="primary" icon="check" /> : null}
        {!result.isBest && result.difference !== null ? <Text style={styles.delta}>+{formatPrice(result.difference)}</Text> : null}
      </View>
      <Text style={type.priceLarge}>{formatPrice(result.totalPrice)}</Text>
      <Coverage found={result.foundCount} total={total} />
      <ItemLines result={result} />
    </Card>
  );
}

function PartialCard({ result, total }: { result: ComparisonResult; total: number }) {
  const [open, setOpen] = useState(false);
  const unconfirmed = result.missing.filter((line) => line.reason === "stale");
  const absent = result.missing.filter((line) => line.reason !== "stale");
  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={type.heading}>{result.store.name}</Text>
        <Badge label="Неповний кошик" tone="caution" icon="alert" />
      </View>
      <Coverage found={result.foundCount} total={total} />
      {result.foundCount > 0 ? (
        <Text style={styles.partialSum}>Сума за {countLabel(result.foundCount, "знайдений товар", "знайдені товари", "знайдених товарів")}: {formatPrice(result.totalPrice)}. Не порівнюйте її з повним кошиком.</Text>
      ) : (
        <Text style={styles.partialSum}>{result.missing.some((line) => line.reason === "stale") ? "Ціни цього магазину давно не підтверджувалися, тому не враховані." : "Для цього магазину зараз немає доступних цін на товари з кошика."}</Text>
      )}
      {!open ? (
        <>
          {absent.length ? <Text style={styles.missingSummary}>Немає: {absent.map((line) => line.productName).join(", ")}</Text> : null}
          {unconfirmed.length ? <Text style={styles.missingSummary}>Не підтверджено: {unconfirmed.map((line) => line.productName).join(", ")}</Text> : null}
        </>
      ) : <ItemLines result={result} />}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={styles.toggle}>
        <Text style={styles.toggleText}>{open ? "Сховати деталі" : "Показати деталі"}</Text>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={16} color={colors.primary} />
      </Pressable>
    </Card>
  );
}

function Verdict({ verdict, storeName, hasStale }: { verdict: BasketVerdict; storeName: (id: string) => string; hasStale: boolean }) {
  if (verdict.kind === "cheapest") {
    const names = verdict.storeIds.map(storeName).join(", ");
    return (
      <Card style={styles.verdict}>
        <Text style={type.label}>Серед {countLabel(verdict.completeCount, "магазину", "магазинів", "магазинів")} із повним кошиком</Text>
        <Text accessibilityRole="header" style={[type.title, styles.verdictTitle]}>Найнижча сума — {names}, {formatPrice(verdict.total)}</Text>
        <Text style={type.body}>Різниця з найдорожчим повним кошиком за даними на дату збору: {formatPrice(verdict.spread)}. Фактична сума може відрізнятися.</Text>
      </Card>
    );
  }
  if (verdict.kind === "single_complete") {
    return (
      <Card style={styles.verdict}>
        <Text style={type.label}>Повний кошик лише в одному магазині</Text>
        <Text accessibilityRole="header" style={[type.title, styles.verdictTitle]}>{storeName(verdict.storeId)}: {formatPrice(verdict.total)}</Text>
        <Text style={type.body}>
          Це не означає, що тут найдешевше: {verdict.partialCount ? "в інших магазинах у базі є лише частина товарів" : "для інших магазинів цін немає"}, тому чесно порівняти суму поки неможливо.
        </Text>
      </Card>
    );
  }
  return (
    <Card style={[styles.verdict, styles.verdictCaution]}>
      <Text style={[type.label, { color: colors.caution }]}>Порівняння неповне</Text>
      <Text accessibilityRole="header" style={[type.title, styles.verdictTitle]}>{hasStale ? "Немає магазину, де всі ціни підтверджені" : "Жоден магазин не має всіх товарів"}</Text>
      <Text style={type.body}>Не можна сказати, де кошик дешевший. Нижче видно, чого бракує в кожному магазині.</Text>
    </Card>
  );
}

export function CompareStoresScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "CompareStores">>();
  const { excludedStoreIds } = useStores();
  const [comparison, setComparison] = useState<BasketComparison | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(() => {
    setStatus("loading");
    api.compare(route.params.listId)
      .then((next) => {
        setComparison(next);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
    api.recommendations(route.params.listId).then(setRecommendations).catch(() => setRecommendations([]));
  }, [route.params.listId]);

  useEffect(() => { load(); }, [load]);

  // Порядок і вердикт рахує сервер: повні кошики від найдешевшого, далі неповні, далі без даних.
  const stores = comparison?.stores ?? [];
  const itemCount = comparison?.itemCount ?? 0;
  const complete = stores.filter((item) => item.status === "complete");
  const partial = stores.filter((item) => item.status === "partial");
  const noData = stores.filter((item) => item.status === "no_data");
  const storeName = (id: string) => stores.find((item) => item.store.id === id)?.store.name ?? "";
  const collectedAt = stores.flatMap((item) => item.items.map((line) => line.checkedAt)).sort().pop() ?? null;
  const discounts = recommendations.filter((item) => item.type === "discount");
  const belowAverage = recommendations.filter((item) => item.type === "below_average");
  const replacements = recommendations.filter((item) => item.type === "alternative" && item.product && item.alternative);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={contentWidth}>
        {status === "loading" ? <SkeletonList count={3} label="Порівняння магазинів" /> : null}
        {status === "error" ? <ErrorState onRetry={load} /> : null}
        {status === "ready" && itemCount === 0 ? <StateView icon="basket" title="Немає чого порівнювати" text="Спершу додайте товари в кошик." /> : null}

        {status === "ready" && itemCount > 0 ? (
          <>
            {comparison ? <Verdict verdict={comparison.verdict} storeName={storeName} hasStale={comparison.staleCount > 0} /> : null}
            <View style={styles.freshness}><FreshnessNotice collectedAt={collectedAt} /></View>
            {excludedStoreIds.length ? (
              <View style={styles.freshness}>
                <Notice tone="neutral" icon="store" text={`Вимкнено магазинів: ${excludedStoreIds.length}. Вони не враховані. Змінити можна в Профілі.`} />
              </View>
            ) : null}
            {comparison && comparison.staleCount > 0 ? (
              <View style={styles.freshness}>
                <Notice icon="alert" title="Частину цін не підтверджено" text="Збір не бачив їх понад 3 доби, тому вони не враховані в сумах і порівнянні." />
              </View>
            ) : null}

            <BasketPlanSection listId={route.params.listId} />

            {complete.length ? (
              <>
                <SectionHeader title="Повний кошик" subtitle={complete.length >= 2 ? "Ці суми можна порівнювати між собою" : "Є всі товари"} />
                {complete.map((result) => <CompleteCard key={result.store.id} result={result} total={itemCount} />)}
              </>
            ) : null}

            {partial.length ? (
              <>
                <SectionHeader title="Неповний кошик" subtitle="Без рейтингу: сума не включає відсутні товари" />
                {partial.map((result) => <PartialCard key={result.store.id} result={result} total={itemCount} />)}
              </>
            ) : null}

            {noData.length ? (
              <>
                <SectionHeader title="Немає даних" />
                <Notice tone="neutral" icon="store" text={`${noData.map((item) => item.store.name).join(", ")}: у базі немає цін на товари з цього кошика. Це не означає, що товарів немає в магазині.`} />
              </>
            ) : null}

            {discounts.length || replacements.length || belowAverage.length ? <SectionHeader title="Підказки" subtitle="Автоматичні: перевірте, чи вони вам підходять" /> : null}
            {discounts.map((item, index) => (
              <View key={`discount-${index}`} style={styles.tip}>
                <Badge label={item.promoEndsAt ? `Акція ${promoUntilLabel(item.promoEndsAt)}` : "Акція"} tone="deal" />
                <Text style={[type.small, styles.tipText]}>{item.message}</Text>
              </View>
            ))}
            {belowAverage.map((item, index) => (
              <View key={`below-${index}`} style={styles.tip}>
                <Badge label="Нижче середньої" tone="primary" />
                <Text style={[type.small, styles.tipText]}>{item.message}</Text>
              </View>
            ))}
            {replacements.map((item, index) => (
              <View key={`replacement-${index}`} style={styles.tip}>
                <Badge label="Інший товар" tone="similar" icon="similar" />
                <Text style={[type.small, styles.tipText]}>
                  Можлива заміна: {item.product!.name} → {item.alternative!.name}
                  {item.unitPrice && item.unit ? ` (${formatPrice(item.unitPrice)}/${item.unit} у ${item.store?.name}, на ${item.savingPercent}% дешевше за ${item.unit})` : ""}. Це інший товар того самого виду: перевірте склад, жирність і обсяг.
                </Text>
              </View>
            ))}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  freshness: { marginTop: spacing.md },
  verdict: { gap: spacing.xs },
  verdictCaution: { borderColor: colors.cautionBorder, backgroundColor: colors.cautionSoft },
  verdictTitle: { marginBottom: 2 },
  card: { marginBottom: spacing.md, gap: spacing.sm },
  cardLowest: { borderColor: colors.primary, borderWidth: 2 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.sm },
  delta: { ...type.bodyStrong, ...type.numeric, color: colors.textSoft },
  coverage: { gap: spacing.xs },
  coverageTrack: { height: 6, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted, overflow: "hidden" },
  coverageFill: { height: "100%", borderRadius: radii.pill },
  lines: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: spacing.sm },
  line: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  lineName: { flex: 1, minWidth: 0, color: colors.textSoft },
  lineValue: { ...type.small, ...type.numeric, color: colors.text, fontFamily: fonts.medium },
  missing: { color: colors.caution },
  missingValue: { ...type.small, color: colors.caution, fontFamily: fonts.semibold },
  missingSummary: { ...type.small, color: colors.caution },
  partialSum: { ...type.small, color: colors.textSoft },
  toggle: { flexDirection: "row", alignItems: "center", gap: spacing.xs, minHeight: layout.minTouch, alignSelf: "flex-start" },
  toggleText: { ...type.small, color: colors.primary, fontFamily: fonts.semibold },
  tip: { gap: spacing.xs, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  tipText: { color: colors.textSoft }
});
