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
import { FirebaseError } from "firebase/app";
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

async function upsertUserProfile(user: User, displayNameOverride?: string) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    return snap.data() as AppUser;
  }

  const profile = {
    uid: user.uid,
    email: user.email ?? "",
    displayName: displayNameOverride ?? user.displayName ?? "Trader",
    role: "user" as const,
    balance: 0,
    locked: 0,
    currency: "INR",
    portfolio: [],
    transactions: [],
    updatedAt: Date.now(),
    createdAt: Date.now(),
    createdAtServer: serverTimestamp(),
  };

  await setDoc(userRef, profile, { merge: true });
  return {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    createdAt: profile.createdAt,
  } satisfies AppUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setLoading(false);

      if (!user) {
        setAppUser(null);
        return;
      }

      try {
        const profile = await upsertUserProfile(user);
        setAppUser(profile);
      } catch (error) {
        if (error instanceof FirebaseError) {
          console.error("[AuthSync] Failed to read/write users profile in Firestore", {
            code: error.code,
            message: error.message,
            uid: user.uid,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          });
        } else {
          console.error("[AuthSync] Unknown Firestore profile sync error", error);
        }

        setAppUser({
          uid: user.uid,
          email: user.email ?? "",
          displayName: user.displayName ?? "Trader",
          role: "user",
          createdAt: Date.now(),
        });
      }
    });

    return () => {
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
        await upsertUserProfile(cred.user, displayName);
      },
      loginWithGoogle: async () => {
        await ensureAuthPersistence();
        const cred = await signInWithPopup(auth, googleProvider);
        await upsertUserProfile(cred.user);
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
