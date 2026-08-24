import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors, FontSize, FontWeight } from '../theme';
import { HomeScreen } from '../screens/HomeScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { FilmsScreen } from '../screens/FilmsScreen';
import { FilmDetailScreen } from '../screens/FilmDetailScreen';
import { WatchScreen } from '../screens/WatchScreen';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Tab bar icon
function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={tabStyles.iconContainer}>
      <Text style={[tabStyles.icon, focused && tabStyles.iconFocused]}>{icon}</Text>
      <Text style={[tabStyles.label, focused && tabStyles.labelFocused]}>{label}</Text>
    </View>
  );
}

function FilmsListScreen() {
  // Placeholder — navigates to Films with phim-bo by default
  const { useNavigation } = require('@react-navigation/native');
  const nav = useNavigation();
  React.useEffect(() => {
    nav.replace('Films', { type: 'phim-moi-cap-nhat', title: 'Danh Sách Phim' });
  }, []);
  return null;
}

function ProfileScreen() {
  return (
    <View style={profileStyles.container}>
      <Text style={profileStyles.text}>👤</Text>
      <Text style={profileStyles.title}>Tài khoản</Text>
      <Text style={profileStyles.subtitle}>Đăng nhập để xem lịch sử và danh sách yêu thích</Text>
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.tabBarBackground,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🏠" label="Trang chủ" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="FilmsList"
        component={FilmsListScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🎬" label="Phim" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🔍" label="Tìm kiếm" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="👤" label="Tôi" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="FilmDetail" component={FilmDetailScreen} />
      <Stack.Screen name="Watch" component={WatchScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Films" component={FilmsScreen} />
    </Stack.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  iconContainer: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  icon: { fontSize: 20, opacity: 0.5 },
  iconFocused: { opacity: 1 },
  label: { fontSize: 10, color: Colors.tabBarInactive, fontWeight: FontWeight.medium },
  labelFocused: { color: Colors.tabBarActive },
});

const profileStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', gap: 12 },
  text: { fontSize: 64 },
  title: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.base, textAlign: 'center', paddingHorizontal: 40 },
});
