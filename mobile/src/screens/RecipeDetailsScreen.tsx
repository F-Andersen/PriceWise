import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { useToast } from "../components/Toast";
import { Badge, Card, contentWidth, ErrorState, FreshnessNotice, ProductImage, SectionHeader, SkeletonList, Stepper } from "../components/ui";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api, SessionExpiredError } from "../services/api";
import { useAuth } from "../services/AuthContext";
import { Product, Recipe, RecipeItem } from "../types";
import { countLabel, formatPrice, latestCollectedAt } from "../utils/prices";
import { colors, radii, spacing, type, fonts } from "../utils/theme";

const MAX_SERVINGS = 12;

function amountLabel(item: RecipeItem) {
  if (item.unit === "шт") return `${item.amount} шт`;
  if (item.amount >= 1000) return `${(item.amount / 1000).toLocaleString("uk-UA")} ${item.unit === "г" ? "кг" : "л"}`;
  return `${item.amount} ${item.unit}`;
}

const RECIPE_LOGIN_REASON = "Увійдіть, і продукти рецепта одразу з'являться у вашому кошику.";

export function RecipeDetailsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "RecipeDetails">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const { withAuth } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState<number | undefined>();
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);

  // Лише остання відповідь має значення, якщо кількість порцій змінюють швидко.
  const requestId = useRef(0);

  const load = useCallback(() => {
    const id = ++requestId.current;
    setFailed(false);
    api.recipe(route.params.recipeId, servings)
      .then((next) => {
        if (id === requestId.current) setRecipe(next);
      })
      .catch(() => {
        if (id === requestId.current) setFailed(true);
      });
  }, [route.params.recipeId, servings]);

  useEffect(() => { load(); }, [load]);

  async function addToCart() {
    if (!recipe) return;
    setAdding(true);
    try {
      const listId = await AsyncStorage.getItem("activeListId");
      let list;
      try {
        list = await api.addRecipeToList(recipe.id, listId || undefined, recipe.guide.servings);
      } catch (error) {
        if (error instanceof SessionExpiredError) throw error;
        await AsyncStorage.removeItem("activeListId");
        list = await api.addRecipeToList(recipe.id, undefined, recipe.guide.servings);
      }
      await AsyncStorage.setItem("activeListId", list.id);
      toast("Продукти рецепта додано в кошик", { actionLabel: "До кошика", onAction: () => navigation.popTo("Tabs", { screen: "Cart" }) });
    } catch (error) {
      if (error instanceof SessionExpiredError) void withAuth(addToCart, RECIPE_LOGIN_REASON);
      else toast("Не вдалося додати продукти. Спробуйте ще раз.", { kind: "error" });
    } finally {
      setAdding(false);
    }
  }

  if (failed && !recipe) return <View style={styles.centered}><ErrorState onRetry={load} /></View>;
  if (!recipe) return <View style={styles.loading}><View style={contentWidth}><SkeletonList count={3} label="Завантаження рецепта" /></View></View>;

  const { guide, cost } = recipe;
  const products = recipe.items.map((item) => item.product).filter((product): product is Product => product !== null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={contentWidth}>
        <ProductImage uri={recipe.imageUrl} height={190} label={recipe.title} />
        <Text accessibilityRole="header" style={[type.display, styles.title]}>{recipe.title}</Text>
        <Text style={[type.body, styles.desc]}>{recipe.description}</Text>
        <View style={styles.meta}>
          <Badge label={`${guide.durationMinutes} хв`} icon="clock" />
          <Badge label={guide.difficulty} />
        </View>

        <Card style={styles.summary}>
          <View style={styles.servingsRow}>
            <Text style={type.bodyStrong}>{countLabel(guide.servings, "порція", "порції", "порцій")}</Text>
            <Stepper value={guide.servings} name="порції" onChange={(next) => setServings(Math.min(next, MAX_SERVINGS))} />
          </View>

          <View style={styles.divider} />
          <Text style={type.label}>Вартість страви</Text>
          <Text style={type.priceLarge}>{cost.dish ? `≈ ${formatPrice(cost.dish)}` : "Цін немає"}</Text>
          <Text style={styles.basis}>Лише та кількість продуктів, що піде в страву, за найнижчими цінами в різних магазинах.</Text>

          <View style={styles.purchaseRow}>
            <Text style={[type.bodyStrong, styles.purchaseLabel]}>Купити цілими упаковками</Text>
            <Text style={type.price}>≈ {formatPrice(cost.purchase)}</Text>
          </View>
          <Text style={styles.basis}>
            Стільки буде в кошику: решта продуктів залишиться вам. Вагові товари рахуються за 1 кг.
            {cost.unpriced ? ` Не враховано продуктів без ціни: ${cost.unpriced}.` : ""}
          </Text>
          <PrimaryButton title="Додати продукти в кошик" icon="basket" loading={adding} onPress={() => withAuth(addToCart, RECIPE_LOGIN_REASON)} />
        </Card>
        <FreshnessNotice collectedAt={latestCollectedAt(products)} />

        <SectionHeader title="Інгредієнти" />
        <Card style={styles.listCard}>
          {recipe.items.map((item, index) => (
            <View key={item.id} style={[styles.row, index > 0 && styles.rowDivider]}>
              <ProductImage uri={item.product?.imageUrl} size={52} />
              <View style={styles.rowBody}>
                <View style={styles.nameRow}>
                  <Text style={[type.bodyStrong, styles.name]}>{item.name}</Text>
                  <Text style={styles.amount}>{amountLabel(item)}</Text>
                </View>
                {item.product ? (
                  <Text style={type.small} numberOfLines={2}>{item.product.name}{item.product.volume === "1 шт" ? "" : ` · ${item.product.volume}`} × {item.quantity}</Text>
                ) : (
                  <Text style={type.small}>Зараз немає в каталозі</Text>
                )}
                <View style={styles.itemFooter}>
                  {item.purchaseCost !== null ? <Text style={styles.price}>від {formatPrice(item.purchaseCost)}</Text> : <Badge label="Ціни немає" tone="caution" />}
                  {item.optional ? <Badge label="За бажанням, не в сумі" /> : null}
                </View>
              </View>
            </View>
          ))}
        </Card>

        <SectionHeader title="Спосіб приготування" />
        <Card>
          {guide.steps.map((step, index) => (
            <View key={`${index}-${step}`} style={[styles.step, index === guide.steps.length - 1 && styles.stepLast]}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View>
              <Text style={[type.body, styles.stepText]}>{step}</Text>
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  centered: { flex: 1, justifyContent: "center", backgroundColor: colors.background, padding: spacing.lg },
  loading: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { marginTop: spacing.lg },
  desc: { color: colors.textSoft, marginTop: spacing.xs },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.md },
  summary: { marginTop: spacing.lg, marginBottom: spacing.md },
  servingsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  purchaseRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginTop: spacing.xs },
  purchaseLabel: { flex: 1 },
  basis: { ...type.small, marginTop: spacing.xs, marginBottom: spacing.md },
  listCard: { paddingVertical: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowBody: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: spacing.sm },
  name: { flex: 1 },
  amount: { ...type.bodyStrong, ...type.numeric },
  itemFooter: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  price: { ...type.small, ...type.numeric, color: colors.text, fontFamily: fonts.semibold },
  step: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  stepLast: { marginBottom: 0 },
  stepNumber: { width: 28, height: 28, borderRadius: radii.pill, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  stepNumberText: { ...type.small, color: colors.primaryDark, fontFamily: fonts.bold },
  stepText: { flex: 1 }
});
