import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

// ── Mock user data (replace with AsyncStorage/Firebase later) ──
const USER = {
  name: "Basit",
  age: 24,
  gender: "male",
  weight: 75,
  weightUnit: "kg",
  height: 175,
  heightUnit: "cm",
  goal: "build_muscle",
  joinedDays: 5,
};

const GOAL_LABELS: Record<string, string> = {
  lose_weight: "Lose weight",
  build_muscle: "Build muscle",
  bulk: "Bulk up",
  lean: "Get lean",
  muscle_mass: "Muscle mass",
  stay_fit: "Stay fit",
};

const TODAY_WORKOUT = [
  { name: "Push-ups", sets: "4 × 15", muscle: "Chest" },
  { name: "Pull-ups", sets: "3 × 10", muscle: "Back" },
  { name: "Dumbbell Curl", sets: "3 × 12", muscle: "Biceps" },
  { name: "Shoulder Press", sets: "3 × 10", muscle: "Shoulders" },
];

const TODAY_MEALS = [
  { time: "Breakfast", meal: "Oats + boiled eggs + banana", cals: 420 },
  { time: "Lunch", meal: "Rice + dal + chicken curry", cals: 680 },
  { time: "Snack", meal: "Mixed nuts + protein shake", cals: 280 },
  { time: "Dinner", meal: "Roti + paneer sabzi + salad", cals: 520 },
];

const TOTAL_CALS = TODAY_MEALS.reduce((a, m) => a + m.cals, 0);

