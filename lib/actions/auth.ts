"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { loginSchema } from "@/lib/validation";

export type LoginFormState = {
  error?: string;
  values?: {
    identifier: string;
  };
};

export async function loginAction(_: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const values = {
    identifier: String(formData.get("identifier") ?? "").trim(),
    password: String(formData.get("password") ?? "")
  };

  const parsed = loginSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message,
      values: {
        identifier: values.identifier
      }
    };
  }

  try {
    await signIn("credentials", {
      identifier: parsed.data.identifier,
      password: parsed.data.password,
      redirect: false
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "Invalid username/email or password.",
        values: {
          identifier: values.identifier
        }
      };
    }

    throw error;
  }

  redirect("/citations");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
