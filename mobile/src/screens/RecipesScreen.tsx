import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { Recipe } from "../types";

export function RecipesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  useFocusEffect(useCallback(() => { api.recipes().then(setRecipes).catch((error) => Alert.alert("Рецепти", error.message)); }, []));

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      data={recipes}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => navigation.navigate("RecipeDetails", { recipeId: item.id })}>
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.description}</Text>
            <Text style={styles.meta}>{item.items.length} інгредієнтів</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7fbf9" },
  card: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#e4ece8", padding: 10, marginBottom: 10 },
  image: { width: 82, height: 82, borderRadius: 8, marginRight: 12 },
  title: { color: "#17231e", fontWeight: "900", fontSize: 17 },
  desc: { color: "#60736b", marginTop: 4 },
  meta: { color: "#0e7a43", fontWeight: "800", marginTop: 8 }
});
