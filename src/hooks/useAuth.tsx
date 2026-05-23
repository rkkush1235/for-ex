"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, db, ensureAuthPersistence, googleProvider } from "@/firebase/firebase";
import { AppUser } from "@/types";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

interface AuthContextShape {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextShape | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 7000);

    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        setFirebaseUser(user);
        if (!user) {
          setAppUser(null);
          return;
        }

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          const newUser: Omit<AppUser, "createdAt"> = {
            uid: user.uid,
            email: user.email ?? "",
            displayName: user.displayName ?? "Trader",
            role: "user",
          };

          await setDoc(userRef, {
            ...newUser,
            createdAt: Date.now(),
            createdAtServer: serverTimestamp(),
          });
          setAppUser({ ...newUser, createdAt: Date.now() });
        } else {
          setAppUser(userSnap.data() as AppUser);
        }
      } catch {
        if (user) {
          setAppUser({
            uid: user.uid,
            email: user.email ?? "",
            displayName: user.displayName ?? "Trader",
            role: "user",
            createdAt: Date.now(),
          });
        }
      } finally {
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, []);

  const value = useMemo<AuthContextShape>(
    () => ({
      firebaseUser,
      appUser,
      loading,
      login: async (email, password) => {
        await ensureAuthPersistence();
        await signInWithEmailAndPassword(auth, email, password);
      },
      signup: async (email, password, displayName) => {
        await ensureAuthPersistence();
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", cred.user.uid), {
          uid: cred.user.uid,
          email,
          displayName,
          role: "user",
          createdAt: Date.now(),
          createdAtServer: serverTimestamp(),
        });
      },
      loginWithGoogle: async () => {
        await ensureAuthPersistence();
        const cred = await signInWithPopup(auth, googleProvider);
        const userRef = doc(db, "users", cred.user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          await setDoc(userRef, {
            uid: cred.user.uid,
            email: cred.user.email ?? "",
            displayName: cred.user.displayName ?? "Trader",
            role: "user",
            createdAt: Date.now(),
            createdAtServer: serverTimestamp(),
          });
        }
      },
      logout: async () => {
        await signOut(auth);
      },
    }),
    [firebaseUser, appUser, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
