import { Text, View, StyleSheet } from "react-native";

// Components
import History from "@/components/history/history";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <History />
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
  }
})