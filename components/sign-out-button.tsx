import { signOutAction } from "@/lib/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit">Logout</button>
    </form>
  );
}
