// Context for managing authentication and user data
// Place at: /contexts/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebaseConfig';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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
  completedExercises: Record<string, string[]>; // date -> exerciseIds
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const PROFILE_STORAGE_KEY = 'userProfile';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await loadProfile(firebaseUser.uid);
      } else {
        setProfile(null);
        await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
      }
      setLoading(false);
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
        // Only use cache if it matches the current user's UID
        const cached = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
        if (cached) {
          const parsedCache = JSON.parse(cached) as UserProfile;
          if (parsedCache.uid === uid) {
            setProfile(parsedCache);
          } else {
            // Cache belongs to a different user, wipe it
            setProfile(null);
            await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
          }
        } else {
          setProfile(null);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null); // Default to null on error to force onboarding check
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    const merged = { ...profile, ...updates };
    setProfile(merged);
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(merged));

    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, updates, { merge: true });
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.clear();
      setProfile(null);
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
      value={{ user, profile, loading, updateProfile, logout, logWeight, markExerciseComplete }}
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