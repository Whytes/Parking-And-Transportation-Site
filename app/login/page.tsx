import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  return (
    <main style={{ display: "grid", minHeight: "100vh", placeItems: "center" }}>
      <section className="panel" style={{ width: "min(420px, 100%)" }}>
        <div className="page-head" style={{ display: "block", marginBottom: "1.5rem" }}>
          <h2>Login</h2>
          <p className="muted">Sign in with your username or email to access parking enforcement data.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
