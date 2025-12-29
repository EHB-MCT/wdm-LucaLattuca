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
      avatar: "../../assets/images/icon.png",
    }

  return (
    <Text>Hello</Text>
  );
}


const styles = StyleSheet.create({
  

})