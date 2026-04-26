import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  initializeAuth, 
  getAuth, 
  Auth 
} from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth'; 
import { getFirestore, Firestore } from 'firebase/firestore'; // Corrected import
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize App
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Auth with explicit typing
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}

// Initialize Firestore with explicit typing
const db: Firestore = getFirestore(app);

export { auth, db, firebaseConfig };