export default function HomeScreen() {
  const [checkedExercises, setCheckedExercises] = useState<Set<number>>(
    new Set(),
  );
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  // BMI calculation
  const weightKg = USER.weight;
  const heightM = USER.height / 100;
  const bmi = (weightKg / (heightM * heightM)).toFixed(1);
  const bmiNum = parseFloat(bmi);
  const bmiInfo =
    bmiNum < 18.5
      ? { label: "Underweight", color: "#378ADD" }
      : bmiNum < 25
        ? { label: "Healthy", color: "#3dbf3d" }
        : bmiNum < 30
          ? { label: "Overweight", color: "#ba7517" }
          : { label: "Obese", color: "#993c1d" };

  const workoutProgress = checkedExercises.size / TODAY_WORKOUT.length;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: workoutProgress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [workoutProgress]);

  const toggleExercise = (i: number) => {
    setCheckedExercises((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.userName}>{USER.name} 👋</Text>
        </View>
        <TouchableOpacity style={styles.avatarBtn}>
          <Text style={styles.avatarText}>{USER.name[0]}</Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* ── BMI Card ── */}
          <View style={styles.bmiCard}>
            <View style={styles.bmiLeft}>
              <Text style={styles.bmiCardLabel}>Your BMI</Text>
              <Text style={[styles.bmiCardValue, { color: bmiInfo.color }]}>
                {bmi}
              </Text>
              <View
                style={[
                  styles.bmiBadge,
                  { backgroundColor: bmiInfo.color + "22" },
                ]}
              >
                <Text style={[styles.bmiBadgeText, { color: bmiInfo.color }]}>
                  {bmiInfo.label}
                </Text>
              </View>
            </View>
            <View style={styles.bmiRight}>
              <View style={styles.bmiStatRow}>
                <Text style={styles.bmiStatLabel}>Weight</Text>
                <Text style={styles.bmiStatVal}>
                  {USER.weight} {USER.weightUnit}
                </Text>
              </View>
              <View style={styles.bmiDivider} />
              <View style={styles.bmiStatRow}>
                <Text style={styles.bmiStatLabel}>Height</Text>
                <Text style={styles.bmiStatVal}>
                  {USER.height} {USER.heightUnit}
                </Text>
              </View>
              <View style={styles.bmiDivider} />
              <View style={styles.bmiStatRow}>
                <Text style={styles.bmiStatLabel}>Goal</Text>
                <Text style={[styles.bmiStatVal, { color: "#3dbf3d" }]}>
                  {GOAL_LABELS[USER.goal]}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Stats Row ── */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🔥</Text>
              <Text style={styles.statVal}>{TOTAL_CALS}</Text>
              <Text style={styles.statLabel}>kcal today</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>💪</Text>
              <Text style={styles.statVal}>{TODAY_WORKOUT.length}</Text>
              <Text style={styles.statLabel}>exercises</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>📅</Text>
              <Text style={styles.statVal}>{USER.joinedDays}</Text>
              <Text style={styles.statLabel}>day streak</Text>
            </View>
          </View>

          {/* ── Today's Workout ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's workout</Text>
              <TouchableOpacity>
                <Text style={styles.sectionLink}>See all →</Text>
              </TouchableOpacity>
            </View>

            {/* Progress bar */}
            <View style={styles.workoutProgressWrap}>
              <View style={styles.workoutProgressTrack}>
                <Animated.View
                  style={[
                    styles.workoutProgressFill,
                    { width: progressBarWidth },
                  ]}
                />
              </View>
              <Text style={styles.workoutProgressLabel}>
                {checkedExercises.size}/{TODAY_WORKOUT.length} done
              </Text>
            </View>

            {TODAY_WORKOUT.map((ex, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.exerciseRow,
                  checkedExercises.has(i) && styles.exerciseRowDone,
                ]}
                onPress={() => toggleExercise(i)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.exerciseCheck,
                    checkedExercises.has(i) && styles.exerciseCheckDone,
                  ]}
                >
                  {checkedExercises.has(i) && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </View>
                <View style={styles.exerciseInfo}>
                  <Text
                    style={[
                      styles.exerciseName,
                      checkedExercises.has(i) && styles.exerciseNameDone,
                    ]}
                  >
                    {ex.name}
                  </Text>
                  <Text style={styles.exerciseMuscle}>{ex.muscle}</Text>
                </View>
                <Text style={styles.exerciseSets}>{ex.sets}</Text>
              </TouchableOpacity>
            ))}

            {checkedExercises.size === TODAY_WORKOUT.length && (
              <View style={styles.completedBanner}>
                <Text style={styles.completedText}>
                  🎉 Workout complete! Great job today.
                </Text>
              </View>
            )}
          </View>

          {/* ── Today's Diet ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's diet</Text>
              <TouchableOpacity>
                <Text style={styles.sectionLink}>See all →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.calorieSummary}>
              <Text style={styles.calorieNum}>{TOTAL_CALS} kcal</Text>
              <Text style={styles.calorieLabel}> · daily target</Text>
            </View>

            {TODAY_MEALS.map((meal, i) => (
              <View key={i} style={styles.mealRow}>
                <View style={styles.mealTimeWrap}>
                  <Text style={styles.mealTime}>{meal.time}</Text>
                </View>
                <View style={styles.mealInfo}>
                  <Text style={styles.mealName}>{meal.meal}</Text>
                </View>
                <Text style={styles.mealCals}>{meal.cals} kcal</Text>
              </View>
            ))}
          </View>

          {/* ── Weekly check-in banner ── */}
          <View style={styles.checkinBanner}>
            <View style={styles.checkinLeft}>
              <Text style={styles.checkinTitle}>Weekly check-in</Text>
              <Text style={styles.checkinSub}>
                Log your weight to track progress
              </Text>
            </View>
            <TouchableOpacity style={styles.checkinBtn}>
              <Text style={styles.checkinBtnText}>Log weight</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 48,
    paddingBottom: 16,
  },
  greeting: { fontSize: 14, color: "#555", marginBottom: 2 },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f0f0f0",
    letterSpacing: -0.5,
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#1a2e1a",
    borderWidth: 1,
    borderColor: "#3dbf3d",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#3dbf3d" },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },

  // BMI card
  bmiCard: {
    backgroundColor: "#111",
    borderRadius: 20,
    padding: 20,
    borderWidth: 0.5,
    borderColor: "#1e1e1e",
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  bmiLeft: { alignItems: "center", justifyContent: "center", minWidth: 80 },
  bmiCardLabel: {
    fontSize: 10,
    color: "#444",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  bmiCardValue: { fontSize: 40, fontWeight: "700", letterSpacing: -1 },
  bmiBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  bmiBadgeText: { fontSize: 11, fontWeight: "700" },
  bmiRight: { flex: 1, justifyContent: "center", gap: 8 },
  bmiStatRow: { flexDirection: "row", justifyContent: "space-between" },
  bmiStatLabel: { fontSize: 12, color: "#555" },
  bmiStatVal: { fontSize: 12, color: "#bbb", fontWeight: "600" },
  bmiDivider: { height: 0.5, backgroundColor: "#1a1a1a" },

  // Stats row
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: "#1e1e1e",
    alignItems: "center",
    gap: 4,
  },
  statIcon: { fontSize: 20 },
  statVal: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f0f0f0",
    letterSpacing: -0.5,
  },
  statLabel: { fontSize: 10, color: "#444", letterSpacing: 0.3 },

  // Sections
  section: {
    backgroundColor: "#111",
    borderRadius: 20,
    padding: 18,
    borderWidth: 0.5,
    borderColor: "#1e1e1e",
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#f0f0f0" },
  sectionLink: { fontSize: 12, color: "#3dbf3d" },

  // Workout
  workoutProgressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  workoutProgressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "#1a1a1a",
    borderRadius: 2,
    overflow: "hidden",
  },
  workoutProgressFill: {
    height: "100%",
    backgroundColor: "#3dbf3d",
    borderRadius: 2,
  },
  workoutProgressLabel: {
    fontSize: 11,
    color: "#555",
    minWidth: 48,
    textAlign: "right",
  },

  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1a1a1a",
  },
  exerciseRowDone: { opacity: 0.5 },
  exerciseCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseCheckDone: { backgroundColor: "#3dbf3d", borderColor: "#3dbf3d" },
  checkMark: { fontSize: 11, color: "#0a0a0a", fontWeight: "700" },
  exerciseInfo: { flex: 1 },
  exerciseName: {
    fontSize: 14,
    color: "#ccc",
    fontWeight: "500",
    marginBottom: 2,
  },
  exerciseNameDone: { textDecorationLine: "line-through", color: "#444" },
  exerciseMuscle: { fontSize: 11, color: "#444" },
  exerciseSets: { fontSize: 12, color: "#555", fontWeight: "600" },

  completedBanner: {
    marginTop: 12,
    backgroundColor: "#0d1f0d",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#1e3e1e",
  },
  completedText: { color: "#3dbf3d", fontSize: 13, fontWeight: "600" },

  // Diet
  calorieSummary: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 14,
  },
  calorieNum: {
    fontSize: 22,
    fontWeight: "700",
    color: "#3dbf3d",
    letterSpacing: -0.5,
  },
  calorieLabel: { fontSize: 12, color: "#444" },

  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1a1a1a",
  },
  mealTimeWrap: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 70,
    alignItems: "center",
  },
  mealTime: {
    fontSize: 10,
    color: "#555",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 12, color: "#aaa", lineHeight: 18 },
  mealCals: { fontSize: 11, color: "#444", fontWeight: "600" },

  // Check-in banner
  checkinBanner: {
    backgroundColor: "#0d1f0d",
    borderRadius: 16,
    padding: 18,
    borderWidth: 0.5,
    borderColor: "#1e3e1e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  checkinLeft: { flex: 1 },
  checkinTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3dbf3d",
    marginBottom: 2,
  },
  checkinSub: { fontSize: 12, color: "#3a6e3a" },
  checkinBtn: {
    backgroundColor: "#3dbf3d",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  checkinBtnText: { fontSize: 12, fontWeight: "700", color: "#0a0a0a" },
});
