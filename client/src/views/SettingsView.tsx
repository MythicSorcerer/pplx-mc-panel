import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
interface Prefs { compactSidebar:boolean; autoScroll:boolean; desktopNotifications:boolean; showPing:boolean; timestampsInConsole:boolean; }
const DEFAULT: Prefs = { compactSidebar:false, autoScroll:true, desktopNotifications:true, showPing:true, timestampsInConsole:true };
const PREF_LABELS: {key:keyof Prefs; label:string; desc:string}[] = [
  { key:"compactSidebar",       label:"Compact sidebar",        desc:"Collapse sidebar to icon-only on large screens." },
  { key:"autoScroll",           label:"Auto-scroll console",    desc:"Keep console pinned to latest output." },
  { key:"desktopNotifications", label:"Desktop notifications",  desc:"Browser notification for critical alerts." },
  { key:"showPing",             label:"Show player ping",       desc:"Show latency on the Players page." },
  { key:"timestampsInConsole",  label:"Timestamps in console",  desc:"Prefix each line with HH:MM:SS." },
];
export function SettingsView() {
  const { logout } = useAuth();
  const [prefs,setPrefs] = useState<Prefs>(DEFAULT);
  const [saved,setSaved] = useState(false);
  function toggle(key:keyof Prefs) { setPrefs(p=>({...p,[key]:!p[key]})); setSaved(false); }
  function save() { setSaved(true); setTimeout(()=>setSaved(false),3000); }
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title="Settings">
        {saved && <span className="badge border-mint/30 bg-mint/10 text-mint px-4 py-2 rounded-full text-sm">Saved</span>}
      </PageHeader>
      <div className="flex-1 overflow-auto scrollbar-thin p-4 lg:p-8 space-y-5">
        <div className="grid xl:grid-cols-[1fr_320px] gap-5">
          <section className="panel-line rounded-[28px] p-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-moss">Interface</p>
            <h2 className="text-xl font-bold mt-2 mb-5">Panel preferences</h2>
            <div className="space-y-3">
              {PREF_LABELS.map(({key,label,desc})=>(
                <label key={key} className="flex items-start gap-4 rounded-2xl bg-white/5 border border-white/8 p-4 cursor-pointer hover:bg-white/8 transition-colors">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-white/50 mt-0.5">{desc}</p>
                  </div>
                  <input type="checkbox" className="h-5 w-5 accent-emerald mt-0.5 flex-shrink-0"
                    checked={prefs[key]} onChange={()=>toggle(key)}/>
                </label>
              ))}
            </div>
            <button onClick={save} className="mt-5 rounded-2xl bg-emerald text-coal px-5 py-3 font-bold hover:bg-mint transition-colors">
              Save preferences
            </button>
          </section>
          <aside className="space-y-4">
            <div className="panel-line rounded-[28px] p-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-moss">Account</p>
              <h2 className="text-xl font-bold mt-2 mb-4">Session &amp; security</h2>
              <div className="rounded-3xl bg-white/5 border border-white/8 p-5 space-y-3">
                <p className="font-bold">Admin session</p>
                <p className="text-sm text-white/60">Authenticated via httpOnly cookies from <code className="text-mint">POST /api/auth/login</code>.</p>
                <button
                  onClick={()=>fetch("/api/auth/sessions",{method:"DELETE",credentials:"include"})}
                  className="rounded-full bg-redstone/20 border border-redstone/30 text-redstone px-4 py-2 text-sm font-semibold hover:bg-redstone/30 transition-colors">
                  Revoke other sessions
                </button>
              </div>
              <button onClick={()=>logout()} className="mt-4 w-full rounded-2xl panel-line px-4 py-3 text-sm hover:bg-white/10 transition-colors">
                Log out
              </button>
            </div>
            <div className="panel-line rounded-[28px] p-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-moss mb-3">About</p>
              {[["Frontend","React 18 + Tailwind v4"],["Backend","Express + TypeScript"],["Auth","httpOnly cookies"],["Console","xterm.js + WebSocket"],["Phase","10 — Web UI"]].map(([k,v])=>(
                <div key={k} className="flex justify-between text-sm py-1.5">
                  <span className="text-white/55">{k}</span>
                  <span className="font-mono text-white">{v}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
