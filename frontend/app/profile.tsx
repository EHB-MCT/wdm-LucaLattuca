import { Text, View, StyleSheet } from "react-native";


export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.textStyle}>Profile</Text>
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