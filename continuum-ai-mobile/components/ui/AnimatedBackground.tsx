import React, { useEffect, useRef } from 'react';
import { View, Animated as RNAnimated, StyleSheet } from 'react-native';

const CIRCLES = [
  { size: 260, color: 'rgba(79,126,255,0.07)', top: -60, left: -60, dx: 18, dy: 14, duration: 9000 },
  { size: 220, color: 'rgba(79,126,255,0.05)', bottom: -40, right: -40, dx: -16, dy: -20, duration: 12000 },
  { size: 180, color: 'rgba(79,126,255,0.04)', top: '40%', left: '30%', dx: 12, dy: -10, duration: 10500 },
] as const;

export function AnimatedBackground() {
  const anims = CIRCLES.map(() => ({
    x: useRef(new RNAnimated.Value(0)).current,
    y: useRef(new RNAnimated.Value(0)).current,
  }));

  useEffect(() => {
    CIRCLES.forEach((circle, i) => {
      const { x, y } = anims[i];
      const { dx, dy, duration } = circle;

      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.parallel([
            RNAnimated.timing(x, { toValue: dx, duration: duration, useNativeDriver: true }),
            RNAnimated.timing(y, { toValue: dy, duration: duration, useNativeDriver: true }),
          ]),
          RNAnimated.parallel([
            RNAnimated.timing(x, { toValue: 0, duration: duration, useNativeDriver: true }),
            RNAnimated.timing(y, { toValue: 0, duration: duration, useNativeDriver: true }),
          ]),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {CIRCLES.map((circle, i) => {
        const posStyle: any = {};
        if ('top' in circle && circle.top !== undefined) posStyle.top = circle.top;
        if ('bottom' in circle && circle.bottom !== undefined) posStyle.bottom = circle.bottom;
        if ('left' in circle && circle.left !== undefined) posStyle.left = circle.left;
        if ('right' in circle && circle.right !== undefined) posStyle.right = circle.right;

        return (
          <RNAnimated.View
            key={i}
            style={[
              {
                position: 'absolute',
                width: circle.size,
                height: circle.size,
                borderRadius: circle.size / 2,
                backgroundColor: circle.color,
                ...posStyle,
              },
              { transform: [{ translateX: anims[i].x }, { translateY: anims[i].y }] },
            ]}
          />
        );
      })}
    </View>
  );
}
