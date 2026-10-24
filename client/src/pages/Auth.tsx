import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function Auth() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(""); const [name, setName] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState("");
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); navigate("/"); } });
  const register = trpc.auth.register.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); navigate("/"); } });
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(""); try { if (mode === "login") await login.mutateAsync({ email, password }); else await register.mutateAsync({ email, password, name }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Authentication failed"); } };
  const pending = login.isPending || register.isPending;
  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><div className="brand-mark"><span /><i /></div><div><strong>BOREWATCH</strong><small>GROUNDWATER OVERSIGHT</small></div></div><div className="auth-heading"><ShieldCheck size={22} /><div><h1>{mode === "login" ? "Sign in" : "Create account"}</h1><p>Use your BoreWatch account to access protected records.</p></div></div>{error && <div className="form-error" role="alert">{error}</div>}<form onSubmit={submit}>{mode === "register" && <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" /></label>}<label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} autoComplete={mode === "login" ? "current-password" : "new-password"} /><small className="field-note">Use at least 12 characters.</small></label><button className="button button-primary auth-submit" disabled={pending}>{mode === "login" ? "Sign in" : "Create account"}</button></form><button className="auth-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Need an account? Create one" : "Already have an account? Sign in"}</button><p className="auth-note">Accounts, sessions and permissions are managed by the BoreWatch application server.</p></section></main>;
}
