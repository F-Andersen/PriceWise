import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { Recipe } from "../types";

export function RecipeDetailsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "RecipeDetails">>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    api.recipe(route.params.recipeId).then(setRecipe).catch((error) => Alert.alert("Рецепт", error.message));
  }, [route.params.recipeId]);

  async function addToCart() {
    if (!recipe) return;
    const listId = await AsyncStorage.getItem("activeListId");
    const list = await api.addRecipeToList(recipe.id, listId || undefined);
    await AsyncStorage.setItem("activeListId", list.id);
    Alert.alert("Додано", "Інгредієнти рецепта додані в кошик");
  }

  if (!recipe) return <View style={styles.container}><Text>Завантаження...</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: recipe.imageUrl }} style={styles.image} />
      <Text style={styles.title}>{recipe.title}</Text>
      <Text style={styles.desc}>{recipe.description}</Text>
      <PrimaryButton title="Додати продукти в кошик" onPress={addToCart} />
      <Text style={styles.section}>Інгредієнти</Text>
      {recipe.items.map((item) => (
        <View key={item.id} style={styles.row}>
          <Text style={styles.name}>{item.product.name}</Text>
          <Text style={styles.qty}>x{item.quantity}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7fbf9" },
  content: { padding: 16 },
  image: { height: 220, borderRadius: 8, backgroundColor: "#e7f3ee" },
  title: { color: "#10251c", fontSize: 28, fontWeight: "900", marginTop: 14 },
  desc: { color: "#60736b", marginTop: 6, marginBottom: 14 },
  section: { fontSize: 18, fontWeight: "900", color: "#17231e", marginTop: 22, marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ece8", borderRadius: 8, padding: 12, marginBottom: 8 },
  name: { color: "#17231e", fontWeight: "800" },
  qty: { color: "#0e7a43", fontWeight: "900" }
});
