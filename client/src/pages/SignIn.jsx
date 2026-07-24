import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { useAuth } from "../AuthContext";

function friendlyAuthError(err) {
  const code = err?.code || "";
  if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential")) {
    return "Incorrect email or password.";
  }
  if (code.includes("too-many-requests")) return "Too many attempts. Try again in a bit.";
  if (code.includes("popup-closed-by-user")) return "Sign-in was cancelled.";
  return err?.message || "Something went wrong. Please try again.";
}

export default function SignIn() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setBusy(true);
    try {
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-low px-4 py-10">
      <main className="w-full max-w-[448px]">
        <div className="bg-white border border-outline-variant rounded-xl p-8 md:p-10 shadow-[0px_4px_20px_rgba(26,43,60,0.05)]">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-primary-container text-on-primary rounded-lg p-3 flex items-center justify-center">
                <Icon name="psychology" className="text-[32px]" />
              </div>
            </div>
            <h1 className="text-2xl font-semibold text-primary mb-2">Sign in to Principle Pitch</h1>
            <p className="text-sm text-on-surface-variant">
              Enter your details to access your second brain.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg bg-error-container text-on-error-container text-sm px-4 py-3">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-4 py-3 bg-white border border-outline-variant rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/10 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-on-surface" htmlFor="password">
                  Password
                </label>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white border border-outline-variant rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/10 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 px-4 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-xs uppercase tracking-wide text-outline">
                or continue with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-outline-variant rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors active:scale-[0.98] disabled:opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.28c-.25-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.63H1.29A11.96 11.96 0 000 12c0 1.94.46 3.77 1.29 5.37l3.98-3.09z"
              />
              <path
                fill="#EA4335"
                d="M12 4.77c1.76 0 3.35.61 4.6 1.79l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.63l3.98 3.09C6.22 6.88 8.87 4.77 12 4.77z"
              />
            </svg>
            <span>Google</span>
          </button>

          <div className="mt-8 text-center">
            <p className="text-sm text-on-surface-variant">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="text-sm font-semibold text-secondary hover:underline underline-offset-4">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <footer className="mt-8 text-center">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 text-outline text-xs">
            <span>© 2026 Principle Pitch. All rights reserved.</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
