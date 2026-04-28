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
    if (!profile) return; // Fixes 'profile possibly null' error

    setLoading(true);
    try {
      // Create query string for the API
      const queryParams = new URLSearchParams({
        weight: profile.weight.toString(),
        height: profile.height.toString(),
        age: profile.age.toString(),
        gender: profile.gender,
        activitylevel: '3', // Default moderate activity
        goal: profile.goal
      }).toString();

      // Note: Edamam Nutrition Data API usually takes an 'ingr' (ingredient) query. 
      // For a full meal plan calculation, you might actually want the Fitness Calculator API
      // But here is the corrected fetch syntax for your current RapidAPI setup:
      const response = await fetch(`https://fitness-calculator.p.rapidapi.com/dailycalorie?${queryParams}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': process.env.EXPO_PUBLIC_RAPID_API_KEY || '',
          'x-rapidapi-host': 'fitness-calculator.p.rapidapi.com'
        }
      });

      const data = await response.json();

      if (data.status_code === 200) {
        // Here you would take the calories from data.data.goals and 
        // set your meal state. For now, we will update the mock to use the real target.
        const targetCals = data.data.goals['Weight maintainance'];
        
        // This is where you would map your API response to your Meal interface
        // Example of adjusting mock data to real API target:
        const adjustedMockMeals: Meal[] = [
          {
            time: 'Breakfast',
            name: 'High-Protein Start',
            calories: Math.round(targetCals * 0.25),
            protein: 30, carbs: 40, fats: 12,
            foods: ['Oats with protein scoop', '2 Boiled Eggs'],
          },
          {
            time: 'Lunch',
            name: 'Balanced Power Meal',
            calories: Math.round(targetCals * 0.35),
            protein: 40, carbs: 50, fats: 15,
            foods: ['Chicken/Paneer (150g)', 'Brown Rice (1 cup)', 'Green Salad'],
          },
          {
            time: 'Dinner',
            name: 'Recovery Meal',
            calories: Math.round(targetCals * 0.30),
            protein: 35, carbs: 30, fats: 10,
            foods: ['Grilled Fish/Dal', '2 Whole Wheat Rotis', 'Mixed Veggies'],
          },
          {
            time: 'Snacks',
            name: 'Fuel',
            calories: Math.round(targetCals * 0.10),
            protein: 15, carbs: 20, fats: 5,
            foods: ['Greek Yogurt' , 'Apple'],
          }
        ];
        setMeals(adjustedMockMeals);
      }
    } catch (error) {
      console.error("Diet Generation Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.protein, 0);
  const totalCarbs = meals.reduce((sum, m) => sum + m.carbs, 0);
  const totalFats = meals.reduce((sum, m) => sum + m.fats, 0);

  if (!profile) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#3dbf3d" style={{ marginTop: 100 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Diet Plan</Text>
          <Text style={styles.headerSub}>AI-calculated for {profile.goal}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={generateDietPlan}>
          <Text style={styles.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#3dbf3d" size="large" />
          <Text style={styles.loadingText}>Calculating your requirements...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

          {meals.map((meal, i) => (
            <TouchableOpacity key={i} style={styles.mealCard} onPress={() => setSelectedMeal(meal)} activeOpacity={0.8}>
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
            </TouchableOpacity>
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