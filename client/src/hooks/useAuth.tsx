import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth, handleAuthRedirect } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  isNewUser: boolean;
  setIsNewUser: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Try to get existing user
          const response = await apiRequest("GET", `/api/users/${firebaseUser.uid}`);
          const userData = await response.json();
          setUser(userData);
          setIsNewUser(false);
        } catch (error) {
          // User doesn't exist, mark as new user
          setIsNewUser(true);
        }
      } else {
        setUser(null);
        setIsNewUser(false);
      }
      
      setLoading(false);
    });

    // Handle redirect result
    handleAuthRedirect().then((result) => {
      if (result?.user) {
        console.log("User signed in via redirect:", result.user.email);
      }
    }).catch((error) => {
      console.error("Auth redirect error:", error);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, isNewUser, setIsNewUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
