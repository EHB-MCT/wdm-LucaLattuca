import { Text, View, StyleSheet } from "react-native";


export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.textStyle}>History</Text>
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