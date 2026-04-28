import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebaseConfig';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserProfile {
  uid: string;
  phone: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  weight: number;
  weightUnit: 'kg' | 'lbs';
  height: number;
  heightUnit: 'cm' | 'ft';
  goal: string;
  joinedAt: string;
  lastWeightCheck: string | null;
  dayPlans: Record<number, string[]>;
  completedExercises: Record<string, string[]>;
  weightHistory: Array<{ date: string; weight: number }>;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  logWeight: (weight: number) => Promise<void>;
  markExerciseComplete: (exerciseId: string) => Promise<void>;
  refreshProfile: () => Promise<void>; // Added to sync state after onboarding
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const PROFILE_STORAGE_KEY = 'userProfile';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // Re-enter loading state during auth transition
      setUser(firebaseUser);
      
      if (firebaseUser) {
        await loadProfile(firebaseUser.uid);
      } else {
        setProfile(null);
        await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
      }
      
      setLoading(false); // Only stop loading once profile logic is finished
    });
    return unsubscribe;
  }, []);

  const loadProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const remoteProfile = docSnap.data() as UserProfile;
        setProfile(remoteProfile);
        await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(remoteProfile));
      } else {
        setProfile(null); // Explicitly null if no Firestore doc exists
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await loadProfile(auth.currentUser.uid);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile || !user) return;
    try {
      const merged = { ...profile, ...updates };
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, updates, { merge: true });
      setProfile(merged);
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(merged));
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
      setProfile(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const logWeight = async (weight: number) => {
    if (!user || !profile) return;
    const today = new Date().toISOString().split('T')[0];
    const newEntry = { date: today, weight };
    const updatedHistory = [...(profile.weightHistory || []), newEntry];
    await updateProfile({
      weightHistory: updatedHistory,
      lastWeightCheck: today,
    });
  };

  const markExerciseComplete = async (exerciseId: string) => {
    if (!user || !profile) return;
    const today = new Date().toISOString().split('T')[0];
    const todayExercises = profile.completedExercises?.[today] || [];
    const updated = {
      ...profile.completedExercises,
      [today]: [...todayExercises, exerciseId],
    };
    await updateProfile({ completedExercises: updated });
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, updateProfile, logout, logWeight, markExerciseComplete, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}