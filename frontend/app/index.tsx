import { Text, View, StyleSheet } from "react-native";

// Components
import History from "@/components/history/history";
import GameButton from "@/components/game/gameButton";

export default function Index() {
  const balance = 21034;
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.balance}>Balance</Text>
        <Text style={styles.balance}>${balance}</Text>
      </View>
      <History containerStyle={{ height: "40%" }} />
      <GameButton />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    flex: 1,
    alignItems: "center",
    justifyContent: "space-around",
  },
  balance: {
    color:'white',
    fontSize: 30,
    fontWeight: "bold",
  }
})