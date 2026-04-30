import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

// 1. Define specific interfaces for type safety
interface Meal {
  time: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  foods: string[];
}

interface UserProfile {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  weight: number;
  height: number;
  goal: string;
}

export default function DietScreen() {
  const { profile } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetCalories, setTargetCalories] = useState(0);

  useEffect(() => {
    if (profile?.weight && profile?.height) {
      generateDietPlan();
    }
  }, [profile]);

  const createMealsFromTarget = (totalCals: number): Meal[] => {
  // 1. Calculate specific Macros based on the target calories
  const proteinGrams = Math.round((totalCals * 0.3) / 4);
  const carbsGrams = Math.round((totalCals * 0.4) / 4);
  const fatsGrams = Math.round((totalCals * 0.3) / 9);

  // 2. Define a scaling factor (Standardizing against a 2000kcal base)
  const scale = totalCals / 2000;

  // 3. Helper to round measurements to the nearest 5 for clean UI
  const r5 = (val: number) => Math.round(val / 5) * 5;

  return [
    {
      time: "Breakfast (25%)",
      name: "High-Protein Oats & Fruit",
      calories: Math.round(totalCals * 0.25),
      protein: Math.round(proteinGrams * 0.25),
      carbs: Math.round(carbsGrams * 0.25),
      fats: Math.round(fatsGrams * 0.25),
      foods: [
        `${r5(70 * scale)}g Rolled Oats`,
        `${Math.max(1, Math.round(1.5 * scale))} Boiled Eggs`,
        `${r5(150 * scale)}ml Low-fat Milk`,
        "1 Medium Banana"
      ]
    },
    {
      time: "Lunch (35%)",
      name: "Lean Protein & Complex Carbs",
      calories: Math.round(totalCals * 0.35),
      protein: Math.round(proteinGrams * 0.35),
      carbs: Math.round(carbsGrams * 0.35),
      fats: Math.round(fatsGrams * 0.35),
      foods: [
        `${r5(150 * scale)}g Grilled Chicken or Paneer`,
        `${r5(80 * scale)}g Brown Rice (Dry weight)`,
        "1 Cup Steamed Broccoli",
        `${(1.5 * scale).toFixed(1)} tsp Olive Oil`
      ]
    },
    {
      time: "Snack (15%)",
      name: "Fuel & Recovery",
      calories: Math.round(totalCals * 0.15),
      protein: Math.round(proteinGrams * 0.15),
      carbs: Math.round(carbsGrams * 0.15),
      fats: Math.round(fatsGrams * 0.15),
      foods: [
        "1 Scoop Whey Protein or Greek Yogurt",
        "1 Apple or Pear",
        `${r5(20 * scale)}g Mixed Nuts`
      ]
    },
    {
      time: "Dinner (25%)",
      name: "Light Balanced Recovery",
      calories: Math.round(totalCals * 0.25),
      protein: Math.round(proteinGrams * 0.25),
      carbs: Math.round(carbsGrams * 0.25),
      fats: Math.round(fatsGrams * 0.25),
      foods: [
        `${r5(120 * scale)}g Grilled Fish or Dal`,
        `${Math.max(1, Math.round(2 * scale))} Whole Wheat Rotis`,
        "Large Green Salad",
        `${r5(30 * scale)}g Avocado or Hummus`
      ]
    }
  ];
};

  const generateDietPlan = async () => {
    if (!profile || !profile.weight || !profile.height) return;

    setLoading(true);
    try {
      let finalTdee = 0;

      // Try API first
      const queryParams = new URLSearchParams({
        weight: profile.weight.toString(),
        height: profile.height.toString(),
        age: profile.age.toString(),
        gender: profile.gender.toLowerCase(),
        activity: "1.55", 
      }).toString();

      const response = await fetch(
        `https://gym-calculations.p.rapidapi.com/bmr?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'x-rapidapi-key': process.env.EXPO_PUBLIC_RAPID_API_KEY || '',
            'x-rapidapi-host': 'gym-calculations.p.rapidapi.com'
          }
        }
      );

      const data = await response.json();

      if (data && data.tdee) {
        finalTdee = Math.round(data.tdee);
      } else {
        // Fallback to local calculation if API fails or 404s
        let bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age);
        bmr = profile.gender === 'male' ? bmr + 5 : bmr - 161;
        finalTdee = Math.round(bmr * 1.55);
      }

      // 3. Goal Adjustment
      let adjustedTarget = finalTdee;
      if (profile.goal === 'build_muscle' || profile.goal === 'bulk') adjustedTarget += 400;
      else if (profile.goal === 'lose_weight') adjustedTarget -= 500;

      setTargetCalories(adjustedTarget);
      setMeals(createMealsFromTarget(adjustedTarget));

    } catch (error) {
      console.error("Diet Generation Error:", error);
      // Immediate local fallback on network error
      const bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age);
      const fallbackTdee = Math.round((profile.gender === 'male' ? bmr + 5 : bmr - 161) * 1.55);
      setTargetCalories(fallbackTdee);
      setMeals(createMealsFromTarget(fallbackTdee));
    } finally {
      setLoading(false);
    }
  };

  const totalProtein = meals.reduce((sum, m) => sum + m.protein, 0);
  const totalCarbs = meals.reduce((sum, m) => sum + m.carbs, 0);
  const totalFats = meals.reduce((sum, m) => sum + m.fats, 0);

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Diet Plan</Text>
          <Text style={styles.headerSub}>AI-calculated for {profile.goal.replace('_', ' ')}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={generateDietPlan}>
          <Text style={styles.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#3dbf3d" size="large" />
          <Text style={styles.loadingText}>Analyzing profile...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Daily Target</Text>
            <View style={styles.macroRow}>
              <View style={styles.macroBox}>
                <Text style={styles.macroValue}>{targetCalories}</Text>
                <Text style={styles.macroLabel}>Calories</Text>
              </View>
              <View style={styles.macroBox}>
                <Text style={styles.macroValue}>{totalProtein}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroBox}>
                <Text style={styles.macroValue}>{totalCarbs}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroBox}>
                <Text style={styles.macroValue}>{totalFats}g</Text>
                <Text style={styles.macroLabel}>Fats</Text>
              </View>
            </View>
          </View>

          {meals.map((meal, i) => (
            <View key={i} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealTime}>{meal.time}</Text>
                <Text style={styles.mealCals}>{meal.calories} kcal</Text>
              </View>
              <Text style={styles.mealName}>{meal.name}</Text>
              <View style={styles.mealMacros}>
                <Text style={styles.mealMacro}>P: {meal.protein}g</Text>
                <Text style={styles.mealMacro}>C: {meal.carbs}g</Text>
                <Text style={styles.mealMacro}>F: {meal.fats}g</Text>
              </View>
              <View style={styles.foodsList}>
                {meal.foods.map((food, fi) => (
                  <View key={fi} style={styles.foodItem}>
                    <Text style={styles.foodBullet}>•</Text>
                    <Text style={styles.foodText}>{food}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#f0f0f0' },
  headerSub: { fontSize: 12, color: '#555', marginTop: 2 },
  refreshBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  refreshIcon: { fontSize: 20, color: '#3dbf3d' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { color: '#555', marginTop: 14, fontSize: 14 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
  summaryCard: { backgroundColor: '#111', borderRadius: 16, padding: 20, borderWidth: 0.5, borderColor: '#1e3e1e', marginBottom: 16 },
  summaryTitle: { fontSize: 12, fontWeight: '700', color: '#3dbf3d', textTransform: 'uppercase', marginBottom: 16 },
  macroRow: { flexDirection: 'row', gap: 12 },
  macroBox: { flex: 1, alignItems: 'center' },
  macroValue: { fontSize: 20, fontWeight: '700', color: '#f0f0f0' },
  macroLabel: { fontSize: 10, color: '#555' },
  mealCard: { backgroundColor: '#111', borderRadius: 16, padding: 18, marginBottom: 12 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  mealTime: { fontSize: 11, color: '#3dbf3d' },
  mealCals: { fontSize: 11, color: '#777' },
  mealName: { fontSize: 16, fontWeight: '700', color: '#f0f0f0', marginBottom: 8 },
  mealMacros: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  mealMacro: { fontSize: 11, color: '#666' },
  foodsList: { gap: 6 },
  foodItem: { flexDirection: 'row', gap: 8 },
  foodBullet: { color: '#3dbf3d' },
  foodText: { fontSize: 13, color: '#aaa' },
});