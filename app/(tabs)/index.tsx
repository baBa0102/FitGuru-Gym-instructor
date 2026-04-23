import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export default function SplashScreen() {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(lineWidth, {
        toValue: 80,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => router.replace("/login"), 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.circle1} />
      <View style={styles.circle2} />
      <Animated.View
        style={[
          styles.logoBlock,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <View style={styles.iconMark}>
          <View style={styles.bar1} />
          <View style={styles.bar2} />
          <View style={styles.bar3} />
        </View>
        <Text style={styles.appName}>FitGuru</Text>
        <Animated.View style={[styles.dividerLine, { width: lineWidth }]} />
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Your personal gym instructor
        </Animated.Text>
      </Animated.View>
      <Animated.Text style={[styles.bottomLabel, { opacity: taglineOpacity }]}>
        Powered by AI · Built for results
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
  },
  circle1: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#1a2e1a",
    top: -80,
    right: -80,
    opacity: 0.5,
  },
  circle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#0f2a0f",
    bottom: 60,
    left: -60,
    opacity: 0.6,
  },
  logoBlock: { alignItems: "center" },
  iconMark: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 5,
    marginBottom: 20,
  },
  bar1: { width: 10, height: 28, backgroundColor: "#2d9e2d", borderRadius: 3 },
  bar2: { width: 10, height: 44, backgroundColor: "#3dbf3d", borderRadius: 3 },
  bar3: { width: 10, height: 36, backgroundColor: "#2d9e2d", borderRadius: 3 },
  appName: {
    fontSize: 48,
    fontWeight: "700",
    color: "#f0f0f0",
    letterSpacing: -1.5,
  },
  dividerLine: {
    height: 2,
    backgroundColor: "#3dbf3d",
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 14,
  },
  tagline: {
    fontSize: 14,
    color: "#666",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  bottomLabel: {
    position: "absolute",
    bottom: 48,
    fontSize: 12,
    color: "#333",
    letterSpacing: 0.5,
  },
});
