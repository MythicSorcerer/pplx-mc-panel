import { createContext, useContext, useState, ReactNode } from "react";
interface AuthContextValue { authed: boolean; login: (e: string, p: string) => Promise<{ok:boolean;error?:string}>; logout: () => Promise<void>; }
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  async function login(email: string, password: string) {
    try {
      const res = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include", body:JSON.stringify({email,password}) });
      if (res.ok) { setAuthed(true); return {ok:true}; }
      const data = await res.json().catch(()=>({}));
      return {ok:false, error:data.message??"Invalid credentials"};
    } catch { return {ok:false, error:"Network error — is the backend running?"}; }
  }
  async function logout() { await fetch("/api/auth/logout",{method:"POST",credentials:"include"}); setAuthed(false); }
  return <AuthContext.Provider value={{authed,login,logout}}>{children}</AuthContext.Provider>;
}
export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error("useAuth outside AuthProvider"); return ctx; }
