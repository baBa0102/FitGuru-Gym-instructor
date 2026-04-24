import { StyleSheet, Text, View } from "react-native";
export default function ProgressScreen() {
  return (
    <View style={s.c}>
      <Text style={s.t}>📈 Progress — coming soon!</Text>
    </View>
  );
}
const s = StyleSheet.create({
  c: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
  },
  t: { color: "#3dbf3d", fontSize: 16 },
});
