"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { FirebaseError } from "firebase/app";
import { auth, db, isFirebaseConfigured } from "@/firebase/firebase";
import { doc, getDoc, getDocFromCache } from "firebase/firestore";

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email"),
  password: z
    .string()
    .refine((value) => value.trim().length > 0, { message: "Password is required" })
    .refine((value) => value.length >= 6, { message: "Password must be at least 6 characters" }),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [authError, setAuthError] = useState<string>("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const handlePostLoginRoute = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      router.replace("/login");
      return;
    }

    const userRef = doc(db, "users", uid);

    try {
      const cachedSnap = await getDocFromCache(userRef);
      if (cachedSnap.exists()) {
        const status = (cachedSnap.data()?.status as string | undefined) ?? "pending";
        const role = (cachedSnap.data()?.role as string | undefined) ?? "user";

        if (role === "admin" || status === "approved") {
          router.replace(role === "admin" ? "/admin" : "/dashboard");
          return;
        }

        router.replace("/approval-status");
        return;
      }
    } catch {}

    const snap = await getDoc(userRef);
    const status = (snap.data()?.status as string | undefined) ?? "pending";
    const role = (snap.data()?.role as string | undefined) ?? "user";

    if (role === "admin" || status === "approved") {
      router.replace(role === "admin" ? "/admin" : "/dashboard");
      return;
    }

    router.replace("/approval-status");
  };

  const onSubmit = async (data: FormData) => {
    setAuthError("");
    if (!isFirebaseConfigured) {
      setAuthError("Firebase configuration is missing. Please check NEXT_PUBLIC_FIREBASE_* in .env.local.");
      return;
    }

    const email = data.email.trim();
    const password = data.password;

    if (!email || !password.trim()) {
      setAuthError("Email and password are required.");
      return;
    }

    try {
      await login(email, password);
      await handlePostLoginRoute();
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (
          error.code === "auth/invalid-credential" ||
          error.code === "auth/invalid-login-credentials" ||
          error.code === "auth/wrong-password" ||
          error.code === "auth/user-not-found"
        ) {
          setAuthError("Invalid email or password, or this account is not enabled in Firebase Auth.");
          return;
        }
        if (error.code === "unavailable" || error.code === "failed-precondition") {
          setAuthError("Network is offline. Please reconnect to the internet and try again.");
          return;
        }
        if (error.code === "auth/invalid-api-key") {
          setAuthError("Invalid Firebase API key. Please verify .env.local values.");
          return;
        }
        setAuthError(`Login failed: ${error.code}`);
        return;
      }
      setAuthError("Login failed. Please try again.");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <form onSubmit={handleSubmit(onSubmit)} className="glass w-full space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Login</h1>
        <div>
          <input
            {...register("email")}
            placeholder="Email"
            onBlur={(event) => {
              event.target.value = event.target.value.trim();
            }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2"
          />
          <p className="mt-1 text-xs text-red-400">{errors.email?.message}</p>
        </div>
        <div>
          <input
            {...register("password")}
            type="password"
            placeholder="Password"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2"
          />
          <p className="mt-1 text-xs text-red-400">{errors.password?.message}</p>
        </div>

        <button
          disabled={isSubmitting || googleLoading}
          className="w-full rounded-lg bg-emerald-500 px-3 py-2 font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
        >
          {isSubmitting ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-900/30 border-t-zinc-900" />
              Signing in...
            </span>
          ) : "Login"}
        </button>

        <button
          type="button"
          disabled={isSubmitting || googleLoading}
          onClick={async () => {
            setAuthError("");
            if (!isFirebaseConfigured) {
              setAuthError("Firebase configuration is missing. Please check NEXT_PUBLIC_FIREBASE_* in .env.local.");
              return;
            }
            try {
              setGoogleLoading(true);
              await loginWithGoogle();
              await handlePostLoginRoute();
            } catch (error) {
              if (error instanceof FirebaseError) {
                setAuthError(`Google login failed: ${error.code}`);
                return;
              }
              setAuthError("Google login failed. Please try again.");
            } finally {
              setGoogleLoading(false);
            }
          }}
          className="w-full rounded-lg border border-zinc-700 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {googleLoading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400/40 border-t-zinc-200" />
              Continuing with Google...
            </span>
          ) : "Continue with Google"}
        </button>

        {authError ? <p className="text-sm text-red-400">{authError}</p> : null}

        <p className="text-sm text-zinc-400">
          No account? <Link href="/signup" className="text-emerald-400">Signup</Link>
        </p>
      </form>
    </div>
  );
}
