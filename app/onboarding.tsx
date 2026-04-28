import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../config/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const GOALS = [
  { id: 'lose_weight',    label: 'Lose weight',       icon: '🔥', desc: 'Burn fat, get lean' },
  { id: 'build_muscle',   label: 'Build muscle',      icon: '💪', desc: 'Gain strength & size' },
  { id: 'bulk',           label: 'Bulk up',           icon: '📈', desc: 'Maximize mass gain' },
  { id: 'lean',           label: 'Get lean',          icon: '⚡', desc: 'Tone without bulk' },
  { id: 'muscle_mass',    label: 'Muscle mass',       icon: '🏋️', desc: 'Build lean muscle' },
  { id: 'stay_fit',       label: 'Stay fit',          icon: '🎯', desc: 'General fitness' },
];

const STEPS = ['Personal info', 'Body stats', 'Your goal'];

export default function OnboardingScreen() {
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: '' as 'male' | 'female' | '',
    weight: '',
    weightUnit: 'kg' as 'kg' | 'lbs',
    height: '',
    heightUnit: 'cm' as 'cm' | 'ft',
    goal: '',
  });

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateNext = (direction: 1 | -1, callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -40 * direction, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      callback();
      slideAnim.setValue(40 * direction);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.name.trim()) { Alert.alert('Missing info', 'Please enter your name.'); return false; }
      if (!form.age || parseInt(form.age) < 10) { Alert.alert('Invalid age', 'Please enter a valid age.'); return false; }
      if (!form.gender) { Alert.alert('Missing info', 'Please select your gender.'); return false; }
    }
    if (step === 1) {
      if (!form.weight) { Alert.alert('Invalid weight', 'Please enter your weight.'); return false; }
      if (!form.height) { Alert.alert('Invalid height', 'Please enter your height.'); return false; }
    }
    if (step === 2) {
      if (!form.goal) { Alert.alert('Pick a goal', 'Please select your fitness goal.'); return false; }
    }
    return true;
  };

  const goNext = async () => {
    if (!validateStep()) return;
    if (step < 2) {
      animateNext(1, () => setStep(s => s + 1));
    } else {
      const activeUser = auth.currentUser;
      if (!activeUser) {
        Alert.alert('Session Expired', 'Please login again.');
        router.replace('/login');
        return;
      }

      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const savedProfile = {
          uid: activeUser.uid,
          phone: activeUser.phoneNumber || '',
          name: form.name.trim(),
          age: Number(form.age),
          gender: form.gender,
          weight: Number(form.weight),
          weightUnit: form.weightUnit,
          height: Number(form.height),
          heightUnit: form.heightUnit,
          goal: form.goal,
          joinedAt: today,
          lastWeightCheck: null,
          dayPlans: {},
          completedExercises: {},
          weightHistory: [{ date: today, weight: Number(form.weight) }],
        };

        // 1. Save to Firestore
        await setDoc(doc(db, 'users', activeUser.uid), savedProfile);
        
        // 2. Sync global AuthContext
        await refreshProfile(); 

        // 3. Move to main app
        router.replace('/(tabs)');
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Failed to save profile. Check your connection.");
      } finally {
        setLoading(false);
      }
    }
  };

  const goBack = () => {
    if (step > 0) animateNext(-1, () => setStep(s => s - 1));
  };

  const getBMI = () => {
    const w = parseFloat(form.weight);
    const h = parseFloat(form.height);
    if (!w || !h) return null;
    const weightKg = form.weightUnit === 'lbs' ? w * 0.453592 : w;
    const heightM = form.heightUnit === 'ft' ? h * 0.3048 : h / 100;
    return (weightKg / (heightM * heightM)).toFixed(1);
  };

  const getBMILabel = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: '#378ADD' };
    if (bmi < 25)   return { label: 'Healthy',     color: '#3dbf3d' };
    if (bmi < 30)   return { label: 'Overweight',  color: '#ba7517' };
    return               { label: 'Obese',         color: '#993c1d' };
  };

  const bmi = getBMI();
  const bmiInfo = bmi ? getBMILabel(parseFloat(bmi)) : null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: `${((step + 1) / 3) * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{step + 1} of 3</Text>
      </View>

      <View style={styles.stepRow}>
        {STEPS.map((s, i) => (
          <View key={i} style={styles.stepItem}>
            <View style={[styles.stepDot, i <= step && styles.stepDotActive, i < step && styles.stepDotDone]}>
              {i < step ? <Text style={styles.stepCheck}>✓</Text> : <Text style={[styles.stepNum, i === step && styles.stepNumActive]}>{i + 1}</Text>}
            </View>
            <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{s}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
          {step === 0 && (
            <View>
              <Text style={styles.stepTitle}>Tell us about yourself</Text>
              <Text style={styles.fieldLabel}>Your name</Text>
              <TextInput style={styles.input} placeholder="e.g. Arjun" placeholderTextColor="#444" value={form.name} onChangeText={t => setForm(f => ({ ...f, name: t }))} />
              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput style={styles.input} placeholder="e.g. 24" keyboardType="number-pad" value={form.age} onChangeText={t => setForm(f => ({ ...f, age: t.replace(/\D/g, '') }))} maxLength={3} />
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity style={[styles.genderBtn, form.gender === 'male' && styles.genderBtnActive]} onPress={() => setForm(f => ({ ...f, gender: 'male' }))}><Text style={styles.genderText}>Male</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.genderBtn, form.gender === 'female' && styles.genderBtnActive]} onPress={() => setForm(f => ({ ...f, gender: 'female' }))}><Text style={styles.genderText}>Female</Text></TouchableOpacity>
              </View>
            </View>
          )}

          {step === 1 && (
            <View>
              <Text style={styles.stepTitle}>Your body stats</Text>
              <Text style={styles.fieldLabel}>Weight</Text>
              <View style={styles.inputWithUnit}>
                <TextInput style={styles.inputFlex} keyboardType="decimal-pad" value={form.weight} onChangeText={t => setForm(f => ({ ...f, weight: t }))} />
                <View style={styles.unitToggle}>
                  {['kg', 'lbs'].map(u => (
                    <TouchableOpacity key={u} style={[styles.unitBtn, form.weightUnit === u && styles.unitBtnActive]} onPress={() => setForm(f => ({ ...f, weightUnit: u as any }))}><Text style={styles.unitText}>{u}</Text></TouchableOpacity>
                  ))}
                </View>
              </View>
              <Text style={styles.fieldLabel}>Height</Text>
              <View style={styles.inputWithUnit}>
                <TextInput style={styles.inputFlex} keyboardType="decimal-pad" value={form.height} onChangeText={t => setForm(f => ({ ...f, height: t }))} />
                <View style={styles.unitToggle}>
                  {['cm', 'ft'].map(u => (
                    <TouchableOpacity key={u} style={[styles.unitBtn, form.heightUnit === u && styles.unitBtnActive]} onPress={() => setForm(f => ({ ...f, heightUnit: u as any }))}><Text style={styles.unitText}>{u}</Text></TouchableOpacity>
                  ))}
                </View>
              </View>
              {bmi && bmiInfo && (
                <View style={styles.bmiCard}>
                  <Text style={[styles.bmiValue, { color: bmiInfo.color }]}>BMI: {bmi}</Text>
                  <Text style={{ color: '#555' }}>{bmiInfo.label}</Text>
                </View>
              )}
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.stepTitle}>What's your goal?</Text>
              <View style={styles.goalsGrid}>
                {GOALS.map(goal => (
                  <TouchableOpacity key={goal.id} style={[styles.goalCard, form.goal === goal.id && styles.goalCardActive]} onPress={() => setForm(f => ({ ...f, goal: goal.id }))}>
                    <Text style={styles.goalIcon}>{goal.icon}</Text>
                    <Text style={styles.goalLabel}>{goal.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {step > 0 && <TouchableOpacity style={styles.backBtn} onPress={goBack}><Text style={styles.backBtnText}>Back</Text></TouchableOpacity>}
        <TouchableOpacity style={styles.nextBtn} onPress={goNext} disabled={loading}>
          <Text style={styles.nextBtnText}>{loading ? 'Saving...' : step === 2 ? 'Finish' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  progressWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 56, paddingBottom: 12, gap: 12 },
  progressTrack: { flex: 1, height: 3, backgroundColor: '#1a1a1a', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3dbf3d' },
  progressLabel: { fontSize: 12, color: '#444' },
  stepRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingBottom: 24 },
  stepItem: { alignItems: 'center', gap: 6 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { borderColor: '#3dbf3d', borderWidth: 1 },
  stepDotDone: { backgroundColor: '#3dbf3d' },
  stepNum: { fontSize: 12, color: '#444' },
  stepNumActive: { color: '#3dbf3d' },
  stepCheck: { color: '#0a0a0a', fontWeight: 'bold' },
  stepLabel: { fontSize: 10, color: '#444' },
  stepLabelActive: { color: '#3dbf3d' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 120 },
  stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#f0f0f0', marginBottom: 20 },
  fieldLabel: { fontSize: 12, color: '#666', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#111', borderRadius: 12, padding: 16, color: '#f0f0f0', borderWidth: 1, borderColor: '#222', marginBottom: 10 },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: { flex: 1, backgroundColor: '#111', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  genderBtnActive: { borderColor: '#3dbf3d' },
  genderText: { color: '#f0f0f0' },
  inputWithUnit: { flexDirection: 'row', gap: 10 },
  inputFlex: { flex: 1, backgroundColor: '#111', borderRadius: 12, padding: 16, color: '#f0f0f0', borderWidth: 1, borderColor: '#222' },
  unitToggle: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, overflow: 'hidden' },
  unitBtn: { padding: 16 },
  unitBtnActive: { backgroundColor: '#222' },
  unitText: { color: '#f0f0f0' },
  bmiCard: { marginTop: 20, padding: 16, backgroundColor: '#111', borderRadius: 12, alignItems: 'center' },
  bmiValue: { fontSize: 24, fontWeight: 'bold' },
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  goalCard: { width: (width - 60) / 2, backgroundColor: '#111', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#222' },
  goalCardActive: { borderColor: '#3dbf3d' },
  goalIcon: { fontSize: 24 },
  goalLabel: { color: '#f0f0f0', marginTop: 8 },
  bottomBar: { flexDirection: 'row', padding: 24, gap: 12, backgroundColor: '#0a0a0a' },
  backBtn: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#111', borderRadius: 12 },
  backBtnText: { color: '#f0f0f0' },
  nextBtn: { flex: 2, padding: 16, alignItems: 'center', backgroundColor: '#3dbf3d', borderRadius: 12 },
  nextBtnText: { fontWeight: 'bold' }
});
