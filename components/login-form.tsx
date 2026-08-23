"use client";

import { useActionState } from "react";

import { loginAction, type LoginFormState } from "@/lib/actions/auth";

const initialState: LoginFormState = {
  values: {
    identifier: ""
  }
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="grid">
      <label className="field">
        <span>Username or Email</span>
        <input type="text" name="identifier" autoComplete="username" required defaultValue={state.values?.identifier ?? ""} />
      </label>
      <label className="field">
        <span>Password</span>
        <input type="password" name="password" autoComplete="current-password" required />
      </label>
      {state.error ? <p className="error">{state.error}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Signing In..." : "Sign In"}
      </button>
    </form>
  );
}
