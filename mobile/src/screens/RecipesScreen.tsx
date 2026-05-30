import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { Recipe } from "../types";
import { colors, radii, shadow } from "../utils/theme";

export function RecipesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useFocusEffect(
    useCallback(() => {
      api.recipes()
        .then(setRecipes)
        .catch((error) => Alert.alert("Меню", error.message));
    }, [])
  );

  const ingredientCount = useMemo(() => recipes.reduce((sum, recipe) => sum + recipe.items.length, 0), [recipes]);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={recipes}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={styles.hero}>
          <Text style={styles.kicker}>Готові кошики</Text>
          <Text style={styles.heroTitle}>Меню та рецепти</Text>
          <Text style={styles.heroText}>Обери страву, додай інгредієнти в кошик і порівняй магазини за ціною.</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{recipes.length}</Text>
              <Text style={styles.statLabel}>рецептів</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{ingredientCount}</Text>
              <Text style={styles.statLabel}>інгредієнтів</Text>
            </View>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={() => navigation.navigate("RecipeDetails", { recipeId: item.id })}>
          <View style={styles.imageWrap}>
            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="contain" /> : <Text style={styles.imageFallback}>PW</Text>}
          </View>
          <View style={styles.body}>
            <View style={styles.row}>
              <Text style={styles.meta}>{item.items.length} інгредієнтів</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
            <View style={styles.ingredients}>
              {item.items.slice(0, 3).map((ingredient) => (
                <Text key={ingredient.id} style={styles.ingredient} numberOfLines={1}>{ingredient.product.name}</Text>
              ))}
            </View>
          </View>
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Меню ще формується</Text>
          <Text style={styles.emptyText}>Після імпорту товарів PriceWise автоматично збере рецепти з доступних продуктів.</Text>
        </View>
      }
    />
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
  hero: {
    ...shadow,
    backgroundColor: colors.primaryDark,
    borderRadius: radii.xl,
    padding: 20,
    marginBottom: 16
  },
  kicker: {
    color: "#D9F8E8",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 8
  },
  heroText: {
    color: "#E4F7EC",
    lineHeight: 20,
    marginTop: 8
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    padding: 12
  },
  statValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900"
  },
  statLabel: {
    color: "#E4F7EC",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3
  },
  card: {
    ...shadow,
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },
  imageWrap: {
    width: 96,
    height: 96,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center"
  },
  image: {
    width: "100%",
    height: "100%"
  },
  imageFallback: {
    color: colors.primary,
    fontWeight: "900"
  },
  body: {
    flex: 1,
    marginLeft: 13
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  meta: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  chevron: {
    color: colors.muted,
    fontSize: 24,
    lineHeight: 24
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 21,
    marginTop: 4
  },
  desc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4
  },
  ingredients: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 9
  },
  ingredient: {
    maxWidth: 128,
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "900"
  },
  empty: {
    ...shadow,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  emptyText: {
    color: colors.muted,
    marginTop: 6,
    lineHeight: 20
  }
});
