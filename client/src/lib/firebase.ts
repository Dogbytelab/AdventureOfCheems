import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider, getRedirectResult, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD-DClu-JLEcQxdNDWhg-gprkr0OxElhN8",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "aoc-web-ec319"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "aoc-web-ec319",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "aoc-web-ec319"}.appspot.com`,
  messagingSenderId: "712779174108",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:712779174108:web:a3254bb4d137a64dd5a419",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();

export const signInWithGmail = () => {
  return signInWithRedirect(auth, provider);
};

export const handleAuthRedirect = () => {
  return getRedirectResult(auth);
};

export const logout = () => {
  return signOut(auth);
};
