import { Text, View, StyleSheet, ScrollView, Image } from "react-native";


// Components
import History from "@/components/history/history";
import Stats from "@/components/profile/stats";

export default function ProfileScreen() {
    const user = {
      username: "John Doe",
      age: 28,
      gender: "Male",
      nationality: "BEL",
      balance: 1500,
      playerType: "Reliable Player",
      avatar: "../assets/images/icon.png",
    }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.userInfo}>

        <Text style={styles.username}>{user.username}</Text>
        <Image
            source={require("../assets/images/icon.png")}
            style={styles.avatar}    
        ></Image>
        <Text style={styles.playerType}>{user.playerType}</Text>
        <Text style={styles.balance}>Balance</Text>
        <Text style={styles.balance}>${user.balance}</Text>
      </View>
      
      <Stats/>
      <History scrollEnabled={false} />
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    flex: 1
  },
  textStyle: {
    color:'white',
  },
  content:{
    alignItems: "center",
  },
  userInfo:{
    alignItems: "center",
    marginBottom: 10,
  },
  username:{
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginVertical: 10,
  },
  avatar:{
    width: 100,
    height: 100,
    borderRadius: 100,
    marginBottom: 10,
  },
  playerType:{
    fontSize: 18,
    color: "white",
    marginBottom: 10,
  },
  balance:{
    fontSize: 29,
    fontWeight: "bold",
    color: "white",
  }

})