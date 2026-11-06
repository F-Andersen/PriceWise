import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { Recipe } from "../types";
import { minProductPrice } from "../utils/prices";
import { colors, radii, shadow } from "../utils/theme";

export function RecipeDetailsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "RecipeDetails">>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    api.recipe(route.params.recipeId)
      .then(setRecipe)
      .catch((error) => Alert.alert("Рецепт", error.message));
  }, [route.params.recipeId]);

  async function addToCart() {
    if (!recipe) return;
    let listId = await AsyncStorage.getItem("activeListId");
    let list;
    try {
      list = await api.addRecipeToList(recipe.id, listId || undefined);
    } catch (error) {
      await AsyncStorage.removeItem("activeListId");
      listId = null;
      list = await api.addRecipeToList(recipe.id);
    }
    await AsyncStorage.setItem("activeListId", list.id);
    Alert.alert("Додано", "Інгредієнти рецепта додані в кошик");
  }

  const estimatedTotal = useMemo(() => {
    if (!recipe) return 0;
    return recipe.items.reduce((sum, item) => sum + (minProductPrice(item.product) || 0) * item.quantity, 0);
  }, [recipe]);

  if (!recipe) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Завантаження...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.imageWrap}>
          {recipe.imageUrl ? <Image source={{ uri: recipe.imageUrl }} style={styles.image} resizeMode="contain" /> : <Text style={styles.imageFallback}>PW</Text>}
        </View>
        <Text style={styles.kicker}>Готовий кошик</Text>
        <Text style={styles.title}>{recipe.title}</Text>
        <Text style={styles.desc}>{recipe.description}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{recipe.items.length}</Text>
            <Text style={styles.summaryLabel}>інгредієнтів</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{estimatedTotal ? `${estimatedTotal.toFixed(0)} грн` : "ціни"}</Text>
            <Text style={styles.summaryLabel}>від мінімуму</Text>
          </View>
        </View>
        {recipe.guide ? (
          <View style={styles.guideMetaRow}>
            <Text style={styles.guideMeta}>{recipe.guide.durationMinutes} хв</Text>
            <Text style={styles.guideMeta}>{recipe.guide.servings} порції</Text>
            <Text style={styles.guideMeta}>{recipe.guide.difficulty}</Text>
          </View>
        ) : null}
      </View>

      <PrimaryButton title="Додати продукти в кошик" onPress={addToCart} />

      {recipe.guide ? (
        <>
          <Text style={styles.section}>Спосіб приготування</Text>
          <View style={styles.stepsCard}>
            {recipe.guide.steps.map((step, index) => (
              <View key={`${index}-${step}`} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.section}>Інгредієнти</Text>
      {recipe.items.map((item) => {
        const price = minProductPrice(item.product);
        return (
          <View key={item.id} style={styles.row}>
            <View style={styles.productImageWrap}>
              {item.product.imageUrl ? <Image source={{ uri: item.product.imageUrl }} style={styles.productImage} resizeMode="contain" /> : <Text style={styles.productFallback}>PW</Text>}
            </View>
            <View style={styles.productBody}>
              <Text style={styles.name} numberOfLines={2}>{item.product.name}</Text>
              <Text style={styles.meta}>{item.product.brand} · {item.product.volume}</Text>
            </View>
            <View style={styles.qtyBox}>
              <Text style={styles.qty}>x{item.quantity}</Text>
              {price ? <Text style={styles.price}>від {price} грн</Text> : null}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: 16,
    paddingBottom: 118
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background
  },
  loadingText: {
    color: colors.muted,
    fontWeight: "800"
  },
  hero: {
    ...shadow,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14
  },
  imageWrap: {
    height: 190,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  image: {
    width: "100%",
    height: "100%"
  },
  imageFallback: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: "900"
  },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginTop: 14
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32,
    marginTop: 6
  },
  desc: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: 7
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    padding: 12
  },
  summaryValue: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900"
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3
  },
  guideMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  guideMeta: {
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "900"
  },
  section: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 20,
    marginBottom: 12
  },
  stepsCard: {
    ...shadow,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 14
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },
  stepNumberText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900"
  },
  stepText: {
    flex: 1,
    color: colors.text,
    lineHeight: 20,
    fontWeight: "700"
  },
  row: {
    ...shadow,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 10,
    marginBottom: 10
  },
  productImageWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  productImage: {
    width: "100%",
    height: "100%"
  },
  productFallback: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900"
  },
  productBody: {
    flex: 1,
    marginLeft: 11
  },
  name: {
    color: colors.text,
    fontWeight: "900",
    lineHeight: 18
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4
  },
  qtyBox: {
    alignItems: "flex-end",
    maxWidth: 92,
    marginLeft: 8
  },
  qty: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "900"
  },
  price: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "right"
  }
});
