import { Stack, Link } from "expo-router";
import { Image, Pressable } from "react-native";
import {Drawer} from "expo-router/drawer";

export default function RootLayout() {
  return (
    <Stack screenOptions={{
        headerStyle: { backgroundColor: 'black'},
        headerTintColor: 'white',
        headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
    }}>
      <Stack.Screen name="index"
        options={{
          headerTitle: "Trust",
        
          // headerShown: false,
          headerRight: () => (
            <Link href={"/profile"} asChild>
              <Pressable>
                <Image
                    source={require("../assets/images/icon.png")}
                    style={{ width: 46, height: 46,borderRadius: 100, marginRight: 10 }}    
                ></Image>
                </Pressable>
            </Link>
          ),
        }}
      />
      <Stack.Screen name="profile"
      options={{
          headerTitle: "Profile",
          // headerShown: false,
        }}
      />
      <Stack.Screen name="+not-found"
      options={{
          headerShown: false,
        }}
      />
      <Stack.Screen name="about"
      options={{
          headerTitle: "About",
        }}
      />
    </Stack>
    );
}
