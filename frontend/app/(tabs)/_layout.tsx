import { Stack, Link, Tabs } from "expo-router";
import { Image, Pressable } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
        headerStyle: { backgroundColor: 'black'},
        headerTintColor: 'white',
        headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
        tabBarStyle: { backgroundColor: 'white' },
        tabBarActiveTintColor: 'black',
    }}>
      <Tabs.Screen name="index"
        options={{
          headerTitle: "Trust",
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Image
                source={require("../../assets/images/tab-icons/home-tab-icon.png")}
                style={{ width: size, height: size, tintColor: color }}    
            ></Image>
          ),
        
          headerRight: () => (
            <Link href={"/profile"} asChild>
              <Pressable>
                <Image
                    source={require("../../assets/images/icon.png")}
                    style={{ width: 46, height: 46,borderRadius: 100, marginRight: 10 }}    
                ></Image>
                </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen name="history"
      options={{
          headerTitle: "History",
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Image
                source={require("../../assets/images/tab-icons/history-tab-icon.png")}
                style={{ width: size, height: size, tintColor: color }}
            ></Image>
            ),
        }}
      />
      <Tabs.Screen name="rewards"
      options={{
          headerTitle: "Rewards",
          title: "Rewards",
          tabBarIcon: ({ color, size }) => (
            <Image
                source={require("../../assets/images/tab-icons/rewards-tab-icon.png")}
                style={{ width: size, height: size, tintColor: color }}
            ></Image>
            ),
        }}
      />
        <Tabs.Screen name="profile"
        options={{
          headerTitle: "Profile",
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Image
                source={require("../../assets/images/tab-icons/profile-tab-icon.png")}
                style={{ width: size, height: size, tintColor: color }}
            ></Image>
            ),
          }}
        />
    </Tabs>
    );
}
