import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { api } from "../services/api";
import { useAuth } from "../services/AuthContext";
import { ShoppingList } from "../types";

export function ProfileScreen() {
  const { email, signOut } = useAuth();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  useFocusEffect(useCallback(() => { api.lists().then(setLists).catch((error) => Alert.alert("Профіль", error.message)); }, []));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Профіль</Text>
      <Text style={styles.email}>{email}</Text>
      <Text style={styles.section}>Збережені кошики</Text>
      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.list}>
            <Text style={styles.name}>{item.title}</Text>
            <Text style={styles.meta}>{item.items.length} товарів · {new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        )}
      />
      <PrimaryButton title="Вийти" variant="secondary" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7fbf9", padding: 16 },
  title: { color: "#10251c", fontSize: 26, fontWeight: "900" },
  email: { color: "#60736b", marginTop: 4 },
  section: { fontSize: 18, fontWeight: "900", color: "#17231e", marginTop: 22, marginBottom: 10 },
  list: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ece8", borderRadius: 8, padding: 12, marginBottom: 8 },
  name: { color: "#17231e", fontWeight: "800" },
  meta: { color: "#60736b", marginTop: 4 }
});
