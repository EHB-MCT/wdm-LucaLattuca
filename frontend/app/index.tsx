import { Text, View, StyleSheet } from "react-native";

// Components
import History from "@/components/history/history";
import GameButton from "@/components/game/gameButton";

export default function Index() {
  const balance = 21034;
  return (
    <View style={styles.container}>
      <Text style={styles.textStyle}>${balance}</Text>
      <History />
      <GameButton />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    flex: 1,
        justifyContent: "center",
        alignItems: "center",
  },
  textStyle: {
    color:'white',
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 40,
  },
  button: {
    fontSize: 20,
    textDecorationLine: "underline",
    color: "#fff",
    position: "absolute",
    top:10,
    right:10

  },
  profileImage: {
    width:60,
    height:60,
    borderRadius: 100,
  }
})