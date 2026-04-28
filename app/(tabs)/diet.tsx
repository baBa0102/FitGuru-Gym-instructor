// Diet screen - Place at: app/(tabs)/diet.tsx
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

interface Meal {
  time: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  foods: string[];
  alternatives?: string[];
}

export default function DietScreen() {
  const { profile } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);

  useEffect(() => {
    if (profile) {
      generateDietPlan();
    }
  }, [profile]);

  const generateDietPlan = async () => {
    setLoading(true);
    
    // TODO: Replace with actual Claude API call
    // For now, using mock data based on user profile
    
    setTimeout(() => {
      const mockMeals: Meal[] = [
        {
          time: 'Breakfast (7:00 AM)',
          name: 'High-Protein Start',
          calories: 450,
          protein: 35,
          carbs: 40,
          fats: 15,
          foods: ['Oats (1 cup)', '2 boiled eggs', 'Banana', 'Almonds (10)'],
          alternatives: ['Greek yogurt with berries', 'Whole wheat toast + peanut butter'],
        },
        {
          time: 'Mid-Morning Snack (10:30 AM)',
          name: 'Energy Boost',
          calories: 200,
          protein: 15,
          carbs: 20,
          fats: 8,
          foods: ['Protein shake', 'Apple'],
          alternatives: ['Mixed nuts', 'Cottage cheese'],
        },
        {
          time: 'Lunch (1:00 PM)',
          name: 'Balanced Plate',
          calories: 600,
          protein: 45,
          carbs: 55,
          fats: 20,
          foods: ['Rice (1 cup)', 'Chicken curry (150g)', 'Dal', 'Salad', 'Roti (2)'],
          alternatives: ['Fish curry', 'Paneer bhurji', 'Rajma'],
        },
        {
          time: 'Evening Snack (4:30 PM)',
          name: 'Pre-Workout Fuel',
          calories: 250,
          protein: 12,
          carbs: 30,
          fats: 10,
          foods: ['Banana', 'Peanut butter (2 tbsp)', 'Green tea'],
          alternatives: ['Energy bar', 'Smoothie'],
        },
        {
          time: 'Dinner (8:00 PM)',
          name: 'Recovery Meal',
          calories: 550,
          protein: 40,
          carbs: 45,
          fats: 18,
          foods: ['Roti (3)', 'Paneer sabzi', 'Mixed vegetables', 'Salad', 'Curd'],
          alternatives: ['Grilled chicken', 'Fish tikka', 'Egg curry'],
        },
      ];
      
      setMeals(mockMeals);
      setLoading(false);
    }, 1500);
  };

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.protein, 0);
  const totalCarbs = meals.reduce((sum, m) => sum + m.carbs, 0);
  const totalFats = meals.reduce((sum, m) => sum + m.fats, 0);

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Diet Plan</Text>
          <Text style={styles.headerSub}>AI-generated for {profile.goal}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={generateDietPlan}>
          <Text style={styles.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#3dbf3d" size="large" />
          <Text style={styles.loadingText}>Generating your meal plan...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Daily Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Daily Target</Text>
            <View style={styles.macroRow}>
              <View style={styles.macroBox}>
                <Text style={styles.macroValue}>{totalCalories}</Text>
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

          {/* Meals */}
          {meals.map((meal, i) => (
            <TouchableOpacity
              key={i}
              style={styles.mealCard}
              onPress={() => setSelectedMeal(meal)}
              activeOpacity={0.8}
            >
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
              {meal.alternatives && (
                <View style={styles.altSection}>
                  <Text style={styles.altLabel}>Alternatives:</Text>
                  <Text style={styles.altText}>{meal.alternatives.join(' • ')}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}

          {/* Tips */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 Tips for success</Text>
            <Text style={styles.tipText}>• Drink 3-4 liters of water daily</Text>
            <Text style={styles.tipText}>• Eat every 2-3 hours to maintain energy</Text>
            <Text style={styles.tipText}>• Track your meals for the first week</Text>
            <Text style={styles.tipText}>• Adjust portions based on hunger levels</Text>
          </View>
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
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#f0f0f0', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: '#555', marginTop: 2 },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111',
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: { fontSize: 20, color: '#3dbf3d' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { color: '#555', marginTop: 14, fontSize: 14 },

  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },

  summaryCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
    borderColor: '#1e3e1e',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3dbf3d',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  macroRow: { flexDirection: 'row', gap: 12 },
  macroBox: { flex: 1, alignItems: 'center' },
  macroValue: { fontSize: 20, fontWeight: '700', color: '#f0f0f0', marginBottom: 4 },
  macroLabel: { fontSize: 10, color: '#555', letterSpacing: 0.5 },

  mealCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 18,
    borderWidth: 0.5,
    borderColor: '#1e1e1e',
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealTime: { fontSize: 11, color: '#3dbf3d', fontWeight: '600', letterSpacing: 0.5 },
  mealCals: { fontSize: 11, color: '#777', fontWeight: '600' },
  mealName: { fontSize: 16, fontWeight: '700', color: '#f0f0f0', marginBottom: 8 },
  mealMacros: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  mealMacro: { fontSize: 11, color: '#666', fontWeight: '500' },

  foodsList: { gap: 6, marginBottom: 12 },
  foodItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  foodBullet: { fontSize: 12, color: '#3dbf3d', marginTop: 2 },
  foodText: { flex: 1, fontSize: 13, color: '#aaa', lineHeight: 20 },

  altSection: { marginTop: 8, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: '#1a1a1a' },
  altLabel: { fontSize: 10, color: '#555', marginBottom: 4 },
  altText: { fontSize: 12, color: '#666', lineHeight: 18 },

  tipsCard: {
    backgroundColor: '#0d1f0d',
    borderRadius: 16,
    padding: 18,
    borderWidth: 0.5,
    borderColor: '#1e3e1e',
    marginBottom: 16,
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: '#3dbf3d', marginBottom: 12 },
  tipText: { fontSize: 13, color: '#3a6e3a', lineHeight: 24 },
});
