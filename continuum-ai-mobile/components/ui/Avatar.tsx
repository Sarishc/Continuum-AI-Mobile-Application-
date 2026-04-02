import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius } from '../../constants/theme';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name?: string;
  uri?: string;
  size?: AvatarSize;
  style?: ViewStyle;
}

const sizeMap: Record<AvatarSize, number> = { sm: 32, md: 40, lg: 56, xl: 72 };
const fontSizeMap: Record<AvatarSize, number> = {
  sm: FontSize.sm,
  md: FontSize.md,
  lg: FontSize.xl,
  xl: FontSize['2xl'],
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export function Avatar({ name, uri, size = 'md', style }: AvatarProps) {
  const dimension = sizeMap[size];
  const fontSize = fontSizeMap[size];

  const containerStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
  };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, containerStyle as ImageStyle, style as ImageStyle]}
      />
    );
  }

  return (
    <View style={[styles.placeholder, containerStyle, style]}>
      <Text style={[styles.initials, { fontSize }]}>
        {name ? getInitials(name) : '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: Colors.surfaceElevated,
  },
  placeholder: {
    backgroundColor: 'rgba(56, 139, 253, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 139, 253, 0.3)',
  },
  initials: {
    color: Colors.primary,
    fontFamily: FontFamily.bodySemiBold,
  },
});
