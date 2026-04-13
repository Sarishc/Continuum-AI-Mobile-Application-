import { Tabs } from 'expo-router';
import { TabBar } from '../../components/layout/TabBar';
import { Colors } from '../../constants/colors';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="medications" options={{ title: 'Meds' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      {/* Timeline kept as a screen but not in the tab bar */}
      <Tabs.Screen name="timeline" options={{ href: null, title: 'Timeline' }} />
    </Tabs>
  );
}
