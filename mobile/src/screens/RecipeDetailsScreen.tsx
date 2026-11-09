import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { useToast } from "../components/Toast";
import { Badge, Card, contentWidth, ErrorState, FreshnessNotice, ProductImage, SectionHeader, SkeletonList } from "../components/ui";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { Product, Recipe } from "../types";
import { countLabel, formatPrice, latestCollectedAt, minProductPrice } from "../utils/prices";
import { colors, radii, spacing, type } from "../utils/theme";

export function RecipeDetailsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "RecipeDetails">>();
  const navigation = useNavigation();
  const toast = useToast();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    // Відповідь /recipes/:id не містить цін, тому вони беруться з каталогу.
    api.recipe(route.params.recipeId)
      .then(async (nextRecipe) => {
        const products = await api.productsByIds(nextRecipe.items.map((item) => item.product.id)).then((result) => result.items).catch(() => [] as Product[]);
        const byId = new Map(products.map((product) => [product.id, product]));
        setRecipe({
          ...nextRecipe,
          items: nextRecipe.items.map((item) => ({
            ...item,
            product: item.product.prices?.length ? item.product : { ...item.product, prices: byId.get(item.product.id)?.prices }
          }))
        });
      })
      .catch(() => setFailed(true));
  }, [route.params.recipeId]);

  useEffect(() => { load(); }, [load]);

  async function addToCart() {
    if (!recipe) return;
    setAdding(true);
    try {
      const listId = await AsyncStorage.getItem("activeListId");
      let list;
      try {
        list = await api.addRecipeToList(recipe.id, listId || undefined);
      } catch {
        await AsyncStorage.removeItem("activeListId");
        list = await api.addRecipeToList(recipe.id);
      }
      await AsyncStorage.setItem("activeListId", list.id);
      toast("Продукти рецепта додано в кошик", { actionLabel: "До кошика", onAction: () => navigation.navigate("Cart" as never) });
    } catch {
      toast("Не вдалося додати продукти. Спробуйте ще раз.", { kind: "error" });
    } finally {
      setAdding(false);
    }
  }

  const { estimate, unpriced } = useMemo(() => {
    const items = recipe?.items || [];
    return {
      estimate: items.reduce((sum, item) => sum + (minProductPrice(item.product) || 0) * item.quantity, 0),
      unpriced: items.filter((item) => minProductPrice(item.product) === null).length
    };
  }, [recipe]);

  if (failed && !recipe) return <View style={styles.centered}><ErrorState onRetry={load} /></View>;
  if (!recipe) return <View style={styles.loading}><View style={contentWidth}><SkeletonList count={3} label="Завантаження рецепта" /></View></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={contentWidth}>
        <ProductImage uri={recipe.imageUrl} height={190} label={recipe.title} />
        <Text accessibilityRole="header" style={[type.display, styles.title]}>{recipe.title}</Text>
        <Text style={[type.body, styles.desc]}>{recipe.description}</Text>
        <View style={styles.meta}>
          <Badge label={countLabel(recipe.items.length, "інгредієнт", "інгредієнти", "інгредієнтів")} />
          {recipe.guide ? (
            <>
              <Badge label={`${recipe.guide.durationMinutes} хв`} icon="clock" />
              <Badge label={countLabel(recipe.guide.servings, "порція", "порції", "порцій")} />
              <Badge label={recipe.guide.difficulty} />
            </>
          ) : null}
        </View>

        <Card style={styles.summary}>
          <Text style={type.label}>Орієнтовний мінімум за продукти</Text>
          <Text style={type.priceLarge}>{estimate ? `≈ ${formatPrice(Math.round(estimate * 100) / 100)}` : "Цін немає"}</Text>
          <Text style={styles.basis}>
            Найнижчі ціни можуть бути в різних магазинах.{unpriced ? ` Не враховано продуктів без ціни: ${unpriced}.` : ""}
          </Text>
          <PrimaryButton title="Додати продукти в кошик" icon="basket" loading={adding} onPress={addToCart} />
        </Card>
        <FreshnessNotice collectedAt={latestCollectedAt(recipe.items.map((item) => item.product))} />

        <SectionHeader title="Інгредієнти" />
        <Card style={styles.listCard}>
          {recipe.items.map((item, index) => {
            const price = minProductPrice(item.product);
            return (
              <View key={item.id} style={[styles.row, index > 0 && styles.divider]}>
                <ProductImage uri={item.product.imageUrl} size={52} />
                <View style={styles.rowBody}>
                  <Text style={type.bodyStrong} numberOfLines={2}>{item.product.name}</Text>
                  <Text style={type.small}>{item.product.volume} × {item.quantity}</Text>
                </View>
                {price !== null ? <Text style={styles.price}>від {formatPrice(price)}</Text> : <Badge label="Ціни немає" tone="caution" />}
              </View>
            );
          })}
        </Card>

        {recipe.guide ? (
          <>
            <SectionHeader title="Спосіб приготування" />
            <Card>
              {recipe.guide.steps.map((step, index) => (
                <View key={`${index}-${step}`} style={[styles.step, index === recipe.guide!.steps.length - 1 && styles.stepLast]}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View>
                  <Text style={[type.body, styles.stepText]}>{step}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}
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
  basis: { ...type.small, marginTop: spacing.xs, marginBottom: spacing.md },
  listCard: { paddingVertical: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowBody: { flex: 1, minWidth: 0 },
  price: { ...type.small, ...type.numeric, color: colors.text, fontWeight: "600" },
  step: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  stepLast: { marginBottom: 0 },
  stepNumber: { width: 28, height: 28, borderRadius: radii.pill, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  stepNumberText: { ...type.small, color: colors.primaryDark, fontWeight: "700" },
  stepText: { flex: 1 }
});
