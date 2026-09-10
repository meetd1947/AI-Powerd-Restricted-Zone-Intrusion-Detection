import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDgHXFVRbUExo6PA5un29taVwt8riORfww",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "stadium-monitoring.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "stadium-monitoring",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "stadium-monitoring.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "521545732659",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:521545732659:web:45cd9fdd60a4fb07e34946",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-ZVQ0QG7T0D"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
