import { NavLink } from "react-router-dom";
import { useServer } from "../context/ServerContext";
import { useAuth } from "../context/AuthContext";
const NAV = [
  { to:"/",         label:"Overview"      },
  { to:"/console",  label:"Console"       },
  { to:"/files",    label:"Files"         },
  { to:"/software", label:"Software"      },
  { to:"/config",   label:"Configuration" },
  { to:"/players",  label:"Players"       },
  { to:"/settings", label:"Settings"      },
];
export function Sidebar() {
  const { status, togglePower, metrics, software } = useServer();
  const { logout } = useAuth();
  return (
    <aside className="glass rounded-[28px] p-4 lg:p-5 flex flex-col gap-4">
      <div className="flex items-center gap-4 px-3 py-3">
        <div className="h-11 w-11 rounded-2xl panel-line flex items-center justify-center text-mint">
          <svg viewBox="0 0 80 80" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="5" aria-label="Voxel Control logo">
            <rect x="10" y="10" width="60" height="60" rx="8"/>
            <path d="M24 22h12v12H24zM44 22h12v12H44zM30 46h20v12H30z" fill="currentColor" stroke="none"/>
          </svg>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-moss">Voxel control</p>
          <p className="font-bold leading-tight">Server panel</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1.5" aria-label="Primary navigation">
        {NAV.map(({to,label})=>(
          <NavLink key={to} to={to} end={to==="/"}
            className={({isActive})=>`sidebar-item rounded-2xl px-4 py-3 panel-line text-sm transition-colors ${isActive?"active":"text-white/70 hover:text-white hover:bg-white/5"}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto panel-line rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.25em] text-moss">Node health</p>
          <span className={`h-2 w-2 rounded-full ${status==="online"?"bg-mint":"bg-redstone"}`}/>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/70">{software ? `${software.type} ${software.version}` : "No server"}</span>
          <button onClick={togglePower}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${status==="online"?"bg-emerald text-coal":"bg-redstone text-white"}`}>
            {status==="online"?"Online":"Offline"}
          </button>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald to-mint" style={{width: metrics ? `${metrics.ram}%` : "0%"}}/>
        </div>
        <p className="text-xs text-white/40">{metrics ? metrics.ram+"% RAM" : "--% RAM"}</p>
        <button onClick={()=>logout()} className="text-xs text-white/40 hover:text-white transition-colors">Logout →</button>
      </div>
    </aside>
  );
}
