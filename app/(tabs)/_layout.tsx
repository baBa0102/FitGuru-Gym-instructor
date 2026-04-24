import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0f0f0f', borderTopColor: '#1a1a1a', height: 60 },
        tabBarActiveTintColor: '#3dbf3d',
        tabBarInactiveTintColor: '#444',
        tabBarLabelStyle: { fontSize: 11, marginBottom: 6 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: () => null }} />
      <Tabs.Screen name="workout" options={{ title: 'Workout', tabBarIcon: () => null }} />
      <Tabs.Screen name="diet" options={{ title: 'Diet', tabBarIcon: () => null }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: () => null }} />
    </Tabs>
  );
}