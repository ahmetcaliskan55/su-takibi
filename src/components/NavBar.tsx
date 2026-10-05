import { forwardRef, type ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { CalendarIcon, SlidersIcon, SproutIcon } from './icons';

export const NAV_ITEMS = [
  { name: 'index', href: '/', label: 'Bugün', Icon: SproutIcon },
  { name: 'history', href: '/history', label: 'Geçmiş', Icon: CalendarIcon },
  { name: 'settings', href: '/settings', label: 'Ayarlar', Icon: SlidersIcon },
] as const;

type NavItemProps = PressableProps & {
  /** `TabTrigger asChild` tarafından verilir. */
  isFocused?: boolean;
  label: string;
  Icon: ComponentType<{ size?: number; color: string }>;
};

/** Alt gezinmedeki tek sekme düğmesi (prototipteki beyaz hap çubuğunun öğesi). */
export const NavItem = forwardRef<View, NavItemProps>(function NavItem(
  { isFocused, label, Icon, ...rest },
  ref,
) {
  const fg = isFocused ? colors.greenDark : colors.inkSoft;
  return (
    <Pressable
      ref={ref}
      {...rest}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={label}
      style={[styles.item, isFocused && styles.itemActive]}
    >
      <Icon size={20} color={fg} />
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
});

export const navStyles = StyleSheet.create({
  bar: {
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 6,
    height: 64,
    padding: 6,
    borderRadius: 32,
    backgroundColor: colors.white,
    flexDirection: 'row',
    gap: 4,
  },
});

const styles = StyleSheet.create({
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 26,
  },
  itemActive: { backgroundColor: colors.greenLight },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
});
