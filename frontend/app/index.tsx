import { Text, View, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { Image } from "react-native";

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.textStyle}>Edit app/index.tsx to edit this screen.</Text>
      
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