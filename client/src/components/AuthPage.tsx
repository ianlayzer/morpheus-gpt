import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";

export function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-full bg-[var(--bg)]">
      <div className="w-full max-w-sm px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[var(--green)] glow text-2xl tracking-[0.3em] uppercase mb-2">
            MORPHEUS
          </h1>
          <div className="text-[var(--green-dark)] text-xs tracking-[0.2em]">
            {mode === "login" ? "SYSTEM LOGIN" : "NEW USER REGISTRATION"}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[var(--green-dark)] text-xs tracking-wider mb-1 uppercase">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              className="w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--green)] text-base md:text-sm px-3 py-2 outline-none focus:border-[var(--green-dark)] font-[inherit] tracking-wider"
              placeholder="neo"
            />
          </div>

          <div>
            <label className="block text-[var(--green-dark)] text-xs tracking-wider mb-1 uppercase">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--green)] text-base md:text-sm px-3 py-2 outline-none focus:border-[var(--green-dark)] font-[inherit] tracking-wider"
              placeholder="******"
            />
          </div>

          {error && (
            <div className="text-[var(--red)] text-xs tracking-wider border border-[var(--red)] px-3 py-2 opacity-90">
              ERROR: {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            className="w-full px-3 py-2 text-sm border border-[var(--green-dark)] text-[var(--green)] bg-transparent hover:bg-[var(--green-glow)] hover:border-[var(--green)] transition-colors cursor-pointer tracking-[0.2em] uppercase disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting
              ? "CONNECTING..."
              : mode === "login"
                ? "[ LOGIN ]"
                : "[ REGISTER ]"}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="text-center mt-6">
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            className="text-[var(--green-dark)] text-xs tracking-wider hover:text-[var(--green)] transition-colors cursor-pointer bg-transparent border-none font-[inherit]"
          >
            {mode === "login"
              ? "No account? Register here."
              : "Already registered? Login here."}
          </button>
        </div>
      </div>
    </div>
  );
}
