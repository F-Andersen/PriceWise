import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Icon } from "../components/Icon";
import { PriceInsight } from "../components/PriceInsight";
import { PrimaryButton } from "../components/PrimaryButton";
import { Badge, Card, contentWidth, ErrorState, FreshnessNotice, Notice, PriceDate, ProductImage, SectionHeader, SkeletonList } from "../components/ui";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { useAddToCart } from "../services/useAddToCart";
import { Alternative, MarketPrice, Price, Product } from "../types";
import { activePrice, checkedAt, dailyLowestPrices, countLabel, formatPrice, hasActiveDiscount, isConfirmedPrice, isStale, latestByStore, productImageForBestPrice, promoUntilLabel, regularPrice, splitMarketPrices } from "../utils/prices";
import { colors, layout, radii, spacing, type, fonts } from "../utils/theme";

function PriceRow({ price, showDivider, isLowest, productName }: { price: Price | MarketPrice; showDivider: boolean; isLowest?: boolean; productName?: string }) {
  const unconfirmed = isStale(checkedAt(price));
  const unavailable = !price.isAvailable && !unconfirmed;
  const hasDiscount = !unavailable && !unconfirmed && hasActiveDiscount(price);
  return (
    <View style={[styles.priceRow, showDivider && styles.divider]}>
      <View style={styles.priceRowMain}>
        <Text style={type.bodyStrong}>{price.store.name}</Text>
        {productName ? <Text style={styles.similarName} numberOfLines={2}>{productName}</Text> : null}
        <PriceDate value={checkedAt(price)} />
        {price.sourceUrl ? (
          <Pressable accessibilityRole="link" accessibilityLabel={`Відкрити товар на сайті: ${price.store.name}`} onPress={() => Linking.openURL(price.sourceUrl!)} style={styles.source}>
            <Text style={styles.sourceText}>Відкрити товар</Text>
            <Icon name="external" size={14} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.priceRowSide}>
        <Text style={[type.price, (unavailable || unconfirmed) && styles.unavailable]}>{formatPrice(activePrice(price))}</Text>
        {hasDiscount ? <Text style={styles.oldPrice}>{formatPrice(regularPrice(price))}</Text> : null}
        <View style={styles.badges}>
          {unconfirmed ? <Badge label="Не підтверджено" tone="caution" /> : null}
          {unavailable ? <Badge label="Немає в наявності" tone="caution" /> : null}
          {isLowest ? <Badge label="Найнижча" tone="primary" /> : null}
          {hasDiscount ? <Badge label={price.promoEndsAt ? `Акція ${promoUntilLabel(price.promoEndsAt)}` : "Акція"} tone="deal" /> : null}
        </View>
      </View>
    </View>
  );
}

export function ProductDetailsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "ProductDetails">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const addToCart = useAddToCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    api.product(route.params.productId).then(setProduct).catch(() => setFailed(true));
    api.marketPrices(route.params.productId).then(setMarketPrices).catch(() => setMarketPrices([]));
    api.alternatives(route.params.productId).then(setAlternatives).catch(() => setAlternatives([]));
  }, [route.params.productId]);

  useEffect(() => { load(); }, [load]);

  async function onAdd() {
    if (!product) return;
    setAdding(true);
    await addToCart(product);
    setAdding(false);
  }

  if (failed && !product) return <View style={styles.centered}><ErrorState onRetry={load} /></View>;
  if (!product) return <View style={styles.loading}><View style={contentWidth}><SkeletonList count={3} label="Завантаження товару" /></View></View>;

  const latest = marketPrices.length ? marketPrices : latestByStore(product.prices);
  const { exact, similar } = splitMarketPrices(latest);
  const available = exact.filter(isConfirmedPrice);
  const values = available.map(activePrice);
  const lowest = values.length ? Math.min(...values) : null;
  const average = values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100 : null;
  /** Товари на вагу, об'єднані між магазинами за назвою (див. backend freshProduceMatching). */
  const isWeighedProduce = product.barcode.startsWith("fresh:");
  const newest = exact.reduce<string | null>((date, price) => (!date || +new Date(checkedAt(price)) > +new Date(date) ? checkedAt(price) : date), null);

  const history = dailyLowestPrices(product.prices || []);
  const distinctDates = history.length;
  const labelStep = Math.ceil(history.length / 4);
  const historyPrices = history.map((point) => point.price);
  // Without decimals a narrow price range repeats the same axis label.
  const chartDecimals = history.length && Math.max(...historyPrices) - Math.min(...historyPrices) < 4 ? 1 : 0;
  const chartWidth = Math.min(width, layout.maxContent) - spacing.lg * 2 - spacing.lg * 2 - 2;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={contentWidth}>
        <ProductImage uri={productImageForBestPrice(product)} height={Math.min(220, width * 0.55)} label={product.name} />
        <Text style={[type.label, styles.category]}>{product.category}</Text>
        <Text accessibilityRole="header" style={[type.title, styles.title]}>{product.name}</Text>
        <Text style={type.small}>{product.brand} · {product.volume} · {product.unit}</Text>

        <Card style={styles.summary}>
          <View style={styles.summaryRow}>
            <View style={styles.flex}>
              <Text style={type.label}>Найнижча ціна в базі</Text>
              <Text style={type.priceLarge}>{lowest !== null ? formatPrice(lowest) : "Немає"}</Text>
            </View>
            {average !== null && available.length > 1 ? (
              <View style={styles.summaryAverage}>
                <Text style={type.label}>Середня</Text>
                <Text style={type.price}>{formatPrice(average)}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.summaryBasis}>
            {available.length === 0
              ? "Цін на цей самий товар немає."
              : available.length === 1
                ? "Дані лише з 1 магазину, тому порівняти немає з чим."
                : `Дані з ${countLabel(available.length, "магазину", "магазинів", "магазинів")}. Схожі товари не враховано.`}
          </Text>
          <PrimaryButton title="Додати в кошик" icon="basket" loading={adding} onPress={onAdd} />
        </Card>

        <FreshnessNotice collectedAt={newest} />
        <PriceInsight productId={product.id} />

        <SectionHeader title="Ціни в магазинах" subtitle={isWeighedProduce ? "Той самий продукт на вагу" : "Цей самий товар"} />
        {isWeighedProduce && exact.length > 1 ? (
          <Notice tone="neutral" icon="info" text={product.barcode.startsWith("fresh:meat") ? "М'ясо на вагу не має спільного штрихкоду, тому ціни магазинів об'єднано за видом м'яса, частиною й брендом. Виробник і калібр можуть відрізнятися." : "Овочі й фрукти на вагу не мають спільного штрихкоду, тому ціни магазинів об'єднано за назвою. Сорт, калібр і країна походження можуть відрізнятися."} />
        ) : null}
        {exact.length ? (
          <Card style={styles.listCard}>
            {exact.map((price, index) => (
              <PriceRow key={price.id} price={price} showDivider={index > 0} isLowest={available.length > 1 && isConfirmedPrice(price) && activePrice(price) === lowest} />
            ))}
          </Card>
        ) : (
          <Notice text="Для цього товару немає цін у жодному магазині." />
        )}

        {similar.length ? (
          <>
            <SectionHeader title="Схожі товари в інших магазинах" />
            <Notice
              tone="similar"
              icon="similar"
              title="Це інші товари"
              text="Система знайшла їх автоматично й може помилятися: склад, обсяг чи навіть вид продукту можуть відрізнятися. Ціни не враховані в мінімумі."
            />
            <Card style={[styles.listCard, styles.similarCard]}>
              {similar.map((price, index) => (
                <PriceRow key={price.id} price={price} showDivider={index > 0} productName={price.product.name} />
              ))}
            </Card>
          </>
        ) : null}

        <SectionHeader title="Історія ціни" subtitle="Найнижча ціна серед магазинів на кожну дату" />
        {distinctDates >= 2 ? (
          <Card style={styles.chartCard}>
            <LineChart
              data={{ labels: history.map((point, index) => ((history.length - 1 - index) % labelStep === 0 ? `${point.date.slice(8)}.${point.date.slice(5, 7)}` : "")), datasets: [{ data: historyPrices }] }}
              width={chartWidth}
              height={190}
              yAxisSuffix=" ₴"
              withShadow={false}
              withVerticalLines={false}
              withOuterLines={false}
              segments={4}
              chartConfig={{
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: chartDecimals,
                strokeWidth: 2.5,
                color: () => colors.primary,
                labelColor: () => colors.muted,
                propsForLabels: { fontFamily: fonts.medium, fontSize: 11 },
                propsForBackgroundLines: { stroke: colors.border, strokeDasharray: "" },
                propsForDots: { r: "4", strokeWidth: "2", stroke: colors.surface }
              }}
            />
          </Card>
        ) : (
          <Notice tone="neutral" icon="info" text={distinctDates === 1 ? "Ціни зібрано лише за одну дату, тому динаміку поки показати неможливо." : "Історії цін поки немає."} />
        )}

        <SectionHeader title="Дешевше за одиницю" subtitle="Той самий вид продукту іншого виробника. Ціна порівнюється за кг, л або шт" />
        {alternatives.length ? (
          <Card style={styles.listCard}>
            {alternatives.map((item, index) => (
              <Pressable
                key={item.product.id}
                accessibilityRole="link"
                onPress={() => navigation.push("ProductDetails", { productId: item.product.id })}
                style={({ pressed }) => [styles.altRow, index > 0 && styles.divider, pressed && styles.pressed]}
              >
                <View style={styles.flex}>
                  <Text style={type.bodyStrong} numberOfLines={2}>{item.product.name}</Text>
                  <Text style={type.small}>
                    На {item.savingPercent}% дешевше за {item.unit}: {formatPrice(item.unitPrice)}/{item.unit} у {item.store.name} (тут від {formatPrice(item.targetUnitPrice)}/{item.unit})
                  </Text>
                </View>
                <Icon name="chevronRight" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </Card>
        ) : (
          <Text style={[type.body, styles.emptyText]}>Дешевшого товару того самого виду в базі не знайдено.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  centered: { flex: 1, justifyContent: "center", backgroundColor: colors.background, padding: spacing.lg },
  loading: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.75 },
  category: { marginTop: spacing.lg },
  title: { marginTop: 2, marginBottom: 2 },
  summary: { marginTop: spacing.lg, marginBottom: spacing.md },
  summaryRow: { flexDirection: "row", gap: spacing.lg },
  summaryAverage: { alignItems: "flex-end" },
  summaryBasis: { ...type.small, marginTop: spacing.xs, marginBottom: spacing.md },
  listCard: { paddingVertical: 0 },
  similarCard: { marginTop: spacing.sm, borderColor: colors.borderStrong },
  chartCard: { padding: spacing.lg, borderRadius: radii.lg },
  priceRow: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  priceRowMain: { flex: 1, minWidth: 0, gap: 2 },
  priceRowSide: { alignItems: "flex-end", gap: 2 },
  badges: { alignItems: "flex-end", gap: spacing.xs, marginTop: 2 },
  oldPrice: { ...type.small, ...type.numeric, textDecorationLine: "line-through" },
  unavailable: { color: colors.muted },
  similarName: { ...type.small, color: colors.similar, fontFamily: fonts.medium },
  source: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: layout.minTouch, alignSelf: "flex-start" },
  sourceText: { ...type.small, color: colors.primary, fontFamily: fonts.semibold },
  altRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 60, paddingVertical: spacing.md },
  emptyText: { color: colors.textSoft }
});
