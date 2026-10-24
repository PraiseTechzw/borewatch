import { useEffect, useId, useState } from "react";
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export type AuthMode = "login" | "register";

export interface AuthProps {
  initialMode?: AuthMode;
  [key: string]: unknown;
}

export default function Auth({ initialMode }: AuthProps = {}) {
  const [, navigate] = useLocation();
  const auth = useAuth();
  const utils = trpc.useUtils();

  // Determine initial mode from prop, URL pathname or query param
  const getStartingMode = (): AuthMode => {
    if (initialMode) return initialMode;
    if (typeof window !== "undefined") {
      if (window.location.pathname === "/register") return "register";
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "register") return "register";
    }
    return "login";
  };

  const [mode, setMode] = useState<AuthMode>(getStartingMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  const emailId = useId();
  const nameId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  // Redirect if already authenticated
  useEffect(() => {
    if (auth.isAuthenticated) {
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo") || "/";
      navigate(returnTo);
    }
  }, [auth.isAuthenticated, navigate]);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo") || "/";
      navigate(returnTo);
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo") || "/";
      navigate(returnTo);
    },
  });

  const pending = loginMutation.isPending || registerMutation.isPending;

  const isPasswordLongEnough = password.length >= 12;
  const doPasswordsMatch =
    password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please provide a valid email address.");
      return;
    }

    if (password.length < 12) {
      setError("Password must be at least 12 characters long.");
      return;
    }

    if (mode === "register") {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError("Please enter your full name.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please verify your password confirmation.");
        return;
      }

      try {
        await registerMutation.mutateAsync({
          email: trimmedEmail,
          password,
          name: trimmedName,
        });
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Registration failed";
        setError(message);
      }
    } else {
      try {
        await loginMutation.mutateAsync({
          email: trimmedEmail,
          password,
        });
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Authentication failed";
        setError(message);
      }
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-page-container">
        {/* Brand identity header */}
        <header className="auth-brand-header">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <i />
          </div>
          <div className="auth-brand-text">
            <strong>BOREWATCH</strong>
            <small>GROUNDWATER OVERSIGHT</small>
          </div>
          <span className="auth-badge-pill">
            <ShieldCheck size={12} />
            <span>AUTHORITY SYSTEM</span>
          </span>
        </header>

        {/* Main card */}
        <section className="auth-card" aria-labelledby="auth-heading">
          {/* Segmented Mode Switcher */}
          <div className="auth-segmented-tabs" role="tablist" aria-label="Authentication modes">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`auth-tab-btn ${mode === "login" ? "auth-tab-btn-active" : ""}`}
              onClick={() => handleModeSwitch("login")}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={`auth-tab-btn ${mode === "register" ? "auth-tab-btn-active" : ""}`}
              onClick={() => handleModeSwitch("register")}
            >
              <UserCheck size={15} />
              <span>Create Account</span>
            </button>
          </div>

          <div className="auth-heading">
            <h1 id="auth-heading">
              {mode === "login" ? "Sign in to BoreWatch" : "Create authority account"}
            </h1>
            <p>
              {mode === "login"
                ? "Enter your credentials to access protected borehole records, applications and GIS screening."
                : "Register a verified account to access the groundwater compliance and regulatory workspace."}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="auth-error-banner" role="alert" aria-live="assertive">
              <AlertCircle size={18} className="auth-error-icon" />
              <div className="auth-error-content">
                <strong>Authentication notice</strong>
                <span>{error}</span>
              </div>
              <button
                type="button"
                className="auth-error-dismiss"
                onClick={() => setError("")}
                aria-label="Dismiss error notice"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            {mode === "register" && (
              <div className="auth-field-group">
                <label htmlFor={nameId}>Full name</label>
                <input
                  id={nameId}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Eng. T. Moyo"
                  required
                  autoComplete="name"
                  disabled={pending}
                />
                <span className="field-note">
                  Used for inspection signatures and workflow audit history.
                </span>
              </div>
            )}

            <div className="auth-field-group">
              <label htmlFor={emailId}>Email address</label>
              <input
                id={emailId}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@zinwa.co.zw or user@domain.com"
                required
                autoComplete="email"
                disabled={pending}
              />
              <span className="field-note">
                Your primary account email for system authentication.
              </span>
            </div>

            <div className="auth-field-group">
              <div className="field-label-row">
                <label htmlFor={passwordId}>Password</label>
                <span className="field-requirement">Minimum 12 characters</span>
              </div>
              <div className="input-with-action">
                <input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  minLength={12}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  disabled={pending}
                />
                <button
                  type="button"
                  className="input-action-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Real-time length indicator for registration */}
              {mode === "register" && password.length > 0 && (
                <div className="password-feedback">
                  <span
                    className={`validation-chip ${
                      isPasswordLongEnough ? "validation-chip-valid" : "validation-chip-pending"
                    }`}
                  >
                    {isPasswordLongEnough ? <Check size={12} /> : <Lock size={12} />}
                    {isPasswordLongEnough
                      ? "Length requirement satisfied (12+ characters)"
                      : `${password.length}/12 characters minimum`}
                  </span>
                </div>
              )}
            </div>

            {mode === "register" && (
              <div className="auth-field-group">
                <label htmlFor={confirmPasswordId}>Confirm password</label>
                <div className="input-with-action">
                  <input
                    id={confirmPasswordId}
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    disabled={pending}
                  />
                  <button
                    type="button"
                    className="input-action-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
                    title={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Match indicator */}
                {confirmPassword.length > 0 && (
                  <div className="password-feedback">
                    {doPasswordsMatch && (
                      <span className="validation-chip validation-chip-valid">
                        <Check size={12} /> Passwords match
                      </span>
                    )}
                    {passwordMismatch && (
                      <span className="validation-chip validation-chip-invalid">
                        <AlertCircle size={12} /> Passwords do not match
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="button button-primary auth-submit"
              disabled={
                pending ||
                (mode === "register" && (!isPasswordLongEnough || !doPasswordsMatch || !name.trim()))
              }
            >
              {pending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{mode === "login" ? "Signing in…" : "Creating account…"}</span>
                </>
              ) : mode === "login" ? (
                <>
                  <LogIn size={16} />
                  <span>Sign in to workspace</span>
                </>
              ) : (
                <>
                  <UserCheck size={16} />
                  <span>Create account & proceed</span>
                </>
              )}
            </button>
          </form>

          {/* Quick toggle at bottom */}
          <div className="auth-footer-switch">
            <span>
              {mode === "login" ? "Do not have an account yet?" : "Already have an account?"}
            </span>
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => handleModeSwitch(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Register a new account" : "Sign in to existing account"}
            </button>
          </div>
        </section>

        {/* Security & Boundary explanation */}
        <aside className="auth-security-info">
          <div className="auth-security-card">
            <Lock size={15} className="security-icon" />
            <div>
              <b>Server-authenticated session</b>
              <p>
                Sessions use HTTP-only SameSite cookies and bcrypt password hashing. Roles and permissions are validated by the BoreWatch application server.
              </p>
            </div>
          </div>
          <div className="auth-boundary-card">
            <ShieldCheck size={15} className="boundary-icon" />
            <div>
              <b>Hosting boundary</b>
              <p>
                GitHub Pages hosts public documentation and demonstration maps. Authenticated records, screening workflows, and audit history are served securely from the project database.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
