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
  displayName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const { signup } = useAuth();
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
      await signup(data.email, data.password, data.displayName);
      router.replace("/markets");
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (error.code === "auth/email-already-in-use") {
          setAuthError("This email is already registered. Please login or use another email.");
          return;
        }
        setAuthError(`Signup failed: ${error.code}`);
        return;
      }
      setAuthError("Signup failed. Please try again.");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <form onSubmit={handleSubmit(onSubmit)} className="glass w-full space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Create Account</h1>
        <div>
          <input
            {...register("displayName")}
            placeholder="Name"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2"
          />
          <p className="mt-1 text-xs text-red-400">{errors.displayName?.message}</p>
        </div>
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
          {isSubmitting ? "Creating account..." : "Signup"}
        </button>

        {authError ? <p className="text-sm text-red-400">{authError}</p> : null}

        <p className="text-sm text-zinc-400">
          Already have an account? <Link href="/login" className="text-emerald-400">Login</Link>
        </p>
      </form>
    </div>
  );
}
