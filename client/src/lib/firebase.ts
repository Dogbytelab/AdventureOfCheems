import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider, getRedirectResult, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: "712779174108",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();

export const signInWithGmail = async () => {
  try {
    console.log("Attempting Gmail sign-in...");
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error("Gmail sign-in error:", error);
    throw error;
  }
};

export const handleAuthRedirect = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      console.log("Auth redirect successful:", result.user.email);
    }
    return result;
  } catch (error) {
    console.error("Auth redirect error:", error);
    throw error;
  }
};

export const logout = () => {
  return signOut(auth);
};
