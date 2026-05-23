"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { FirebaseError } from "firebase/app";
import { isFirebaseConfigured } from "@/firebase/firebase";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [authError, setAuthError] = useState<string>("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setAuthError("");
    if (!isFirebaseConfigured) {
      setAuthError("Firebase configuration is missing. Please check NEXT_PUBLIC_FIREBASE_* in .env.local.");
      return;
    }

    try {
      await login(data.email, data.password);
      router.replace("/dashboard");
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
          disabled={isSubmitting}
          className="w-full rounded-lg bg-emerald-500 px-3 py-2 font-medium text-zinc-900"
          type="submit"
        >
          {isSubmitting ? "Signing in..." : "Login"}
        </button>

        <button
          type="button"
          onClick={async () => {
            setAuthError("");
            if (!isFirebaseConfigured) {
              setAuthError("Firebase configuration is missing. Please check NEXT_PUBLIC_FIREBASE_* in .env.local.");
              return;
            }
            try {
              await loginWithGoogle();
              router.replace("/dashboard");
            } catch (error) {
              if (error instanceof FirebaseError) {
                setAuthError(`Google login failed: ${error.code}`);
                return;
              }
              setAuthError("Google login failed. Please try again.");
            }
          }}
          className="w-full rounded-lg border border-zinc-700 px-3 py-2"
        >
          Continue with Google
        </button>

        {authError ? <p className="text-sm text-red-400">{authError}</p> : null}

        <p className="text-sm text-zinc-400">
          No account? <Link href="/signup" className="text-emerald-400">Signup</Link>
        </p>
      </form>
    </div>
  );
}
