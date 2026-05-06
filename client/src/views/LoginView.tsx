import { useState, FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
export function LoginView() {
  const { login } = useAuth();
  const [email,setEmail]       = useState("admin@voxel.local");
  const [password,setPassword] = useState("");
  const [error,setError]       = useState("");
  const [loading,setLoading]   = useState(false);
  async function handleSubmit(e:FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const result = await login(email,password);
    setLoading(false);
    if(!result.ok) setError(result.error??"Login failed");
  }
  return (
    <div className="min-h-[92vh] flex items-center justify-center p-4">
      <div className="glass rounded-[28px] w-full max-w-5xl overflow-hidden grid lg:grid-cols-[1.1fr_.9fr] shadow-panel">
        <section className="p-8 md:p-12 lg:p-14 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(143,240,181,.18),transparent_35%)]" aria-hidden/>
          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl panel-line flex items-center justify-center text-mint animate-floaty">
                <svg viewBox="0 0 80 80" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="5" aria-label="Logo">
                  <rect x="10" y="10" width="60" height="60" rx="8"/>
                  <rect x="22" y="24" width="10" height="10" fill="currentColor" stroke="none"/>
                  <rect x="48" y="24" width="10" height="10" fill="currentColor" stroke="none"/>
                  <path d="M28 52h8v-8h8v8h8v12H28Z" fill="currentColor" stroke="none"/>
                </svg>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-moss">Voxel control</p>
                <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">Elegant server command.</h1>
              </div>
            </div>
            <p className="max-w-xl text-white/70 text-lg leading-8">Full-stack Minecraft server panel — live console, file manager, plugin installs, and config forms in one surface.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="panel-line rounded-2xl p-5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-moss mb-2">Live signal</p>
                <p className="text-3xl font-bold">20 TPS</p>
                <p className="text-sm text-white/60 mt-2">Console streams over <code className="text-mint">/api/console-ws</code> via xterm.js.</p>
              </div>
              <div className="panel-line rounded-2xl p-5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-moss mb-2">Architecture</p>
                <p className="text-3xl font-bold">Context API</p>
                <p className="text-sm text-white/60 mt-2">No Redux. Minimal state with React hooks and Context providers.</p>
              </div>
            </div>
          </div>
        </section>
        <section className="bg-black/20 p-8 md:p-12 lg:p-14 border-l border-white/5">
          <div className="max-w-md mx-auto">
            <p className="text-[10px] uppercase tracking-[0.32em] text-moss mb-3">Authentication</p>
            <h2 className="text-2xl font-extrabold mb-3">Log in to the panel</h2>
            <p className="text-white/60 mb-8 text-sm">Sessions use httpOnly cookies from the Express backend.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="block text-sm text-white/80 mb-2">Email</span>
                <input className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-4 outline-none focus:border-mint/50 transition-colors"
                  type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
              </label>
              <label className="block">
                <span className="block text-sm text-white/80 mb-2">Password</span>
                <input className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-4 outline-none focus:border-mint/50 transition-colors"
                  type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/>
              </label>
              {error && <p className="text-redstone text-sm rounded-2xl bg-redstone/10 border border-redstone/20 px-4 py-3" role="alert">{error}</p>}
              <button className="w-full rounded-2xl bg-emerald hover:bg-mint text-coal font-extrabold py-4 transition-colors disabled:opacity-60"
                type="submit" disabled={loading}>{loading?"Signing in…":"Enter dashboard"}</button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
