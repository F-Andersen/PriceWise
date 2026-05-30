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
    const listId = await AsyncStorage.getItem("activeListId");
    const list = await api.addRecipeToList(recipe.id, listId || undefined);
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
      </View>

      <PrimaryButton title="Додати продукти в кошик" onPress={addToCart} />

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
  section: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 20,
    marginBottom: 12
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
