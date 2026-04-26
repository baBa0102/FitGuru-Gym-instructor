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
  const { user } = useAuth();
  const [step, setStep] = useState(0);
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
      if (!form.age || parseInt(form.age) < 10 || parseInt(form.age) > 100) { Alert.alert('Invalid age', 'Please enter a valid age.'); return false; }
      if (!form.gender) { Alert.alert('Missing info', 'Please select your gender.'); return false; }
    }
    if (step === 1) {
      if (!form.weight || parseFloat(form.weight) <= 0) { Alert.alert('Invalid weight', 'Please enter your weight.'); return false; }
      if (!form.height || parseFloat(form.height) <= 0) { Alert.alert('Invalid height', 'Please enter your height.'); return false; }
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
      if (!user && !auth.currentUser) {
        Alert.alert('Authorization required', 'Please login before completing onboarding.');
        router.replace('/login');
        return;
      }
      const activeUser = user ?? auth.currentUser;
      if (!activeUser) return;
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
        weightHistory: [],
      };
      await setDoc(doc(db, 'users', activeUser.uid), savedProfile, { merge: true });
      await AsyncStorage.multiSet([
        ['userProfile', JSON.stringify(savedProfile)],
        ['isOnboarded', 'true'],
      ]);
      router.replace('/(tabs)');
    }
  };

  const goBack = () => {
    if (step > 0) animateNext(-1, () => setStep(s => s - 1));
  };

  // BMI calculation (live preview on step 2)
  const getBMI = () => {
    const w = parseFloat(form.weight);
    const h = parseFloat(form.height);
    if (!w || !h) return null;
    const weightKg = form.weightUnit === 'lbs' ? w * 0.453592 : w;
    const heightM = form.heightUnit === 'ft' ? h * 0.3048 : h / 100;
    const bmi = weightKg / (heightM * heightM);
    return bmi.toFixed(1);
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
      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: `${((step + 1) / 3) * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{step + 1} of 3</Text>
      </View>

      {/* Step indicators */}
      <View style={styles.stepRow}>
        {STEPS.map((s, i) => (
          <View key={i} style={styles.stepItem}>
            <View style={[styles.stepDot, i <= step && styles.stepDotActive, i < step && styles.stepDotDone]}>
              {i < step
                ? <Text style={styles.stepCheck}>✓</Text>
                : <Text style={[styles.stepNum, i === step && styles.stepNumActive]}>{i + 1}</Text>
              }
            </View>
            <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{s}</Text>
          </View>
        ))}
        <View style={styles.stepConnector1} />
        <View style={[styles.stepConnector1, { left: '66%' }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>

          {/* ── STEP 0: Personal Info ── */}
          {step === 0 && (
            <View>
              <Text style={styles.stepTitle}>Tell us about yourself</Text>
              <Text style={styles.stepSub}>We&apos;ll personalise your plan based on your profile</Text>

              <Text style={styles.fieldLabel}>Your name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Arjun"
                placeholderTextColor="#444"
                value={form.name}
                onChangeText={t => setForm(f => ({ ...f, name: t }))}
              />

              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 24"
                placeholderTextColor="#444"
                keyboardType="number-pad"
                value={form.age}
                onChangeText={t => setForm(f => ({ ...f, age: t.replace(/\D/g, '') }))}
                maxLength={3}
              />

              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[styles.genderBtn, form.gender === 'male' && styles.genderBtnActive]}
                  onPress={() => setForm(f => ({ ...f, gender: 'male' }))}
                  activeOpacity={0.8}
                >
                  <Text style={styles.genderIcon}>♂</Text>
                  <Text style={[styles.genderText, form.gender === 'male' && styles.genderTextActive]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderBtn, form.gender === 'female' && styles.genderBtnActive]}
                  onPress={() => setForm(f => ({ ...f, gender: 'female' }))}
                  activeOpacity={0.8}
                >
                  <Text style={styles.genderIcon}>♀</Text>
                  <Text style={[styles.genderText, form.gender === 'female' && styles.genderTextActive]}>Female</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── STEP 1: Body Stats ── */}
          {step === 1 && (
            <View>
              <Text style={styles.stepTitle}>Your body stats</Text>
              <Text style={styles.stepSub}>Used to calculate your BMI and calorie needs</Text>

              <Text style={styles.fieldLabel}>Weight</Text>
              <View style={styles.inputWithUnit}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="e.g. 70"
                  placeholderTextColor="#444"
                  keyboardType="decimal-pad"
                  value={form.weight}
                  onChangeText={t => setForm(f => ({ ...f, weight: t }))}
                />
                <View style={styles.unitToggle}>
                  {(['kg', 'lbs'] as const).map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitBtn, form.weightUnit === u && styles.unitBtnActive]}
                      onPress={() => setForm(f => ({ ...f, weightUnit: u }))}
                    >
                      <Text style={[styles.unitText, form.weightUnit === u && styles.unitTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.fieldLabel}>Height</Text>
              <View style={styles.inputWithUnit}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder={form.heightUnit === 'cm' ? 'e.g. 175' : 'e.g. 5.9'}
                  placeholderTextColor="#444"
                  keyboardType="decimal-pad"
                  value={form.height}
                  onChangeText={t => setForm(f => ({ ...f, height: t }))}
                />
                <View style={styles.unitToggle}>
                  {(['cm', 'ft'] as const).map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitBtn, form.heightUnit === u && styles.unitBtnActive]}
                      onPress={() => setForm(f => ({ ...f, heightUnit: u }))}
                    >
                      <Text style={[styles.unitText, form.heightUnit === u && styles.unitTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Live BMI preview */}
              {bmi && bmiInfo && (
                <View style={styles.bmiCard}>
                  <View style={styles.bmiLeft}>
                    <Text style={styles.bmiLabel}>Your BMI</Text>
                    <Text style={[styles.bmiValue, { color: bmiInfo.color }]}>{bmi}</Text>
                  </View>
                  <View style={styles.bmiRight}>
                    <View style={[styles.bmiBadge, { backgroundColor: bmiInfo.color + '22' }]}>
                      <Text style={[styles.bmiBadgeText, { color: bmiInfo.color }]}>{bmiInfo.label}</Text>
                    </View>
                    <Text style={styles.bmiDesc}>
                      {bmiInfo.label === 'Healthy' ? 'Great! Keep it up.' :
                       bmiInfo.label === 'Underweight' ? 'Focus on gaining healthy weight.' :
                       bmiInfo.label === 'Overweight' ? 'A good diet plan will help.' :
                       'Your workout plan will address this.'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── STEP 2: Goal ── */}
          {step === 2 && (
            <View>
              <Text style={styles.stepTitle}>What&apos;s your goal?</Text>
              <Text style={styles.stepSub}>We&apos;ll build your workout and diet plan around this</Text>

              <View style={styles.goalsGrid}>
                {GOALS.map(goal => (
                  <TouchableOpacity
                    key={goal.id}
                    style={[styles.goalCard, form.goal === goal.id && styles.goalCardActive]}
                    onPress={() => setForm(f => ({ ...f, goal: goal.id }))}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.goalIcon}>{goal.icon}</Text>
                    <Text style={[styles.goalLabel, form.goal === goal.id && styles.goalLabelActive]}>{goal.label}</Text>
                    <Text style={styles.goalDesc}>{goal.desc}</Text>
                    {form.goal === goal.id && (
                      <View style={styles.goalCheck}>
                        <Text style={styles.goalCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Summary card */}
              {form.goal && (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Your profile summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Name</Text>
                    <Text style={styles.summaryVal}>{form.name}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Age</Text>
                    <Text style={styles.summaryVal}>{form.age} years</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Gender</Text>
                    <Text style={styles.summaryVal} >{form.gender}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Weight</Text>
                    <Text style={styles.summaryVal}>{form.weight} {form.weightUnit}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Height</Text>
                    <Text style={styles.summaryVal}>{form.height} {form.heightUnit}</Text>
                  </View>
                  {bmi && bmiInfo && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryKey}>BMI</Text>
                      <Text style={[styles.summaryVal, { color: bmiInfo.color }]}>{bmi} · {bmiInfo.label}</Text>
                    </View>
                  )}
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Goal</Text>
                    <Text style={[styles.summaryVal, { color: '#3dbf3d' }]}>
                      {GOALS.find(g => g.id === form.goal)?.label}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

        </Animated.View>
      </ScrollView>

      {/* Bottom buttons */}
      <View style={styles.bottomBar}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, step === 0 && styles.nextBtnFull]}
          onPress={goNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextBtnText}>
            {step === 2 ? 'Build my plan →' : 'Continue →'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  progressWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 56, paddingBottom: 12, gap: 12 },
  progressTrack: { flex: 1, height: 3, backgroundColor: '#1a1a1a', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3dbf3d', borderRadius: 2 },
  progressLabel: { fontSize: 12, color: '#444', fontWeight: '500' },

  stepRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingBottom: 24, position: 'relative' },
  stepConnector1: { position: 'absolute', top: 14, left: '33%', width: '34%', height: 1, backgroundColor: '#1e1e1e' },
  stepItem: { alignItems: 'center', gap: 6, zIndex: 1 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { borderColor: '#3dbf3d', backgroundColor: '#0d1f0d' },
  stepDotDone: { backgroundColor: '#3dbf3d', borderColor: '#3dbf3d' },
  stepNum: { fontSize: 12, color: '#444', fontWeight: '600' },
  stepNumActive: { color: '#3dbf3d' },
  stepCheck: { fontSize: 12, color: '#0a0a0a', fontWeight: '700' },
  stepLabel: { fontSize: 10, color: '#444', letterSpacing: 0.3 },
  stepLabelActive: { color: '#3dbf3d' },

  scrollContent: { paddingHorizontal: 24, paddingBottom: 120 },

  stepTitle: { fontSize: 26, fontWeight: '700', color: '#f0f0f0', letterSpacing: -0.5, marginBottom: 6 },
  stepSub: { fontSize: 14, color: '#555', marginBottom: 28, lineHeight: 20 },

  fieldLabel: { fontSize: 12, color: '#666', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: '#111', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, color: '#f0f0f0', fontSize: 16, borderWidth: 0.5, borderColor: '#222', marginBottom: 20 },

  genderRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  genderBtn: { flex: 1, backgroundColor: '#111', borderRadius: 14, paddingVertical: 20, alignItems: 'center', borderWidth: 0.5, borderColor: '#222', gap: 8 },
  genderBtnActive: { borderColor: '#3dbf3d', backgroundColor: '#0d1f0d' },
  genderIcon: { fontSize: 28, color: '#555' },
  genderText: { fontSize: 15, color: '#555', fontWeight: '600' },
  genderTextActive: { color: '#3dbf3d' },

  inputWithUnit: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  inputFlex: { flex: 1, backgroundColor: '#111', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, color: '#f0f0f0', fontSize: 16, borderWidth: 0.5, borderColor: '#222' },
  unitToggle: { backgroundColor: '#111', borderRadius: 14, borderWidth: 0.5, borderColor: '#222', overflow: 'hidden', flexDirection: 'row' },
  unitBtn: { paddingHorizontal: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  unitBtnActive: { backgroundColor: '#1a2e1a' },
  unitText: { fontSize: 14, color: '#444', fontWeight: '600' },
  unitTextActive: { color: '#3dbf3d' },

  bmiCard: { backgroundColor: '#111', borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: '#222', flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  bmiLeft: { alignItems: 'center' },
  bmiLabel: { fontSize: 10, color: '#444', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  bmiValue: { fontSize: 36, fontWeight: '700', letterSpacing: -1 },
  bmiRight: { flex: 1, gap: 6 },
  bmiBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  bmiBadgeText: { fontSize: 12, fontWeight: '700' },
  bmiDesc: { fontSize: 12, color: '#555', lineHeight: 18 },

  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  goalCard: { width: (width - 60) / 2, backgroundColor: '#111', borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: '#222', position: 'relative' },
  goalCardActive: { borderColor: '#3dbf3d', backgroundColor: '#0d1f0d' },
  goalIcon: { fontSize: 26, marginBottom: 8 },
  goalLabel: { fontSize: 14, fontWeight: '700', color: '#aaa', marginBottom: 4 },
  goalLabelActive: { color: '#3dbf3d' },
  goalDesc: { fontSize: 11, color: '#444', lineHeight: 16 },
  goalCheck: { position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: 9, backgroundColor: '#3dbf3d', alignItems: 'center', justifyContent: 'center' },
  goalCheckText: { fontSize: 10, color: '#0a0a0a', fontWeight: '700' },

  summaryCard: { backgroundColor: '#111', borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: '#1e2e1e', gap: 10 },
  summaryTitle: { fontSize: 12, color: '#3dbf3d', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryKey: { fontSize: 13, color: '#444' },
  summaryVal: { fontSize: 13, color: '#bbb', fontWeight: '600', textTransform: 'capitalize' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 12, padding: 24, paddingBottom: Platform.OS === 'ios' ? 36 : 24, backgroundColor: '#0a0a0a', borderTopWidth: 0.5, borderTopColor: '#111' },
  backBtn: { flex: 1, backgroundColor: '#111', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 0.5, borderColor: '#222' },
  backBtnText: { color: '#666', fontSize: 15, fontWeight: '600' },
  nextBtn: { flex: 2, backgroundColor: '#3dbf3d', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  nextBtnFull: { flex: 1 },
  nextBtnText: { color: '#0a0a0a', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
});
