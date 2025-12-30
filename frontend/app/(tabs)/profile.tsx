import { Text, View, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Components
import History from "@/components/history/history";
import Stats from "@/components/profile/stats";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

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

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              
              // Call backend logout endpoint
              if (token) {
                await fetch(`${API_URL}/logout`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                  },
                });
              }
              
              // Clear local storage
              await AsyncStorage.removeItem('auth_token');
              await AsyncStorage.removeItem('user');
              
              // Redirect to login
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Logout error:', error);
              // Even if API call fails, still clear local data and redirect
              await AsyncStorage.removeItem('auth_token');
              await AsyncStorage.removeItem('user');
              router.replace('/(auth)/login');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.userInfo}>

        <Text style={styles.username}>{user.username}</Text>
        <Image
            source={require("../../assets/images/icon.png")}
            style={styles.avatar}    
        ></Image>
        <Text style={styles.playerType}>{user.playerType}</Text>
        <Text style={styles.balance}>Balance</Text>
        <Text style={styles.balance}>${user.balance}</Text>
      </View>
      
      <Stats/>
      <History scrollEnabled={false} />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
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
    paddingBottom: 40,
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
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 30,
    width: '90%',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})