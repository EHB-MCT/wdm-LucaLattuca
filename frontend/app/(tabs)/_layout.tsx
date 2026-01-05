import { Link, Tabs } from 'expo-router';
import { Image, Pressable, Text, View, StyleSheet } from 'react-native';
import { useUser } from '@/contexts/UserContext';

export default function TabsLayout() {
  const { user } = useUser();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: 'black' },
        headerTintColor: 'white',
        headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
        tabBarStyle: { backgroundColor: 'white' },
        tabBarActiveTintColor: 'black',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: 'Trust',
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Image
              source={require('../../assets/images/tab-icons/home-tab-icon.png')}
              style={{ width: size, height: size, tintColor: color }}
            />
          ),

          headerRight: () => (
            <View style={styles.headerRight}>
              <Text style={styles.username}>{user?.username || 'User'}</Text>
              <Link href={'/profile'} asChild>
                <Pressable>
                  <Image
                    source={require('../../assets/images/icon.png')}
                    style={styles.avatar}
                  />
                </Pressable>
              </Link>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          headerTitle: 'History',
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Image
              source={require('../../assets/images/tab-icons/history-tab-icon.png')}
              style={{ width: size, height: size, tintColor: color }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          headerTitle: 'Rewards',
          title: 'Rewards',
          tabBarIcon: ({ color, size }) => (
            <Image
              source={require('../../assets/images/tab-icons/rewards-tab-icon.png')}
              style={{ width: size, height: size, tintColor: color }}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="data"
        options={{
          headerTitle: 'Data',
          title: 'Data',
          tabBarIcon: ({ color, size }) => (
            <Image
              source={require('../../assets/images/tab-icons/data-tab-icon.png')}
              style={{ width: size, height: size, tintColor: color }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerTitle: 'Profile',
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Image
              source={require('../../assets/images/tab-icons/profile-tab-icon.png')}
              style={{ width: size, height: size, tintColor: color }}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  username: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
