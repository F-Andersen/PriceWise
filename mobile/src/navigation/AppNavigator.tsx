import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";
import { useAuth } from "../services/AuthContext";
import { AuthScreen } from "../screens/AuthScreen";
import { CompareStoresScreen } from "../screens/CompareStoresScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { OffersScreen } from "../screens/OffersScreen";
import { ProductDetailsScreen } from "../screens/ProductDetailsScreen";
import { ProductSearchScreen } from "../screens/ProductSearchScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RecipeDetailsScreen } from "../screens/RecipeDetailsScreen";
import { RecipesScreen } from "../screens/RecipesScreen";
import { ShoppingListScreen } from "../screens/ShoppingListScreen";
import { colors } from "../utils/theme";

export type RootStackParamList = {
  Tabs: undefined;
  ProductDetails: { productId: string };
  RecipeDetails: { recipeId: string };
  CompareStores: { listId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "900" },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.surface }
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Головна", tabBarIcon: ({ color }) => <Text style={{ color }}>⌂</Text> }} />
      <Tab.Screen name="Offers" component={OffersScreen} options={{ title: "Акції", tabBarIcon: ({ color }) => <Text style={{ color }}>%</Text> }} />
      <Tab.Screen name="Search" component={ProductSearchScreen} options={{ title: "Пошук", tabBarIcon: ({ color }) => <Text style={{ color }}>⌕</Text> }} />
      <Tab.Screen name="Cart" component={ShoppingListScreen} options={{ title: "Кошик", tabBarIcon: ({ color }) => <Text style={{ color }}>▣</Text> }} />
      <Tab.Screen name="Recipes" component={RecipesScreen} options={{ title: "Меню", tabBarIcon: ({ color }) => <Text style={{ color }}>☰</Text> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Профіль", tabBarIcon: ({ color }) => <Text style={{ color }}>○</Text> }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { token, isReady } = useAuth();
  if (!isReady) return null;
  if (!token) return <AuthScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: "900" } }}>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{ title: "Картка товару" }} />
      <Stack.Screen name="RecipeDetails" component={RecipeDetailsScreen} options={{ title: "Рецепт" }} />
      <Stack.Screen name="CompareStores" component={CompareStoresScreen} options={{ title: "Порівняння магазинів" }} />
    </Stack.Navigator>
  );
}
