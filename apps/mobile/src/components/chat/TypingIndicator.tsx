import React, { useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useTheme } from "react-native-paper";

export const TypingIndicator: React.FC = () => {
  const theme = useTheme();
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  const hasStarted = useRef(false);
  if (!hasStarted.current) {
    hasStarted.current = true;
    const animateDot = (value: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.3,
            duration: 450,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
  }

  const dotStyle = (val: Animated.Value) => [
    styles.dot,
    {
      backgroundColor: theme.colors.onSurfaceVariant,
      opacity: val,
      transform: [
        {
          translateY: val.interpolate({
            inputRange: [0.3, 1],
            outputRange: [0, -4],
          }),
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.bubble, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Animated.View style={dotStyle(dot1)} />
        <Animated.View style={dotStyle(dot2)} />
        <Animated.View style={dotStyle(dot3)} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginVertical: 4,
    paddingLeft: 16,
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 2,
    gap: 5,
    minHeight: 36,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
