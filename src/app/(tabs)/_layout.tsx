import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAV_ITEMS, NavItem, navStyles } from '@/components/NavBar';
import { colors } from '@/theme/colors';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Tabs>
        <View style={styles.slot}>
          <TabSlot />
        </View>
        <TabList asChild>
          <View accessibilityRole="tablist" accessibilityLabel="Alt gezinme" style={navStyles.bar}>
            {NAV_ITEMS.map(({ name, href, label, Icon }) => (
              <TabTrigger key={name} name={name} href={href} asChild>
                <NavItem label={label} Icon={Icon} />
              </TabTrigger>
            ))}
          </View>
        </TabList>
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  slot: { flex: 1 },
});
