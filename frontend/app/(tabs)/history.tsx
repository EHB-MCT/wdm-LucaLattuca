import { Text, View, StyleSheet } from "react-native";
import History from "@/components/history/history";

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <History scrollEnabled={true} />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    flex: 1,
    alignItems: "center",
    paddingTop:30,
    
  }
})