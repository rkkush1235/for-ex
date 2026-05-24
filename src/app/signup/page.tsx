"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { FirebaseError } from "firebase/app";
import { db, isFirebaseConfigured } from "@/firebase/firebase";
import { doc, setDoc } from "firebase/firestore";
import { estimateDataUrlBytes, imageFileToCompressedBase64 } from "@/utils/imageBase64";

const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z
    .string()
    .transform((value) => value.replace(/\s+/g, ""))
    .refine((value) => /^\+91[6-9]\d{9}$/.test(value), {
      message: "Phone must be in +91XXXXXXXXXX format",
    }),
  email: z.string().email(),
  password: z.string().min(6),
  aadhaarNumber: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length === 12, {
      message: "Aadhaar must be exactly 12 digits",
    }),
  panNumber: z
    .string()
    .transform((value) => value.toUpperCase().replace(/\s+/g, ""))
    .refine((value) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value), {
      message: "PAN must be like ABCDE1234F",
    }),
  aadhaarFront: z.any(),
  aadhaarBack: z.any(),
  selfie: z.any().optional(),
});

type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [authError, setAuthError] = useState<string>("");
  const [progressMessage, setProgressMessage] = useState<string>("");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      phone: "+91",
    },
  });

  const onSubmit = async (data: FormData) => {
    setAuthError("");
    setProgressMessage("Preparing files...");
    if (!isFirebaseConfigured) {
      setAuthError("Firebase configuration is missing. Please check NEXT_PUBLIC_FIREBASE_* in .env.local.");
      setProgressMessage("");
      return;
    }

    try {
      const frontFile = (data.aadhaarFront?.[0] as File | undefined);
      const backFile = (data.aadhaarBack?.[0] as File | undefined);
      const selfieFile = (data.selfie?.[0] as File | undefined);

      if (!frontFile || !backFile) {
        setAuthError("Aadhaar front and back photos are required.");
        setProgressMessage("");
        return;
      }

      setProgressMessage("Creating account...");
      const uid = await signup({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        password: data.password,
        aadhaarNumber: data.aadhaarNumber,
        panNumber: data.panNumber,
      });

      setProgressMessage("Optimizing Aadhaar front image...");
      const aadhaarFrontBase64 = await imageFileToCompressedBase64(frontFile, {
        maxDimension: 1000,
        targetKB: 260,
      });

      setProgressMessage("Optimizing Aadhaar back image...");
      const aadhaarBackBase64 = await imageFileToCompressedBase64(backFile, {
        maxDimension: 1000,
        targetKB: 260,
      });

      setProgressMessage("Optimizing optional selfie...");
      const selfieBase64 = selfieFile
        ? await imageFileToCompressedBase64(selfieFile, {
            maxDimension: 900,
            targetKB: 180,
          })
        : "";

      const approxTotalImageBytes =
        estimateDataUrlBytes(aadhaarFrontBase64) +
        estimateDataUrlBytes(aadhaarBackBase64) +
        (selfieBase64 ? estimateDataUrlBytes(selfieBase64) : 0);

      if (approxTotalImageBytes > 850 * 1024) {
        throw new Error("Images are too large for Firestore document. Please use lower-size images.");
      }

      setProgressMessage("Saving KYC details...");
      await setDoc(
        doc(db, "users", uid),
        {
          aadhaarFrontUrl: "",
          aadhaarBackUrl: "",
          selfieUrl: "",
          aadhaarFrontBase64,
          aadhaarBackBase64,
          selfieBase64,
          kycSubmittedAt: Date.now(),
          updatedAt: Date.now(),
        },
        { merge: true },
      );

      setProgressMessage("Finalizing...");
      router.replace("/approval-status");
    } catch (error) {
      if (error instanceof FirebaseError) {
        console.error("[Signup] Firebase error", {
          code: error.code,
          message: error.message,
        });

        if (error.code === "auth/email-already-in-use") {
          setAuthError("This email is already registered. Please login or use another email.");
          setProgressMessage("");
          return;
        }
        if (error.code === "auth/operation-not-allowed") {
          setAuthError("Email/Password signup is disabled in Firebase Authentication. Please enable it.");
          setProgressMessage("");
          return;
        }
        if (error.code === "auth/configuration-not-found") {
          setAuthError("Firebase Auth configuration missing for this project. Check Authentication setup.");
          setProgressMessage("");
          return;
        }
        if (error.code === "auth/invalid-api-key") {
          setAuthError("Invalid Firebase API key in .env.local.");
          setProgressMessage("");
          return;
        }
        if (error.code === "auth/too-many-requests") {
          setAuthError("Too many attempts. Please wait and try again.");
          setProgressMessage("");
          return;
        }
        if (error.code === "auth/network-request-failed") {
          setAuthError("Network request failed. Check internet and try again.");
          setProgressMessage("");
          return;
        }

        setAuthError(`Signup failed: ${error.code}`);
        setProgressMessage("");
        return;
      }

      if (error instanceof Error) {
        setAuthError(error.message);
      } else {
        setAuthError("Signup failed. Please try again.");
      }
      setProgressMessage("");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <form onSubmit={handleSubmit(onSubmit)} className="glass w-full space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Create Account</h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <input
              {...register("firstName")}
              placeholder="First Name"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2"
            />
            <p className="mt-1 text-xs text-red-400">{errors.firstName?.message}</p>
          </div>
          <div>
            <input
              {...register("lastName")}
              placeholder="Last Name"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2"
            />
            <p className="mt-1 text-xs text-red-400">{errors.lastName?.message}</p>
          </div>
        </div>
        <div>
          <input
            {...register("phone")}
            placeholder="+91XXXXXXXXXX"
            inputMode="numeric"
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, "");
              const local = digits.startsWith("91") ? digits.slice(2) : digits;
              setValue("phone", `+91${local.slice(0, 10)}`, { shouldValidate: true });
            }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2"
          />
          <p className="mt-1 text-xs text-red-400">{errors.phone?.message}</p>
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
        <div>
          <input
            {...register("aadhaarNumber")}
            placeholder="Aadhaar Number (12 digits)"
            inputMode="numeric"
            maxLength={12}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, "").slice(0, 12);
              setValue("aadhaarNumber", digits, { shouldValidate: true });
            }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2"
          />
          <p className="mt-1 text-xs text-red-400">{errors.aadhaarNumber?.message}</p>
        </div>
        <div>
          <input
            {...register("panNumber")}
            placeholder="PAN Number (ABCDE1234F)"
            maxLength={10}
            onChange={(event) => {
              const normalized = event.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 10);
              setValue("panNumber", normalized, { shouldValidate: true });
            }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 uppercase"
          />
          <p className="mt-1 text-xs text-red-400">{errors.panNumber?.message}</p>
        </div>
        <div className="space-y-2">
          <label className="block text-xs text-zinc-400">Aadhaar Front Photo</label>
          <input
            type="file"
            accept="image/*"
            {...register("aadhaarFront")}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-xs text-zinc-400">Aadhaar Back Photo</label>
          <input
            type="file"
            accept="image/*"
            {...register("aadhaarBack")}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-xs text-zinc-400">Selfie Photo (Optional)</label>
          <input
            type="file"
            accept="image/*"
            {...register("selfie")}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2"
          />
        </div>

        <button
          disabled={isSubmitting}
          className="w-full rounded-lg bg-emerald-500 px-3 py-2 font-medium text-zinc-900"
          type="submit"
        >
          {isSubmitting ? "Creating account..." : "Signup"}
        </button>

        {isSubmitting && progressMessage ? (
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-300">
            {progressMessage}
          </div>
        ) : null}

        {authError ? <p className="text-sm text-red-400">{authError}</p> : null}

        <p className="text-sm text-zinc-400">
          Already have an account? <Link href="/login" className="text-emerald-400">Login</Link>
        </p>
      </form>
    </div>
  );
}
